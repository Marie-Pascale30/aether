/** Problème de conception d'une énigme, au même format que les erreurs de validation de l'API. */
export interface MechanicIssue {
    path: (string | number)[];
    message: string;
}

/** Directions d'une grille, en bits : N=1, E=2, S=4, O=8. */
export const DIRECTIONS = [
    { bit: 1, dx: 0, dy: -1, opposite: 4 },
    { bit: 2, dx: 1, dy: 0, opposite: 8 },
    { bit: 4, dx: 0, dy: 1, opposite: 1 },
    { bit: 8, dx: -1, dy: 0, opposite: 2 },
] as const;

/** Case voisine dans une direction, ou -1 hors de la grille. */
export function neighbor(index: number, columns: number, rows: number, dx: number, dy: number): number {
    const x = (index % columns) + dx;
    const y = Math.floor(index / columns) + dy;
    return x < 0 || y < 0 || x >= columns || y >= rows ? -1 : y * columns + x;
}
