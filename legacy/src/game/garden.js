import { GARDEN_STAGES } from "../config.js";

/**
 * Stade visuel du jardin selon la progression : il ne fait que grandir,
 * du premier stade (rien de restauré) au dernier (toutes les énigmes résolues).
 */
export function gardenStage(restoredCount, totalLevels) {
    const last = GARDEN_STAGES.length - 1;
    const step = Math.ceil((restoredCount / totalLevels) * last);
    return GARDEN_STAGES[Math.min(step, last)];
}
