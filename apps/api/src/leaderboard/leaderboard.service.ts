import { Injectable } from "@nestjs/common";
import type { Leaderboard, LeaderboardEntry } from "@aether/shared";
import { PrismaService } from "../prisma/prisma.service";

interface Row {
    userId: string;
    displayName: string;
    totalStars: number;
    completedLevels: number;
    totalTimeMs: bigint;
    rank: number;
}

@Injectable()
export class LeaderboardService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Classement des comptes (les invités n'y figurent pas), calculé en base :
     * étoiles ↓, énigmes résolues ↓, somme des meilleurs temps ↑. Les ex æquo partagent un rang.
     */
    async get(limit: number, userId?: string): Promise<Leaderboard> {
        const rows = await this.prisma.$queryRaw<Row[]>`
            WITH scores AS (
                SELECT u.id AS "userId",
                       u."displayName" AS "displayName",
                       SUM(p."bestStars")::int AS "totalStars",
                       COUNT(*)::int AS "completedLevels",
                       SUM(p."bestTimeMs")::bigint AS "totalTimeMs"
                FROM "LevelProgress" p
                JOIN "User" u ON u.id = p."userId"
                JOIN "Level" l ON l.id = p."levelId"
                WHERE u."isGuest" = false AND l.published = true
                GROUP BY u.id, u."displayName"
            ),
            ranked AS (
                SELECT *,
                       RANK() OVER (ORDER BY "totalStars" DESC, "completedLevels" DESC, "totalTimeMs" ASC)::int AS rank,
                       ROW_NUMBER() OVER (ORDER BY "totalStars" DESC, "completedLevels" DESC, "totalTimeMs" ASC, "displayName" ASC) AS position
                FROM scores
            )
            SELECT "userId", "displayName", "totalStars", "completedLevels", "totalTimeMs", rank
            FROM ranked
            WHERE position <= ${limit} OR "userId" = ${userId ?? ""}
            ORDER BY position`;

        const entries = rows.map(toEntry);
        const me = entries.find((entry) => entry.userId === userId) ?? null;

        // Hors du top, le joueur arrive en dernière ligne : il n'apparaît que dans `me`.
        return { entries: entries.slice(0, limit), me };
    }
}

function toEntry(row: Row): LeaderboardEntry {
    return {
        rank: row.rank,
        userId: row.userId,
        displayName: row.displayName,
        totalStars: row.totalStars,
        completedLevels: row.completedLevels,
        totalTimeMs: Number(row.totalTimeMs),
    };
}
