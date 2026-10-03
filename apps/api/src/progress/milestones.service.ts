import { Inject, Injectable } from "@nestjs/common";
import {
    ALL_PETALS,
    evaluateMilestones,
    hasPetal,
    type MilestoneFacts,
    type MilestoneProgress,
    type MilestonesView,
    type MilestoneState,
    type StreakSummary,
} from "@aether/shared";
import { ENV, type Env } from "../config/env";
import { DailyService } from "../levels/daily.service";
import { JourneyService } from "../levels/journey.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Repères personnels : calculés à partir de ce que le joueur a accompli, puis enregistrés
 * avec leur date dès qu'ils sont atteints (un repère atteint le reste toujours).
 */
@Injectable()
export class MilestonesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly journeys: JourneyService,
        private readonly daily: DailyService,
        @Inject(ENV) private readonly env: Env,
    ) {}

    async view(userId: string): Promise<MilestonesView> {
        const { states, facts, currentStreak } = await this.sync(userId);
        return { milestones: states, facts, currentStreak };
    }

    /** Enregistre les repères nouvellement atteints et les renvoie. */
    async reachNew(userId: string): Promise<MilestoneState[]> {
        const { states, created } = await this.sync(userId);
        return states.filter((state) => created.has(state.key));
    }

    private async sync(userId: string) {
        const { facts, streak } = await this.facts(userId);
        const progress = evaluateMilestones(facts);

        const saved = await this.prisma.milestone.findMany({ where: { userId } });
        const reachedAt = new Map(saved.map((row) => [row.key, row.reachedAt]));
        const fresh = progress.filter((p) => p.reached && !reachedAt.has(p.definition.key));

        const created = new Set<string>();
        if (fresh.length > 0) {
            const now = new Date();
            const { count } = await this.prisma.milestone.createMany({
                data: fresh.map((p) => ({ userId, key: p.definition.key, reachedAt: now })),
                skipDuplicates: true,
            });
            // Deux victoires simultanées : seule celle qui a réellement inséré annonce les repères.
            if (count === fresh.length) {
                fresh.forEach((p) => {
                    reachedAt.set(p.definition.key, now);
                    created.add(p.definition.key);
                });
            } else {
                (await this.prisma.milestone.findMany({ where: { userId } })).forEach((row) => reachedAt.set(row.key, row.reachedAt));
            }
        }

        const states = progress.map((p) => toState(p, reachedAt.get(p.definition.key) ?? null));
        return { states, created, facts, currentStreak: streak.current };
    }

    private async facts(userId: string): Promise<{ facts: MilestoneFacts; streak: StreakSummary }> {
        const [journey, solved, streak, dailyDays, [days]] = await Promise.all([
            this.journeys.load(userId),
            // Toutes les énigmes résolues, énigmes du jour comprises.
            this.prisma.levelProgress.findMany({ where: { userId }, select: { petals: true, level: { select: { mechanic: true } } } }),
            this.daily.streak(userId),
            this.prisma.dailyResult.count({ where: { userId } }),
            this.prisma.$queryRaw<{ count: number }[]>`
                SELECT count(DISTINCT ("completedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${this.env.DAILY_TIMEZONE})::date)::int AS count
                FROM "PlaySession"
                WHERE "userId" = ${userId} AND "completedAt" IS NOT NULL`,
        ]);

        const facts: MilestoneFacts = {
            solvedLevels: solved.length,
            restoredWorlds: journey.worlds.filter((w) => journey.worldStatuses.get(w.world.id) === "completed").length,
            mechanicsExplored: new Set(solved.map((row) => row.level.mechanic)).size,
            autonomousLevels: solved.filter((row) => hasPetal(row.petals, "AUTONOMY")).length,
            clearLevels: solved.filter((row) => hasPetal(row.petals, "CLARITY")).length,
            fullHarmonyLevels: solved.filter((row) => (row.petals & ALL_PETALS) === ALL_PETALS).length,
            dailyDays,
            bestStreak: streak.best,
            playDays: days?.count ?? 0,
        };
        return { facts, streak };
    }
}

function toState({ definition, current }: MilestoneProgress, reachedAt: Date | null): MilestoneState {
    return {
        key: definition.key,
        value: definition.value,
        title: definition.title,
        description: definition.description,
        // Un repère atteint reste plein, même si sa mesure baisse (énigme dépubliée, par exemple).
        current: reachedAt ? definition.target : current,
        target: definition.target,
        reachedAt: reachedAt?.toISOString() ?? null,
    };
}
