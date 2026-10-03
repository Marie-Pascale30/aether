import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Level, PlaySession } from "@prisma/client";
import {
    computeStars,
    findGroupIndex,
    groupsAt,
    groupSizeOf,
    isBetterResult,
    isOrdered,
    type AttemptInput,
    type AttemptResult,
    type CompletionResult,
    type HintResult,
    type LevelResultInput,
    type SessionState,
} from "@aether/shared";
import type { AuthUser } from "../common/auth.decorators";
import { DailyService } from "../levels/daily.service";
import { JourneyService } from "../levels/journey.service";
import { parseGroups, toWorldRef } from "../levels/level.mapper";
import { LevelsService } from "../levels/levels.service";
import { PrismaService } from "../prisma/prisma.service";

type SessionWithLevel = PlaySession & { level: Level };

const CONCURRENT_UPDATE = "La partie a changé entre-temps : recharge l'énigme.";

/**
 * Boucle de jeu autoritaire : le client ne connaît jamais les réponses, il soumet des groupes
 * de cases et le serveur tient le compte des liens trouvés, des erreurs, des indices et du temps.
 */
@Injectable()
export class PlayService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly levels: LevelsService,
        private readonly journeys: JourneyService,
        private readonly daily: DailyService,
    ) {}

    /** Reprend la partie en cours sur ce niveau, ou en ouvre une (toujours une neuve si `restart`). */
    async start(user: AuthUser, levelId: string, restart = false): Promise<SessionState> {
        const { level } = await this.levels.playable(user, levelId);

        if (restart) {
            await this.prisma.playSession.deleteMany({ where: { userId: user.id, levelId, completedAt: null } });
        } else {
            const open = await this.prisma.playSession.findFirst({
                where: { userId: user.id, levelId, completedAt: null },
                orderBy: { startedAt: "desc" },
            });
            if (open) return toSessionState(open, level);
        }

        const session = await this.prisma.playSession.create({ data: { userId: user.id, levelId, foundGroups: [] } });
        return toSessionState(session, level);
    }

    async attempt(user: AuthUser, sessionId: string, { cells }: AttemptInput): Promise<AttemptResult> {
        const session = await this.openSession(user, sessionId);
        const groups = parseGroups(session.level.groups);
        const size = groupSizeOf({ groups });

        if (cells.length !== size) throw new BadRequestException(`Choisis exactement ${size} éléments.`);
        if (cells.some((cell) => cell >= session.level.symbols.length)) throw new BadRequestException("Cette case n'existe pas.");
        const linked = groupsAt(groups, session.foundGroups).flat();
        if (cells.some((cell) => linked.includes(cell))) throw new BadRequestException("Cette case est déjà reliée.");

        const groupIndex = findGroupIndex(groups, session.foundGroups, cells, isOrdered(session.level.kind));
        await this.prisma.attempt.create({
            data: { sessionId: session.id, levelId: session.levelId, cells, correct: groupIndex !== -1 },
        });

        if (groupIndex === -1) {
            const updated = await this.prisma.playSession.update({
                where: { id: session.id },
                data: { mistakes: { increment: 1 } },
            });
            return {
                result: "mismatch",
                cells,
                foundGroups: groupsAt(groups, session.foundGroups),
                remaining: groups.length - session.foundGroups.length,
                mistakes: updated.mistakes,
                completion: null,
            };
        }

        const found = [...session.foundGroups, groupIndex];
        const completion = found.length === groups.length ? await this.complete(user, session, found) : null;

        if (!completion) {
            // Condition sur l'état lu : deux requêtes simultanées ne peuvent pas valider le même groupe.
            const { count } = await this.prisma.playSession.updateMany({
                where: { id: session.id, completedAt: null, NOT: { foundGroups: { has: groupIndex } } },
                data: { foundGroups: { push: groupIndex } },
            });
            if (count === 0) throw new ConflictException(CONCURRENT_UPDATE);
        }

        return {
            result: "match",
            cells,
            foundGroups: groupsAt(groups, found),
            remaining: groups.length - found.length,
            mistakes: session.mistakes,
            completion,
        };
    }

    /**
     * Résultat d'une énigme jouée sur l'appareil (Mémoires, Rouages, Flux, Échos). Le serveur ne
     * rejoue pas la partie (c'est le prix du hors ligne) : il l'enregistre comme une partie terminée,
     * ce qui alimente progression, records, série du jour et statistiques par le même chemin.
     */
    async submitResult(user: AuthUser, levelId: string, input: LevelResultInput): Promise<CompletionResult> {
        const { level } = await this.levels.playable(user, levelId);
        if (level.mechanic === "LINKS") {
            throw new BadRequestException("Les Liens se jouent coup par coup : ouvre une partie sur cette énigme.");
        }
        const session = await this.prisma.playSession.create({
            data: {
                userId: user.id,
                levelId,
                foundGroups: [],
                mistakes: input.mistakes,
                hintsUsed: Math.min(input.hintsUsed, level.hints.length),
                startedAt: new Date(Date.now() - input.durationMs),
            },
        });
        return this.complete(user, { ...session, level }, []);
    }

    async hint(user: AuthUser, sessionId: string): Promise<HintResult> {
        const session = await this.openSession(user, sessionId);
        const { hints } = session.level;
        const used = session.hintsUsed;

        if (used >= hints.length) throw new BadRequestException("Il n'y a plus d'indice pour cette énigme.");

        const { count } = await this.prisma.playSession.updateMany({
            where: { id: session.id, completedAt: null, hintsUsed: used },
            data: { hintsUsed: { increment: 1 } },
        });
        if (count === 0) throw new ConflictException(CONCURRENT_UPDATE);

        return { hint: hints[used]!, hints: hints.slice(0, used + 1), hintsRemaining: hints.length - used - 1 };
    }

    private async complete(user: AuthUser, session: SessionWithLevel, found: number[]): Promise<CompletionResult> {
        const durationMs = Math.max(0, Date.now() - session.startedAt.getTime());
        const stars = computeStars({ mistakes: session.mistakes, hintsUsed: session.hintsUsed });

        const best = await this.prisma.$transaction(async (tx) => {
            const { count } = await tx.playSession.updateMany({
                where: { id: session.id, completedAt: null },
                data: { foundGroups: found, completedAt: new Date(), stars, durationMs },
            });
            if (count === 0) throw new ConflictException(CONCURRENT_UPDATE);

            const key = { userId_levelId: { userId: user.id, levelId: session.levelId } };
            const previous = await tx.levelProgress.findUnique({ where: key });
            const isNewBest = isBetterResult(
                { stars, durationMs },
                previous && { stars: previous.bestStars, durationMs: previous.bestTimeMs },
            );

            const saved = await tx.levelProgress.upsert({
                where: key,
                create: { userId: user.id, levelId: session.levelId, bestStars: stars, bestTimeMs: durationMs },
                update: {
                    completions: { increment: 1 },
                    ...(isNewBest && { bestStars: stars, bestTimeMs: durationMs }),
                },
            });
            return { isNewBest, bestStars: saved.bestStars, bestTimeMs: saved.bestTimeMs };
        });

        // Parcours relu après la sauvegarde : déblocages et jardin tiennent compte de cette victoire.
        const journey = await this.journeys.load(user.id);
        const location = this.journeys.locate(journey, session.levelId);
        const performance = { stars, durationMs, mistakes: session.mistakes, hintsUsed: session.hintsUsed, ...best };

        if (!location) {
            // Hors parcours : énigme du jour, ou brouillon joué par un administrateur.
            const daily = (await this.daily.isTodayLevel(session.levelId))
                ? await this.daily.recordWin(user, { id: session.id, stars, durationMs, mistakes: session.mistakes, hintsUsed: session.hintsUsed })
                : null;
            return {
                ...performance,
                nextLevelId: null,
                worldCompleted: false,
                nextWorld: null,
                gameCompleted: false,
                garden: { stage: 0, completedLevels: 0, totalLevels: 0 },
                daily,
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
            daily: null,
        };
    }

    private async openSession(user: AuthUser, sessionId: string): Promise<SessionWithLevel> {
        const session = await this.prisma.playSession.findUnique({ where: { id: sessionId }, include: { level: true } });
        if (!session || session.userId !== user.id) throw new NotFoundException("Partie introuvable.");
        if (session.completedAt) throw new ConflictException("Cette partie est déjà terminée.");
        return session;
    }
}

function toSessionState(session: PlaySession, level: Level): SessionState {
    return {
        sessionId: session.id,
        levelId: level.id,
        startedAt: session.startedAt.toISOString(),
        foundGroups: groupsAt(parseGroups(level.groups), session.foundGroups),
        mistakes: session.mistakes,
        hints: level.hints.slice(0, session.hintsUsed),
        hintCount: level.hints.length,
        completed: session.completedAt !== null,
    };
}
