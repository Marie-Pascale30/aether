/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) : une même graine donne le même
 * plateau sur tous les appareils, en ligne ou non (énigme du jour, niveaux procéduraux).
 */
export interface Rng {
    /** Réel dans [0, 1[. */
    next(): number;
    /** Entier dans [min, max] (bornes incluses). */
    int(min: number, max: number): number;
    pick<T>(items: readonly T[]): T;
    shuffle<T>(items: readonly T[]): T[];
}

/** Graine numérique à partir d'un texte (FNV-1a 32 bits). */
export function seedFrom(text: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

export function createRng(seed: number | string): Rng {
    let state = (typeof seed === "string" ? seedFrom(seed) : seed) >>> 0;

    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));

    return {
        next,
        int,
        pick: (items) => items[int(0, items.length - 1)]!,
        shuffle: (items) => {
            const copy = [...items];
            for (let i = copy.length - 1; i > 0; i--) {
                const j = int(0, i);
                [copy[i], copy[j]] = [copy[j]!, copy[i]!];
            }
            return copy;
        },
    };
}
