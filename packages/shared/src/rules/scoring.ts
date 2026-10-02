export interface Performance {
    mistakes: number;
    hintsUsed: number;
}

export interface TimedResult {
    stars: number;
    durationMs: number;
}

/**
 * Barème des étoiles :
 *   ★★★  aucune erreur et aucun indice
 *   ★★   au plus 2 erreurs et au plus 1 indice
 *   ★    énigme résolue
 */
export function computeStars({ mistakes, hintsUsed }: Performance): 1 | 2 | 3 {
    if (mistakes === 0 && hintsUsed === 0) return 3;
    if (mistakes <= 2 && hintsUsed <= 1) return 2;
    return 1;
}

/** Plus d'étoiles gagne ; à égalité, le temps le plus court. */
export function isBetterResult(candidate: TimedResult, best: TimedResult | null): boolean {
    if (!best) return true;
    if (candidate.stars !== best.stars) return candidate.stars > best.stars;
    return candidate.durationMs < best.durationMs;
}
