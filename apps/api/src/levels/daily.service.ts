import { createHash } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Level } from "@prisma/client";
import { buildShareText, computeStreak, dateKey, type DailyOutcome, type DailyState } from "@aether/shared";
import type { AuthUser } from "../common/auth.decorators";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { parseGroups } from "./level.mapper";

/** Une clé « AAAA-MM-JJ » stockée comme date sans heure. */
const toDbDate = (key: string) => new Date(`${key}T00:00:00Z`);
const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * L'énigme du jour : la même pour tous les joueurs, tirée dans la réserve (mondes `isDaily`)
 * à la première demande du jour. Le tirage privilégie les énigmes jouées il y a le plus
 * longtemps, puis départage de façon déterministe avec la date.
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

    async challengeLevel(key = this.today()): Promise<Level> {
        const date = toDbDate(key);
        const existing = await this.prisma.dailyChallenge.findUnique({ where: { date }, include: { level: true } });
        if (existing) return existing.level;

        const pool = await this.prisma.level.findMany({
            where: { published: true, world: { published: true, isDaily: true } },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
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
                return (await this.prisma.dailyChallenge.findUniqueOrThrow({ where: { date }, include: { level: true } })).level;
            }
            throw error;
        }
    }

    /** L'énigme est-elle celle d'aujourd'hui ? (Les énigmes de la réserve ne se jouent que le jour venu.) */
    async isTodayLevel(levelId: string): Promise<boolean> {
        const challenge = await this.prisma.dailyChallenge.findUnique({ where: { date: toDbDate(this.today()) } });
        return challenge?.levelId === levelId;
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
            level: { id: level.id, title: level.title, kind: level.kind, groupCount: parseGroups(level.groups).length },
            result: result && { stars: result.stars, durationMs: result.durationMs, mistakes: result.mistakes, hintsUsed: result.hintsUsed },
            streak,
            share: result ? buildShareText({ ...result, date: key, streak: streak.current }) : null,
            solvedToday,
            timeZone: this.env.DAILY_TIMEZONE,
        };
    }

    /**
     * Enregistre une victoire sur l'énigme du jour. Seule la première compte (série, partage) ;
     * les suivantes restent de simples parties.
     */
    async recordWin(
        user: AuthUser,
        session: { id: string; stars: number; durationMs: number; mistakes: number; hintsUsed: number },
    ): Promise<DailyOutcome> {
        const key = this.today();
        const date = toDbDate(key);
        const existing = await this.prisma.dailyResult.findUnique({ where: { userId_date: { userId: user.id, date } } });

        let result = existing;
        if (!existing) {
            const attempts = await this.prisma.attempt.findMany({
                where: { sessionId: session.id },
                orderBy: { createdAt: "asc" },
                select: { correct: true },
            });
            result = await this.prisma.dailyResult.create({
                data: {
                    userId: user.id,
                    date,
                    sessionId: session.id,
                    stars: session.stars,
                    durationMs: session.durationMs,
                    mistakes: session.mistakes,
                    hintsUsed: session.hintsUsed,
                    // Mécaniques jouées sur l'appareil : pas de coups enregistrés, on résume par les essais.
                    pattern: attempts.length
                        ? attempts.map((attempt) => attempt.correct)
                        : [...Array<boolean>(session.mistakes).fill(false), true],
                },
            });
        }

        const streak = computeStreak(await this.resultDays(user.id), key);
        return {
            date: key,
            firstToday: !existing,
            streak,
            share: buildShareText({ ...result!, date: key, streak: streak.current }),
        };
    }

    private async resultDays(userId: string): Promise<string[]> {
        const rows = await this.prisma.dailyResult.findMany({ where: { userId }, select: { date: true } });
        return rows.map((row) => fromDbDate(row.date));
    }
}
