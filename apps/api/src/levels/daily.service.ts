import { createHash } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Level, type World } from "@prisma/client";
import { buildShareText, computeStreak, dailyOutcome, dateKey, previousDateKey, type DailyOutcome, type DailyState, type StreakSummary } from "@aether/shared";
import type { AuthUser } from "../common/auth.decorators";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { goalCount } from "./level.mapper";

/** Une clé « AAAA-MM-JJ » stockée comme date sans heure. */
const toDbDate = (key: string) => new Date(`${key}T00:00:00Z`);
const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

export const nextDateKey = (key: string) => {
    const date = toDbDate(key);
    date.setUTCDate(date.getUTCDate() + 1);
    return fromDbDate(date);
};

/** Jours tirés d'avance (aujourd'hui compris) : l'appareil peut jouer hors ligne pendant une semaine. */
export const DAILY_DAYS_AHEAD = 7;
/** Une victoire du jour envoyée en retard (hors ligne) compte encore jusqu'à deux jours après. */
export const DAILY_LATE_DAYS = 2;

export type LevelWithWorld = Level & { world: World };

/**
 * L'énigme du jour : la même pour tous les joueurs, tirée dans la réserve (mondes `isDaily`).
 * Le tirage privilégie les énigmes jouées il y a le plus longtemps, puis départage de façon
 * déterministe avec la date ; les jours à venir sont tirés d'avance pour le hors ligne.
 */
@Injectable()
export class DailyService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(ENV) private readonly env: Env,
    ) {}

    today(): string {
        return dateKey(new Date(), this.env.DAILY_TIMEZONE);
    }

    get timeZone(): string {
        return this.env.DAILY_TIMEZONE;
    }

    async challengeLevel(key = this.today()): Promise<LevelWithWorld> {
        const date = toDbDate(key);
        const existing = await this.prisma.dailyChallenge.findUnique({ where: { date }, include: { level: { include: { world: true } } } });
        if (existing) return existing.level;

        const pool = await this.prisma.level.findMany({
            where: { published: true, world: { published: true, isDaily: true } },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            include: { world: true },
        });
        if (pool.length === 0) throw new NotFoundException("Aucune énigme du jour n'est disponible pour le moment.");

        const lastUses = await this.prisma.dailyChallenge.groupBy({
            by: ["levelId"],
            where: { levelId: { in: pool.map((level) => level.id) } },
            _max: { date: true },
        });
        const lastUse = new Map(lastUses.map((row) => [row.levelId, row._max.date?.getTime() ?? 0]));
        const oldest = Math.min(...pool.map((level) => lastUse.get(level.id) ?? 0));
        const candidates = pool.filter((level) => (lastUse.get(level.id) ?? 0) === oldest);
        const picked = candidates[createHash("sha256").update(key).digest().readUInt32BE(0) % candidates.length]!;

        try {
            await this.prisma.dailyChallenge.create({ data: { date, levelId: picked.id } });
            return picked;
        } catch (error) {
            // Deux premières demandes simultanées : l'autre a tiré avant nous, on garde son choix.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                return (await this.prisma.dailyChallenge.findUniqueOrThrow({ where: { date }, include: { level: { include: { world: true } } } })).level;
            }
            throw error;
        }
    }

    /** Énigmes d'aujourd'hui et des jours suivants, tirées si besoin (dans l'ordre : le tirage en dépend). */
    async upcoming(): Promise<{ date: string; level: LevelWithWorld }[]> {
        const days: { date: string; level: LevelWithWorld }[] = [];
        let key = this.today();
        try {
            for (let i = 0; i < DAILY_DAYS_AHEAD; i++, key = nextDateKey(key)) days.push({ date: key, level: await this.challengeLevel(key) });
        } catch (error) {
            if (!(error instanceof NotFoundException)) throw error; // réserve vide : pas d'énigme du jour
        }
        return days;
    }

    /**
     * Jour dont cette énigme est l'énigme du jour, parmi ceux où elle est jouable : avec `playedAt`,
     * le jour de la victoire (s'il date d'au plus DAILY_LATE_DAYS jours) ; sans, toute la fenêtre
     * tirée d'avance. `null` si elle n'est l'énigme d'aucun de ces jours.
     */
    async dateForLevel(levelId: string, playedAt?: Date): Promise<string | null> {
        const today = this.today();
        let earliest = today;
        for (let i = 0; i < DAILY_LATE_DAYS; i++) earliest = previousDateKey(earliest);

        if (playedAt) {
            const key = dateKey(playedAt, this.env.DAILY_TIMEZONE);
            if (key < earliest || key > today) return null;
            const challenge = await this.prisma.dailyChallenge.findUnique({ where: { date: toDbDate(key) } });
            return challenge?.levelId === levelId ? key : null;
        }

        let latest = today;
        for (let i = 1; i < DAILY_DAYS_AHEAD; i++) latest = nextDateKey(latest);
        const challenge = await this.prisma.dailyChallenge.findFirst({
            where: { levelId, date: { gte: toDbDate(earliest), lte: toDbDate(latest) } },
            orderBy: { date: "asc" },
        });
        return challenge ? fromDbDate(challenge.date) : null;
    }

    async state(user: AuthUser): Promise<DailyState> {
        const key = this.today();
        const level = await this.challengeLevel(key);
        const [result, days, solvedToday] = await Promise.all([
            this.prisma.dailyResult.findUnique({ where: { userId_date: { userId: user.id, date: toDbDate(key) } } }),
            this.resultDays(user.id),
            this.prisma.dailyResult.count({ where: { date: toDbDate(key) } }),
        ]);
        const streak = computeStreak(days, key);

        return {
            date: key,
            level: { id: level.id, title: level.title, mechanic: level.mechanic, kind: level.kind, groupCount: goalCount(level) },
            result: result && { petals: result.petals, durationMs: result.durationMs, hintsUsed: result.hintsUsed },
            streak,
            share: result ? buildShareText({ petals: result.petals, date: key, streak: streak.current }) : null,
            solvedToday,
            timeZone: this.env.DAILY_TIMEZONE,
        };
    }

    /**
     * Enregistre une victoire sur l'énigme du jour `date`. Seule la première de ce jour compte
     * (série, partage) ; les suivantes restent de simples parties.
     */
    async recordWin(
        user: AuthUser,
        date: string,
        session: { id: string; petals: number; durationMs: number; mistakes: number; hintsUsed: number },
    ): Promise<DailyOutcome> {
        const before = await this.prisma.dailyResult.findMany({ where: { userId: user.id }, select: { date: true, petals: true } });
        const results = new Map(before.map((row) => [fromDbDate(row.date), row.petals]));

        if (!results.has(date)) {
            await this.prisma.dailyResult.createMany({
                data: [
                    {
                        userId: user.id,
                        date: toDbDate(date),
                        sessionId: session.id,
                        petals: session.petals,
                        durationMs: session.durationMs,
                        mistakes: session.mistakes,
                        hintsUsed: session.hintsUsed,
                    },
                ],
                // Deux envois simultanés : le premier arrivé fait foi.
                skipDuplicates: true,
            });
        }
        return dailyOutcome(results, date, this.today(), session.petals);
    }

    /** Série de l'énigme du jour, à la date d'aujourd'hui. */
    async streak(userId: string): Promise<StreakSummary> {
        return computeStreak(await this.resultDays(userId), this.today());
    }

    async results(userId: string) {
        const rows = await this.prisma.dailyResult.findMany({ where: { userId }, orderBy: { date: "asc" } });
        return rows.map((row) => ({ date: fromDbDate(row.date), petals: row.petals, durationMs: row.durationMs, hintsUsed: row.hintsUsed }));
    }

    private async resultDays(userId: string): Promise<string[]> {
        const rows = await this.prisma.dailyResult.findMany({ where: { userId }, select: { date: true } });
        return rows.map((row) => fromDbDate(row.date));
    }
}
