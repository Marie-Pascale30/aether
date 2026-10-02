import { Injectable, NotFoundException } from "@nestjs/common";
import { isOrdered, MAX_STARS_PER_LEVEL, type LevelDesignStats } from "@aether/shared";
import { PrismaService } from "../prisma/prisma.service";

const FALSE_LEADS_SHOWN = 8;

interface Totals {
    since: Date | null;
    players: number;
    sessions: number;
    completions: number;
    median_duration: number | null;
    avg_mistakes: number | null;
    avg_hints: number | null;
}

/**
 * Agrégats calculés en base. Les parties des administrateurs (tests depuis l'éditeur)
 * sont exclues : elles fausseraient la difficulté perçue.
 */
@Injectable()
export class AdminLevelStatsService {
    constructor(private readonly prisma: PrismaService) {}

    async forLevel(levelId: string): Promise<LevelDesignStats> {
        const level = await this.prisma.level.findUnique({ where: { id: levelId } });
        if (!level) throw new NotFoundException("Niveau introuvable.");
        const ordered = isOrdered(level.kind);

        const [[totals], stars, hintRows, [attempts], falseLeads] = await Promise.all([
            this.prisma.$queryRaw<Totals[]>`
                SELECT
                    (SELECT min(a."createdAt") FROM "Attempt" a WHERE a."levelId" = ${levelId}) AS since,
                    count(DISTINCT s."userId")::int AS players,
                    count(*)::int AS sessions,
                    count(s."completedAt")::int AS completions,
                    percentile_cont(0.5) WITHIN GROUP (ORDER BY s."durationMs") AS median_duration,
                    avg(s.mistakes) FILTER (WHERE s."completedAt" IS NOT NULL)::float AS avg_mistakes,
                    avg(s."hintsUsed") FILTER (WHERE s."completedAt" IS NOT NULL)::float AS avg_hints
                FROM "PlaySession" s
                JOIN "User" u ON u.id = s."userId"
                WHERE s."levelId" = ${levelId} AND u.role <> 'ADMIN'`,
            this.prisma.$queryRaw<{ stars: number; count: number }[]>`
                SELECT s.stars, count(*)::int AS count
                FROM "PlaySession" s
                JOIN "User" u ON u.id = s."userId"
                WHERE s."levelId" = ${levelId} AND s."completedAt" IS NOT NULL AND u.role <> 'ADMIN'
                GROUP BY s.stars`,
            this.prisma.$queryRaw<{ hint: number; sessions: number }[]>`
                SELECT n AS hint, count(s.id)::int AS sessions
                FROM generate_series(1, ${level.hints.length}::int) AS n
                LEFT JOIN "PlaySession" s ON s."levelId" = ${levelId} AND s."hintsUsed" >= n
                    AND s."userId" IN (SELECT id FROM "User" WHERE role <> 'ADMIN')
                GROUP BY n
                ORDER BY n`,
            this.prisma.$queryRaw<{ count: number }[]>`
                SELECT count(*)::int AS count
                FROM "Attempt" a
                JOIN "PlaySession" s ON s.id = a."sessionId"
                JOIN "User" u ON u.id = s."userId"
                WHERE a."levelId" = ${levelId} AND u.role <> 'ADMIN'`,
            // Combinaisons fausses regroupées : triées, sauf pour une suite (où l'ordre fait la différence).
            this.prisma.$queryRaw<{ cells: number[]; count: number; sessions: number }[]>`
                SELECT combo AS cells, count(*)::int AS count, count(DISTINCT session_id)::int AS sessions
                FROM (
                    SELECT CASE WHEN ${ordered} THEN a.cells
                                ELSE (SELECT array_agg(c ORDER BY c) FROM unnest(a.cells) AS c) END AS combo,
                           a."sessionId" AS session_id
                    FROM "Attempt" a
                    JOIN "PlaySession" s ON s.id = a."sessionId"
                    JOIN "User" u ON u.id = s."userId"
                    WHERE a."levelId" = ${levelId} AND a.correct = false AND u.role <> 'ADMIN'
                ) wrong
                GROUP BY combo
                ORDER BY count DESC, sessions DESC
                LIMIT ${FALSE_LEADS_SHOWN}`,
        ]);

        const t = totals!;
        const starCount = (n: number) => stars.find((row) => row.stars === n)?.count ?? 0;

        return {
            since: t.since?.toISOString() ?? null,
            players: t.players,
            sessions: t.sessions,
            completions: t.completions,
            completionRate: t.sessions > 0 ? t.completions / t.sessions : null,
            medianDurationMs: t.median_duration === null ? null : Math.round(t.median_duration),
            averageMistakes: t.avg_mistakes,
            averageHints: t.avg_hints,
            stars: Array.from({ length: MAX_STARS_PER_LEVEL }, (_, i) => ({ stars: MAX_STARS_PER_LEVEL - i, count: starCount(MAX_STARS_PER_LEVEL - i) })),
            hints: hintRows,
            attempts: attempts?.count ?? 0,
            falseLeads: falseLeads.map((row) => ({
                cells: row.cells,
                symbols: row.cells.map((cell) => level.symbols[cell] ?? "?"),
                count: row.count,
                sessions: row.sessions,
            })),
        };
    }
}
