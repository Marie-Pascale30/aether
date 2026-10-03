import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma, type PlaySession } from "@prisma/client";
import { petalsFor, type CompletionResult, type LevelResultInput } from "@aether/shared";
import type { AuthUser } from "../common/auth.decorators";
import { DailyService } from "../levels/daily.service";
import { JourneyService } from "../levels/journey.service";
import { toWorldRef } from "../levels/level.mapper";
import { LevelsService, type Playable } from "../levels/levels.service";
import { PrismaService } from "../prisma/prisma.service";
import { MilestonesService } from "../progress/milestones.service";

/** Une victoire datée de plus de 5 min dans le futur vient d'une horloge déréglée : on la ramène à maintenant. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

interface Recorded {
    session: PlaySession;
    levelPetals: number;
    newPetals: number;
    bestTimeMs: number;
}

/**
 * Toutes les énigmes se jouent sur l'appareil, éventuellement hors ligne ; l'appareil envoie
 * ensuite le résultat, que le serveur enregistre (progression, série du jour, repères,
 * statistiques de conception). Sans classement, il n'y a rien à arbitrer coup par coup.
 */
@Injectable()
export class PlayService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly levels: LevelsService,
        private readonly journeys: JourneyService,
        private readonly daily: DailyService,
        private readonly milestones: MilestonesService,
    ) {}

    async submitResult(user: AuthUser, levelId: string, input: LevelResultInput): Promise<CompletionResult> {
        const playedAt = new Date(Math.min(Date.parse(input.playedAt), Date.now() + CLOCK_SKEW_MS));
        const playable = await this.levels.playable(user, levelId, playedAt);
        const recorded = (await this.findDuplicate(user, levelId, input.resultId)) ?? (await this.record(user, playable, input, playedAt));
        return this.describe(user, playable, recorded);
    }

    /** Résultat déjà reçu (renvoi après une coupure réseau) : décrit à nouveau, sans rien compter. */
    private async findDuplicate(user: AuthUser, levelId: string, resultId: string): Promise<Recorded | null> {
        const session = await this.prisma.playSession.findUnique({ where: { clientResultId: resultId } });
        if (!session) return null;
        if (session.userId !== user.id || session.levelId !== levelId) throw new ConflictException("Ce résultat a déjà été envoyé pour une autre partie.");
        const progress = await this.prisma.levelProgress.findUnique({ where: { userId_levelId: { userId: user.id, levelId } } });
        return { session, levelPetals: progress?.petals ?? session.petals ?? 0, newPetals: 0, bestTimeMs: progress?.bestTimeMs ?? session.durationMs ?? 0 };
    }

    private async record(user: AuthUser, { level }: Playable, input: LevelResultInput, playedAt: Date): Promise<Recorded> {
        const hintsUsed = Math.min(input.hintsUsed, level.hints.length);
        const petals = petalsFor({ mistakes: input.mistakes, hintsUsed });
        const durationMs = input.durationMs;

        try {
            return await this.prisma.$transaction(async (tx) => {
                const session = await tx.playSession.create({
                    data: {
                        userId: user.id,
                        levelId: level.id,
                        clientResultId: input.resultId,
                        startedAt: new Date(playedAt.getTime() - durationMs),
                        completedAt: playedAt,
                        mistakes: input.mistakes,
                        hintsUsed,
                        petals,
                        durationMs,
                    },
                });
                // Coups des Liens : alimentent les fausses pistes des statistiques de conception.
                if (level.mechanic === "LINKS" && input.attempts.length > 0) {
                    await tx.attempt.createMany({
                        data: input.attempts.map((attempt) => ({ sessionId: session.id, levelId: level.id, cells: attempt.cells, correct: attempt.correct })),
                    });
                }

                const key = { userId_levelId: { userId: user.id, levelId: level.id } };
                const previous = await tx.levelProgress.findUnique({ where: key });
                // Les pétales s'additionnent : une partie moins harmonieuse ne retire jamais rien.
                const levelPetals = (previous?.petals ?? 0) | petals;
                const progress = await tx.levelProgress.upsert({
                    where: key,
                    create: { userId: user.id, levelId: level.id, petals, bestTimeMs: durationMs, firstCompletedAt: playedAt },
                    update: {
                        completions: { increment: 1 },
                        petals: levelPetals,
                        bestTimeMs: Math.min(previous?.bestTimeMs ?? durationMs, durationMs),
                    },
                });
                return { session, levelPetals, newPetals: levelPetals & ~(previous?.petals ?? 0), bestTimeMs: progress.bestTimeMs };
            });
        } catch (error) {
            // Deux envois simultanés du même résultat : le second décrit celui du premier.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                const duplicate = await this.findDuplicate(user, level.id, input.resultId);
                if (duplicate) return duplicate;
            }
            throw error;
        }
    }

    private async describe(user: AuthUser, { level, dailyDate }: Playable, recorded: Recorded): Promise<CompletionResult> {
        const { session, levelPetals, newPetals, bestTimeMs } = recorded;
        const performance = { petals: session.petals ?? 0, levelPetals, newPetals, durationMs: session.durationMs ?? 0, hintsUsed: session.hintsUsed, bestTimeMs };

        // Parcours relu après la sauvegarde : déblocages et jardin tiennent compte de cette victoire.
        const journey = await this.journeys.load(user.id);
        const location = this.journeys.locate(journey, level.id);
        const daily = dailyDate
            ? await this.daily.recordWin(user, dailyDate, {
                  id: session.id,
                  petals: performance.petals,
                  durationMs: performance.durationMs,
                  mistakes: session.mistakes,
                  hintsUsed: session.hintsUsed,
              })
            : null;
        const milestones = await this.milestones.reachNew(user.id);

        if (!location) {
            // Hors parcours : énigme du jour, ou brouillon joué par un administrateur.
            return {
                ...performance,
                nextLevelId: null,
                worldCompleted: false,
                nextWorld: null,
                gameCompleted: false,
                garden: { stage: 0, completedLevels: 0, totalLevels: 0 },
                daily,
                milestones,
            };
        }

        const { world, levels } = journey.worlds[location.worldIndex]!;
        const nextWorld = journey.worlds[location.worldIndex + 1];
        const worldCompleted = journey.worldStatuses.get(world.id) === "completed";

        return {
            ...performance,
            nextLevelId: levels[location.levelIndex + 1]?.id ?? null,
            worldCompleted,
            nextWorld: worldCompleted && nextWorld && journey.worldStatuses.get(nextWorld.world.id) !== "locked" ? toWorldRef(nextWorld.world) : null,
            gameCompleted: journey.worlds.every((w) => journey.worldStatuses.get(w.world.id) === "completed"),
            garden: this.journeys.worldSummary(journey, location.worldIndex).garden,
            daily,
            milestones,
        };
    }
}
