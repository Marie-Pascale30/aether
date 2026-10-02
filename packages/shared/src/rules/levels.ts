import type { Pair } from "../types";

export interface LevelDefinition {
    symbols: readonly string[];
    pairs: readonly (readonly [number, number])[];
}

export interface LevelIssue {
    path: (string | number)[];
    message: string;
}

/**
 * Cohérence structurelle d'une énigme : chaque indice de paire désigne une case existante,
 * et une case n'appartient qu'à une seule paire (sinon l'énigme est insoluble ou ambiguë).
 */
export function validateLevelDefinition(level: LevelDefinition): LevelIssue[] {
    const issues: LevelIssue[] = [];
    const owner = new Map<number, number>();

    level.pairs.forEach((pair, p) => {
        pair.forEach((cell, side) => {
            const path = ["pairs", p, side];
            if (cell >= level.symbols.length) {
                issues.push({ path, message: `La paire ${p + 1} désigne la case ${cell + 1}, hors du plateau.` });
                return;
            }
            const previous = owner.get(cell);
            if (previous !== undefined) {
                const where = previous === p ? "cette même paire" : `la paire ${previous + 1}`;
                issues.push({ path, message: `La case ${cell + 1} (« ${level.symbols[cell]} ») appartient déjà à ${where}.` });
                return;
            }
            owner.set(cell, p);
        });
    });

    return issues;
}

export function isSamePair([a, b]: readonly [number, number], [x, y]: readonly [number, number]): boolean {
    return (a === x && b === y) || (a === y && b === x);
}

/** Index de la paire `{a, b}` parmi celles pas encore trouvées, ou -1. */
export function findPairIndex(
    pairs: readonly (readonly [number, number])[],
    found: readonly number[],
    a: number,
    b: number,
): number {
    return pairs.findIndex((pair, i) => !found.includes(i) && isSamePair(pair, [a, b]));
}

export function pairsAt(pairs: readonly Pair[], indexes: readonly number[]): Pair[] {
    return indexes.flatMap((i) => (pairs[i] ? [pairs[i]] : []));
}
