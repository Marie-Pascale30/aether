import { Injectable } from "@nestjs/common";
import type { AccountExport } from "@aether/shared";
import { PrismaService } from "../prisma/prisma.service";

const iso = (date: Date) => date.toISOString();
const isoOrNull = (date: Date | null) => (date ? date.toISOString() : null);

/**
 * Export des données d'un joueur (droit d'accès et à la portabilité, RGPD art. 15 et 20).
 * Les champs sont choisis un à un : jamais d'empreinte de mot de passe, de version de session
 * ni de jeton envoyé par e-mail.
 */
@Injectable()
export class ExportService {
    constructor(private readonly prisma: PrismaService) {}

    async export(userId: string): Promise<AccountExport> {
        const [user, progress, dailyResults, milestones, sessions] = await Promise.all([
            this.prisma.user.findUniqueOrThrow({
                where: { id: userId },
                select: {
                    id: true,
                    displayName: true,
                    email: true,
                    emailVerifiedAt: true,
                    role: true,
                    isGuest: true,
                    createdAt: true,
                    updatedAt: true,
                    lastSeenAt: true,
                },
            }),
            this.prisma.levelProgress.findMany({
                where: { userId },
                orderBy: { firstCompletedAt: "asc" },
                include: { level: { select: { title: true } } },
            }),
            this.prisma.dailyResult.findMany({ where: { userId }, orderBy: { date: "asc" } }),
            this.prisma.milestone.findMany({ where: { userId }, orderBy: { reachedAt: "asc" } }),
            this.prisma.playSession.findMany({
                where: { userId },
                orderBy: { startedAt: "asc" },
                include: { attempts: { orderBy: { createdAt: "asc" }, select: { cells: true, correct: true, createdAt: true } } },
            }),
        ]);

        return {
            format: "aether-export",
            version: 1,
            exportedAt: new Date().toISOString(),
            profile: {
                ...user,
                emailVerifiedAt: isoOrNull(user.emailVerifiedAt),
                createdAt: iso(user.createdAt),
                updatedAt: iso(user.updatedAt),
                lastSeenAt: iso(user.lastSeenAt),
            },
            progress: progress.map((row) => ({
                levelId: row.levelId,
                levelTitle: row.level.title,
                petals: row.petals,
                bestTimeMs: row.bestTimeMs,
                completions: row.completions,
                firstCompletedAt: iso(row.firstCompletedAt),
                updatedAt: iso(row.updatedAt),
            })),
            dailyResults: dailyResults.map((row) => ({
                date: row.date.toISOString().slice(0, 10),
                petals: row.petals,
                durationMs: row.durationMs,
                mistakes: row.mistakes,
                hintsUsed: row.hintsUsed,
                createdAt: iso(row.createdAt),
            })),
            milestones: milestones.map((row) => ({ key: row.key, reachedAt: iso(row.reachedAt) })),
            sessions: sessions.map((row) => ({
                id: row.id,
                levelId: row.levelId,
                startedAt: iso(row.startedAt),
                completedAt: isoOrNull(row.completedAt),
                mistakes: row.mistakes,
                hintsUsed: row.hintsUsed,
                petals: row.petals,
                durationMs: row.durationMs,
                attempts: row.attempts.map((attempt) => ({ cells: attempt.cells, correct: attempt.correct, createdAt: iso(attempt.createdAt) })),
            })),
        };
    }
}
