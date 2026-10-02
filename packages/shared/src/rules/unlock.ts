import type { LevelStatus } from "../types";

/**
 * Statut de chaque énigme d'un parcours ordonné : la première est toujours ouverte,
 * les suivantes s'ouvrent quand la précédente est résolue. Une énigme résolue le reste,
 * même si une nouvelle énigme est insérée avant elle.
 */
export function computeLevelStatuses(
    orderedLevelIds: readonly string[],
    completedLevelIds: ReadonlySet<string>,
): Map<string, LevelStatus> {
    const statuses = new Map<string, LevelStatus>();

    orderedLevelIds.forEach((id, i) => {
        const previous = orderedLevelIds[i - 1];
        if (completedLevelIds.has(id)) statuses.set(id, "completed");
        else if (previous === undefined || completedLevelIds.has(previous)) statuses.set(id, "available");
        else statuses.set(id, "locked");
    });

    return statuses;
}
