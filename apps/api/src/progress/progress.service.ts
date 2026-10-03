import { Injectable } from "@nestjs/common";
import { MAX_HARMONY_PER_LEVEL, petalCount, type LevelStats, type PlayerStats, type ProgressSummary } from "@aether/shared";
import { JourneyService, type Journey } from "../levels/journey.service";
import { toWorldRef } from "../levels/level.mapper";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProgressService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly journeys: JourneyService,
    ) {}

    async summary(userId: string, journey?: Journey): Promise<ProgressSummary> {
        const j = journey ?? (await this.journeys.load(userId));
        const worlds = j.worlds.map((_, i) => this.journeys.worldSummary(j, i));
        const totalLevels = j.worlds.reduce((sum, w) => sum + w.levels.length, 0);

        const resumeIndex = worlds.findIndex((world) => world.status === "available");
        const resume =
            resumeIndex === -1
                ? null
                : {
                      world: toWorldRef(j.worlds[resumeIndex]!.world),
                      levelId: this.journeys.nextAvailableLevel(j, resumeIndex)?.id ?? null,
                  };

        return {
            worlds,
            harmony: worlds.reduce((sum, world) => sum + world.harmony, 0),
            maxHarmony: totalLevels * MAX_HARMONY_PER_LEVEL,
            completedLevels: j.progress.size,
            totalLevels,
            resume,
        };
    }

    async stats(userId: string): Promise<PlayerStats> {
        const journey = await this.journeys.load(userId);
        const levels = journey.worlds.flatMap(({ world, levels }) => levels.map((level, i) => ({ level, world, position: i + 1 })));
        const levelIds = levels.map(({ level }) => level.id);

        const [allSessions, completedSessions] = await Promise.all([
            this.prisma.playSession.groupBy({
                by: ["levelId"],
                where: { userId, levelId: { in: levelIds } },
                _count: { _all: true },
                _sum: { hintsUsed: true },
            }),
            this.prisma.playSession.groupBy({
                by: ["levelId"],
                where: { userId, levelId: { in: levelIds }, completedAt: { not: null } },
                _sum: { durationMs: true },
            }),
        ]);

        const sessionsByLevel = new Map(allSessions.map((row) => [row.levelId, row]));
        const playTimeMs = completedSessions.reduce((sum, row) => sum + (row._sum.durationMs ?? 0), 0);

        const levelStats: LevelStats[] = levels.map(({ level, world, position }) => {
            const best = journey.progress.get(level.id);
            const sessions = sessionsByLevel.get(level.id);
            return {
                levelId: level.id,
                worldTitle: world.title,
                position,
                title: level.title,
                petals: best?.petals ?? 0,
                bestTimeMs: best?.bestTimeMs ?? null,
                completions: best?.completions ?? 0,
                sessions: sessions?._count._all ?? 0,
                hintsUsed: sessions?._sum.hintsUsed ?? 0,
            };
        });

        const sum = (pick: (row: LevelStats) => number) => levelStats.reduce((total, row) => total + pick(row), 0);

        return {
            levels: levelStats,
            totals: {
                sessions: sum((row) => row.sessions),
                completions: sum((row) => row.completions),
                hintsUsed: sum((row) => row.hintsUsed),
                harmony: sum((row) => petalCount(row.petals)),
                playTimeMs,
            },
        };
    }
}
