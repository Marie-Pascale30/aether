import { GARDEN_STAGE_COUNT } from "../constants";

/**
 * Stade du jardin selon la progression. Il ne fait que croître, et le dernier stade
 * est réservé au parcours entièrement résolu.
 */
export function gardenStage(completedLevels: number, totalLevels: number): number {
    const last = GARDEN_STAGE_COUNT - 1;
    if (totalLevels <= 0 || completedLevels <= 0) return 0;
    if (completedLevels >= totalLevels) return last;
    return Math.ceil((completedLevels / totalLevels) * (last - 1));
}
