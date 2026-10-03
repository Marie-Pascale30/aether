import { MAX_HARMONY_PER_LEVEL } from "../constants";
import type {
    CompletionResult,
    ContentBundle,
    ContentLevel,
    ContentWorld,
    LevelDetail,
    LevelRecord,
    LevelStatus,
    LevelSummary,
    ProgressSummary,
    WorldDetail,
    WorldRef,
    WorldSummary,
} from "../types";
import { gardenStage } from "./garden";
import { groupSizeOf } from "./levels";
import { petalCount } from "./scoring";
import { computeJourney } from "./unlock";

export type ProgressRecords = ReadonlyMap<string, LevelRecord>;

/** Nombre de liens / questions / circuits à trouver, quelle que soit la mécanique. */
export function goalCountOf(level: Pick<ContentLevel, "mechanic" | "groups" | "puzzle">): number {
    const { puzzle } = level;
    if (level.mechanic === "LINKS" || !puzzle) return level.groups.length;
    if ("targets" in puzzle) return puzzle.targets.length;
    if ("endpoints" in puzzle) return puzzle.endpoints.length;
    return 1;
}

export const toWorldRef = (world: Pick<ContentWorld, "slug" | "title" | "theme">): WorldRef => ({
    slug: world.slug,
    title: world.title,
    theme: world.theme,
});

/** Énigme prête à jouer, à sa place dans un monde (ou hors parcours : position 0). */
export function toLevelDetail(
    level: ContentLevel,
    world: WorldRef,
    place: { siblings: readonly ContentLevel[]; index: number } | null,
    isDaily = false,
): LevelDetail {
    return {
        id: level.id,
        world,
        position: place ? place.index + 1 : 0,
        total: place?.siblings.length ?? 0,
        title: level.title,
        description: level.description,
        symbols: level.symbols,
        columns: level.columns,
        mechanic: level.mechanic,
        puzzle: level.puzzle,
        hints: level.hints,
        kind: level.kind,
        groups: level.groups,
        groupSize: groupSizeOf(level),
        groupCount: goalCountOf(level),
        previousLevelId: place ? (place.siblings[place.index - 1]?.id ?? null) : null,
        nextLevelId: place ? (place.siblings[place.index + 1]?.id ?? null) : null,
        isDaily,
    };
}

export interface JourneyView {
    worlds: WorldSummary[];
    summary: ProgressSummary;
    world(slug: string): WorldDetail | null;
    /** Statut d'une énigme du parcours, `null` si elle n'en fait pas partie. */
    status(levelId: string): LevelStatus | null;
    /** Énigme du parcours ou du jour, `null` si inconnue de ce contenu. */
    level(levelId: string): LevelDetail | null;
}

/**
 * Le parcours d'un joueur, calculé entièrement à partir du contenu embarqué et de sa progression :
 * ouvertures, jardins, harmonie, point de reprise. Identique à ce que calcule le serveur.
 */
export function buildJourney(bundle: ContentBundle, records: ProgressRecords): JourneyView {
    const worlds = bundle.worlds.filter((world) => world.levels.length > 0);
    const statuses = computeJourney(
        worlds.map((world) => ({ id: world.id, levelIds: world.levels.map((level) => level.id) })),
        new Set([...records.keys()]),
    );

    const summaries = worlds.map((world, i): WorldSummary => {
        const done = world.levels.filter((level) => records.has(level.id));
        return {
            id: world.id,
            slug: world.slug,
            position: i + 1,
            title: world.title,
            tagline: world.tagline,
            theme: world.theme,
            status: statuses.worlds.get(world.id) ?? "locked",
            harmony: done.reduce((sum, level) => sum + petalCount(records.get(level.id)!.petals), 0),
            maxHarmony: world.levels.length * MAX_HARMONY_PER_LEVEL,
            garden: {
                stage: gardenStage(done.length, world.levels.length),
                completedLevels: done.length,
                totalLevels: world.levels.length,
            },
        };
    });

    const nextAvailable = (world: ContentWorld) => world.levels.find((level) => statuses.levels.get(level.id) === "available") ?? null;
    const totalLevels = worlds.reduce((sum, world) => sum + world.levels.length, 0);
    const resumeIndex = summaries.findIndex((world) => world.status === "available");

    const summary: ProgressSummary = {
        worlds: summaries,
        harmony: summaries.reduce((sum, world) => sum + world.harmony, 0),
        maxHarmony: totalLevels * MAX_HARMONY_PER_LEVEL,
        completedLevels: worlds.reduce((sum, world) => sum + world.levels.filter((level) => records.has(level.id)).length, 0),
        totalLevels,
        resume:
            resumeIndex === -1
                ? null
                : { world: toWorldRef(worlds[resumeIndex]!), levelId: nextAvailable(worlds[resumeIndex]!)?.id ?? null },
    };

    return {
        worlds: summaries,
        summary,
        world(slug) {
            const index = worlds.findIndex((world) => world.slug === slug);
            if (index === -1) return null;
            const world = worlds[index]!;
            return {
                ...summaries[index]!,
                description: world.description,
                levels: world.levels.map(
                    (level, i): LevelSummary => ({
                        id: level.id,
                        position: i + 1,
                        title: level.title,
                        mechanic: level.mechanic,
                        kind: level.kind,
                        groupCount: goalCountOf(level),
                        status: statuses.levels.get(level.id) ?? "locked",
                        petals: records.get(level.id)?.petals ?? 0,
                        bestTimeMs: records.get(level.id)?.bestTimeMs ?? null,
                    }),
                ),
                nextLevelId: nextAvailable(world)?.id ?? null,
            };
        },
        status: (levelId) => statuses.levels.get(levelId) ?? null,
        level(levelId) {
            for (const world of worlds) {
                const index = world.levels.findIndex((level) => level.id === levelId);
                if (index !== -1) return toLevelDetail(world.levels[index]!, toWorldRef(world), { siblings: world.levels, index });
            }
            const daily = bundle.daily.days.find((day) => day.level.id === levelId);
            return daily ? toLevelDetail(daily.level, daily.world, null, true) : null;
        },
    };
}

/** Progression après une victoire : les pétales s'additionnent, le meilleur temps se garde. */
export function recordWin(records: ProgressRecords, levelId: string, petals: number, durationMs: number): Map<string, LevelRecord> {
    const next = new Map(records);
    const previous = records.get(levelId);
    next.set(levelId, {
        petals: (previous?.petals ?? 0) | petals,
        bestTimeMs: Math.min(previous?.bestTimeMs ?? durationMs, durationMs),
    });
    return next;
}

export interface WinInput {
    levelId: string;
    petals: number;
    durationMs: number;
    hintsUsed: number;
}

/**
 * Ce que change une victoire dans le parcours (énigme suivante, monde restauré, monde ouvert…),
 * calculé sur l'appareil : le panneau de fin s'affiche sans attendre le réseau. Les repères et la
 * série du jour sont complétés à part.
 */
export function describeWin(bundle: ContentBundle, before: ProgressRecords, win: WinInput): Omit<CompletionResult, "milestones" | "daily"> {
    const after = recordWin(before, win.levelId, win.petals, win.durationMs);
    const previous = before.get(win.levelId)?.petals ?? 0;
    const levelPetals = after.get(win.levelId)!.petals;
    const journey = buildJourney(bundle, after);
    const run = {
        petals: win.petals,
        levelPetals,
        newPetals: levelPetals & ~previous,
        durationMs: win.durationMs,
        hintsUsed: win.hintsUsed,
        bestTimeMs: after.get(win.levelId)!.bestTimeMs,
    };

    const worldIndex = bundle.worlds.findIndex((world) => world.levels.some((level) => level.id === win.levelId));
    if (worldIndex === -1) {
        return { ...run, nextLevelId: null, worldCompleted: false, nextWorld: null, gameCompleted: false, garden: { stage: 0, completedLevels: 0, totalLevels: 0 } };
    }

    const world = bundle.worlds[worldIndex]!;
    const summary = journey.worlds.find((w) => w.id === world.id)!;
    const index = world.levels.findIndex((level) => level.id === win.levelId);
    const nextWorld = journey.worlds[journey.worlds.indexOf(summary) + 1];
    const worldCompleted = summary.status === "completed";

    return {
        ...run,
        nextLevelId: world.levels[index + 1]?.id ?? null,
        worldCompleted,
        nextWorld: worldCompleted && nextWorld && nextWorld.status !== "locked" ? { slug: nextWorld.slug, title: nextWorld.title, theme: nextWorld.theme } : null,
        gameCompleted: journey.worlds.every((w) => w.status === "completed"),
        garden: summary.garden,
    };
}
