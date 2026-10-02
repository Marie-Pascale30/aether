import { Injectable } from "@nestjs/common";
import type { Level, LevelProgress, World } from "@prisma/client";
import { computeJourney, gardenStage, MAX_STARS_PER_LEVEL, type LevelStatus, type WorldSummary } from "@aether/shared";
import { PrismaService } from "../prisma/prisma.service";
import { BY_ORDER, toTheme } from "./level.mapper";

export interface JourneyWorld {
    world: World;
    /** Énigmes publiées, dans l'ordre. */
    levels: Level[];
}

/** Parcours publié d'un joueur, chargé en une fois : tout ce que les écrans de jeu affichent en découle. */
export interface Journey {
    /** Mondes publiés ayant au moins une énigme publiée, dans l'ordre. */
    worlds: JourneyWorld[];
    worldStatuses: Map<string, LevelStatus>;
    levelStatuses: Map<string, LevelStatus>;
    /** Meilleur résultat par énigme publiée résolue (clé : id du niveau). */
    progress: Map<string, LevelProgress>;
}

export interface LevelLocation {
    worldIndex: number;
    levelIndex: number;
}

@Injectable()
export class JourneyService {
    constructor(private readonly prisma: PrismaService) {}

    async load(userId: string): Promise<Journey> {
        const rows = await this.prisma.world.findMany({
            where: { published: true },
            orderBy: BY_ORDER,
            include: { levels: { where: { published: true }, orderBy: BY_ORDER } },
        });
        const worlds = rows.filter((row) => row.levels.length > 0).map(({ levels, ...world }) => ({ world, levels }));

        const progressRows = await this.prisma.levelProgress.findMany({
            where: { userId, levelId: { in: worlds.flatMap((w) => w.levels.map((level) => level.id)) } },
        });
        const progress = new Map(progressRows.map((row) => [row.levelId, row]));

        const statuses = computeJourney(
            worlds.map((w) => ({ id: w.world.id, levelIds: w.levels.map((level) => level.id) })),
            new Set(progress.keys()),
        );
        return { worlds, worldStatuses: statuses.worlds, levelStatuses: statuses.levels, progress };
    }

    locate(journey: Journey, levelId: string): LevelLocation | null {
        for (const [worldIndex, { levels }] of journey.worlds.entries()) {
            const levelIndex = levels.findIndex((level) => level.id === levelId);
            if (levelIndex !== -1) return { worldIndex, levelIndex };
        }
        return null;
    }

    worldSummary(journey: Journey, worldIndex: number): WorldSummary {
        const { world, levels } = journey.worlds[worldIndex]!;
        const results = levels.map((level) => journey.progress.get(level.id)).filter((row) => row !== undefined);

        return {
            id: world.id,
            slug: world.slug,
            position: worldIndex + 1,
            title: world.title,
            tagline: world.tagline,
            theme: toTheme(world.theme),
            status: journey.worldStatuses.get(world.id) ?? "locked",
            stars: results.reduce((sum, row) => sum + row.bestStars, 0),
            maxStars: levels.length * MAX_STARS_PER_LEVEL,
            garden: {
                stage: gardenStage(results.length, levels.length),
                completedLevels: results.length,
                totalLevels: levels.length,
            },
        };
    }

    /** Première énigme ouverte et non résolue d'un monde. */
    nextAvailableLevel(journey: Journey, worldIndex: number): Level | null {
        return journey.worlds[worldIndex]?.levels.find((level) => journey.levelStatuses.get(level.id) === "available") ?? null;
    }
}
