import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Level, LevelProgress } from "@prisma/client";
import { computeLevelStatuses, type LevelDetail, type LevelStatus, type LevelSummary } from "@aether/shared";
import type { AuthUser } from "../common/auth.decorators";
import { PrismaService } from "../prisma/prisma.service";
import { LEVEL_ORDER, parsePairs } from "./level.mapper";

const pairCount = (level: Level) => parsePairs(level.pairs).length;

export interface Journey {
    levels: Level[];
    statuses: Map<string, LevelStatus>;
    /** Meilleur résultat par énigme publiée résolue (clé : id du niveau). */
    progress: Map<string, LevelProgress>;
}

@Injectable()
export class LevelsService {
    constructor(private readonly prisma: PrismaService) {}

    /** Parcours publié du joueur : énigmes ordonnées, statut de chacune et meilleurs résultats. */
    async journey(userId: string): Promise<Journey> {
        const levels = await this.prisma.level.findMany({ where: { published: true }, orderBy: LEVEL_ORDER });
        const rows = await this.prisma.levelProgress.findMany({
            where: { userId, levelId: { in: levels.map((level) => level.id) } },
        });

        const progress = new Map(rows.map((row) => [row.levelId, row]));
        const statuses = computeLevelStatuses(
            levels.map((level) => level.id),
            new Set(progress.keys()),
        );
        return { levels, statuses, progress };
    }

    async list(user: AuthUser): Promise<LevelSummary[]> {
        const { levels, statuses, progress } = await this.journey(user.id);

        return levels.map((level, i) => ({
            id: level.id,
            position: i + 1,
            title: level.title,
            pairCount: pairCount(level),
            status: statuses.get(level.id) ?? "locked",
            bestStars: progress.get(level.id)?.bestStars ?? null,
            bestTimeMs: progress.get(level.id)?.bestTimeMs ?? null,
        }));
    }

    /**
     * Énigme jouable par cet utilisateur. Refuse les énigmes scellées ou non publiées,
     * sauf pour un administrateur (aperçu depuis l'éditeur).
     */
    async playable(user: AuthUser, levelId: string): Promise<{ level: Level; journey: Journey; index: number }> {
        const journey = await this.journey(user.id);
        const index = journey.levels.findIndex((level) => level.id === levelId);
        const isAdmin = user.role === "ADMIN";

        if (index === -1) {
            const draft = isAdmin ? await this.prisma.level.findUnique({ where: { id: levelId } }) : null;
            if (!draft) throw new NotFoundException("Cette énigme n'existe pas.");
            return { level: draft, journey, index };
        }

        if (!isAdmin && journey.statuses.get(levelId) === "locked") {
            throw new ForbiddenException("Cette énigme est encore scellée : résous d'abord la précédente.");
        }
        return { level: journey.levels[index]!, journey, index };
    }

    async detail(user: AuthUser, levelId: string): Promise<LevelDetail> {
        const { level, journey, index } = await this.playable(user, levelId);
        const inJourney = index !== -1;

        return {
            id: level.id,
            position: inJourney ? index + 1 : 0,
            total: journey.levels.length,
            title: level.title,
            description: level.description,
            symbols: level.symbols,
            columns: level.columns,
            pairCount: pairCount(level),
            hintCount: level.hints.length,
            previousLevelId: inJourney ? (journey.levels[index - 1]?.id ?? null) : null,
            nextLevelId: inJourney ? (journey.levels[index + 1]?.id ?? null) : null,
        };
    }
}
