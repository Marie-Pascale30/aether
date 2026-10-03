/**
 * Harmonie d'une énigme : trois pétales, chacun récompensant une façon de jouer. Rien ne se
 * perd : les pétales cueillis s'additionnent d'une partie à l'autre, et un faux pas ou un
 * indice ne retire jamais rien, il laisse seulement un pétale à cueillir une autre fois.
 */
export const PETALS = {
    /** L'énigme est résolue. */
    SOLVED: 1,
    /** Résolue sans indice. */
    AUTONOMY: 2,
    /** Résolue sans fausse piste. */
    CLARITY: 4,
} as const;

export type PetalKey = keyof typeof PETALS;

export const PETAL_KEYS = Object.keys(PETALS) as PetalKey[];

export const PETAL_COPY: Record<PetalKey, { name: string; earned: string; open: string }> = {
    SOLVED: { name: "Éclosion", earned: "L'énigme est résolue.", open: "Résous l'énigme." },
    AUTONOMY: { name: "Autonomie", earned: "Trouvée sans indice.", open: "Trouve-la sans indice." },
    CLARITY: { name: "Clarté", earned: "Trouvée sans fausse piste.", open: "Trouve-la sans fausse piste." },
};

export const ALL_PETALS = PETALS.SOLVED | PETALS.AUTONOMY | PETALS.CLARITY;

export interface Performance {
    mistakes: number;
    hintsUsed: number;
}

/** Pétales cueillis par une partie résolue. */
export function petalsFor({ mistakes, hintsUsed }: Performance): number {
    return PETALS.SOLVED | (hintsUsed === 0 ? PETALS.AUTONOMY : 0) | (mistakes === 0 ? PETALS.CLARITY : 0);
}

/** Nombre de pétales d'un masque (0 à 3). */
export function petalCount(mask: number): number {
    return PETAL_KEYS.filter((key) => mask & PETALS[key]).length;
}

export const hasPetal = (mask: number, key: PetalKey) => (mask & PETALS[key]) !== 0;
