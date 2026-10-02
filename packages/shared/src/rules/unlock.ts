import type { LevelStatus } from "../types";

export interface JourneyWorld {
    id: string;
    /** Énigmes publiées du monde, dans l'ordre. */
    levelIds: readonly string[];
}

export interface JourneyStatuses {
    worlds: Map<string, LevelStatus>;
    levels: Map<string, LevelStatus>;
}

/**
 * Statut de chaque énigme d'un parcours ordonné : la première est toujours ouverte,
 * les suivantes s'ouvrent quand la précédente est résolue. Une énigme résolue le reste,
 * même si une nouvelle énigme est insérée avant elle.
 */
export function computeLevelStatuses(
    orderedLevelIds: readonly string[],
    completedLevelIds: ReadonlySet<string>,
    { open = true }: { open?: boolean } = {},
): Map<string, LevelStatus> {
    const statuses = new Map<string, LevelStatus>();

    orderedLevelIds.forEach((id, i) => {
        const previous = orderedLevelIds[i - 1];
        if (completedLevelIds.has(id)) statuses.set(id, "completed");
        else if (open && (previous === undefined || completedLevelIds.has(previous))) statuses.set(id, "available");
        else statuses.set(id, "locked");
    });

    return statuses;
}

/**
 * Statuts d'un parcours en mondes : le premier monde est ouvert ; chaque monde entièrement
 * restauré ouvre le suivant. Dans un monde scellé, seules les énigmes déjà résolues
 * (par exemple avant l'ajout d'une énigme) gardent leur statut « résolue ».
 * Les mondes sans énigme publiée sont ignorés par l'appelant.
 */
export function computeJourney(worlds: readonly JourneyWorld[], completedLevelIds: ReadonlySet<string>): JourneyStatuses {
    const worldStatuses = new Map<string, LevelStatus>();
    const levelStatuses = new Map<string, LevelStatus>();
    let previousCompleted = true;

    for (const world of worlds) {
        const completed = world.levelIds.length > 0 && world.levelIds.every((id) => completedLevelIds.has(id));
        const open = previousCompleted;

        worldStatuses.set(world.id, completed ? "completed" : open ? "available" : "locked");
        for (const [id, status] of computeLevelStatuses(world.levelIds, completedLevelIds, { open })) {
            levelStatuses.set(id, status);
        }
        previousCompleted = completed;
    }

    return { worlds: worldStatuses, levels: levelStatuses };
}
