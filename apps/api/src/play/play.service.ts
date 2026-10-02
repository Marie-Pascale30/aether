import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Level, PlaySession } from "@prisma/client";
import {
    computeStars,
    findPairIndex,
    isBetterResult,
    pairsAt,
    type AttemptInput,
    type AttemptResult,
    type CompletionResult,
    type HintResult,
    type Pair,
    type SessionState,
} from "@aether/shared";
import type { AuthUser } from "../common/auth.decorators";
import { parsePairs } from "../levels/level.mapper";
import { LevelsService } from "../levels/levels.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProgressService } from "../progress/progress.service";

type SessionWithLevel = PlaySession & { level: Level };

const CONCURRENT_UPDATE = "La partie a changé entre-temps : recharge l'énigme.";

/**
 * Boucle de jeu autoritaire : le client ne connaît jamais les réponses, il soumet des paires
 * et le serveur tient le compte des liens trouvés, des erreurs, des indices et du temps.
 */
@Injectable()
export class PlayService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly levels: LevelsService,
        private readonly progress: ProgressService,
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

        const session = await this.prisma.playSession.create({ data: { userId: user.id, levelId, foundPairs: [] } });
        return toSessionState(session, level);
    }

    async attempt(user: AuthUser, sessionId: string, { a, b }: AttemptInput): Promise<AttemptResult> {
        const session = await this.openSession(user, sessionId);
        const pairs = parsePairs(session.level.pairs);
        const cellCount = session.level.symbols.length;

        if (a >= cellCount || b >= cellCount) throw new BadRequestException("Cette case n'existe pas.");
        const linked = pairsAt(pairs, session.foundPairs).flat();
        if (linked.includes(a) || linked.includes(b)) throw new BadRequestException("Cette case est déjà reliée.");

        const pairIndex = findPairIndex(pairs, session.foundPairs, a, b);

        if (pairIndex === -1) {
            const updated = await this.prisma.playSession.update({
                where: { id: session.id },
                data: { mistakes: { increment: 1 } },
            });
            return {
                result: "mismatch",
                pair: [a, b],
                foundPairs: pairsAt(pairs, session.foundPairs),
                remaining: pairs.length - session.foundPairs.length,
                mistakes: updated.mistakes,
                completion: null,
            };
        }

        const found = [...session.foundPairs, pairIndex];
        const completion = found.length === pairs.length ? await this.complete(user, session, found) : null;

        if (!completion) {
            // Condition sur l'état lu : deux requêtes simultanées ne peuvent pas valider la même paire.
            const { count } = await this.prisma.playSession.updateMany({
                where: { id: session.id, completedAt: null, NOT: { foundPairs: { has: pairIndex } } },
                data: { foundPairs: { push: pairIndex } },
            });
            if (count === 0) throw new ConflictException(CONCURRENT_UPDATE);
        }

        return {
            result: "match",
            pair: [a, b],
            foundPairs: pairsAt(pairs, found),
            remaining: pairs.length - found.length,
            mistakes: session.mistakes,
            completion,
        };
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
                data: { foundPairs: found, completedAt: new Date(), stars, durationMs },
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

        const [summary, { journey, index }] = await Promise.all([
            this.progress.summary(user.id),
            this.levels.playable(user, session.levelId),
        ]);

        return {
            stars,
            durationMs,
            mistakes: session.mistakes,
            hintsUsed: session.hintsUsed,
            ...best,
            nextLevelId: index === -1 ? null : (journey.levels[index + 1]?.id ?? null),
            gameCompleted: summary.garden.totalLevels > 0 && summary.garden.completedLevels === summary.garden.totalLevels,
            garden: summary.garden,
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
    const pairs: Pair[] = parsePairs(level.pairs);
    return {
        sessionId: session.id,
        levelId: level.id,
        startedAt: session.startedAt.toISOString(),
        foundPairs: pairsAt(pairs, session.foundPairs),
        mistakes: session.mistakes,
        hints: level.hints.slice(0, session.hintsUsed),
        hintCount: level.hints.length,
        completed: session.completedAt !== null,
    };
}
