import { Injectable } from "@nestjs/common";
import { gardenStage, MAX_STARS_PER_LEVEL, type PlayerStats, type ProgressSummary } from "@aether/shared";
import { LevelsService } from "../levels/levels.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProgressService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly levels: LevelsService,
    ) {}

    async summary(userId: string): Promise<ProgressSummary> {
        const { levels, statuses, progress } = await this.levels.journey(userId);
        const completedLevels = progress.size;
        const totalLevels = levels.length;

        return {
            garden: { stage: gardenStage(completedLevels, totalLevels), completedLevels, totalLevels },
            totalStars: [...progress.values()].reduce((sum, row) => sum + row.bestStars, 0),
            maxStars: totalLevels * MAX_STARS_PER_LEVEL,
            nextLevelId: levels.find((level) => statuses.get(level.id) === "available")?.id ?? null,
        };
    }

    async stats(userId: string): Promise<PlayerStats> {
        const { levels, progress } = await this.levels.journey(userId);
        const levelIds = levels.map((level) => level.id);

        const [allSessions, completedSessions] = await Promise.all([
            this.prisma.playSession.groupBy({
                by: ["levelId"],
                where: { userId, levelId: { in: levelIds } },
                _count: { _all: true },
                _sum: { mistakes: true, hintsUsed: true },
            }),
            this.prisma.playSession.groupBy({
                by: ["levelId"],
                where: { userId, levelId: { in: levelIds }, completedAt: { not: null } },
                _sum: { durationMs: true },
            }),
        ]);

        const sessionsByLevel = new Map(allSessions.map((row) => [row.levelId, row]));
        const playTimeByLevel = new Map(completedSessions.map((row) => [row.levelId, row._sum.durationMs ?? 0]));

        const levelStats = levels.map((level, i) => {
            const best = progress.get(level.id);
            const sessions = sessionsByLevel.get(level.id);
            return {
                levelId: level.id,
                position: i + 1,
                title: level.title,
                bestStars: best?.bestStars ?? null,
                bestTimeMs: best?.bestTimeMs ?? null,
                completions: best?.completions ?? 0,
                sessions: sessions?._count._all ?? 0,
                mistakes: sessions?._sum.mistakes ?? 0,
                hintsUsed: sessions?._sum.hintsUsed ?? 0,
            };
        });

        const sum = (pick: (row: (typeof levelStats)[number]) => number) =>
            levelStats.reduce((total, row) => total + pick(row), 0);

        return {
            levels: levelStats,
            totals: {
                sessions: sum((row) => row.sessions),
                completions: sum((row) => row.completions),
                mistakes: sum((row) => row.mistakes),
                hintsUsed: sum((row) => row.hintsUsed),
                totalStars: sum((row) => row.bestStars ?? 0),
                playTimeMs: [...playTimeByLevel.values()].reduce((a, b) => a + b, 0),
            },
        };
    }
}
