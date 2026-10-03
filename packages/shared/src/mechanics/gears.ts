import { createRng } from "../rng";
import { DIRECTIONS, neighbor, type MechanicIssue } from "./issues";

/**
 * ROUAGES — faire pivoter des pièces de conduit pour que la lumière parte de la source et
 * atteigne toutes les pièces, sans aucune fuite (une ouverture qui ne débouche sur rien).
 *
 * Ouvertures d'une pièce en bits : N=1, E=2, S=4, O=8. `mask` est l'orientation d'origine,
 * `rotation` le nombre de quarts de tour appliqués (0–3). Toute orientation sans fuite et
 * entièrement connectée est acceptée, pas seulement celle du générateur.
 */
export interface GearTile {
    mask: number;
    rotation: number;
    /** Pièce scellée : elle ne tourne pas (repère pour le joueur). */
    fixed?: boolean;
}

export interface GearsPuzzle {
    columns: number;
    rows: number;
    tiles: GearTile[];
    source: number;
}

export const GEARS_LIMITS = { sizeMin: 2, sizeMax: 8 } as const;

/** Ouvertures après `rotation` quarts de tour dans le sens horaire. */
export function rotateMask(mask: number, rotation: number): number {
    const r = ((rotation % 4) + 4) % 4;
    return ((mask << r) | (mask >> (4 - r))) & 15;
}

export const openings = (tile: GearTile) => rotateMask(tile.mask, tile.rotation);

export function validateGears(p: GearsPuzzle): MechanicIssue[] {
    const issues: MechanicIssue[] = [];
    const { sizeMin, sizeMax } = GEARS_LIMITS;
    if (p.columns < sizeMin || p.columns > sizeMax || p.rows < sizeMin || p.rows > sizeMax) {
        issues.push({ path: ["columns"], message: `La grille fait entre ${sizeMin} et ${sizeMax} cases de côté.` });
    }
    if (p.tiles.length !== p.columns * p.rows) issues.push({ path: ["tiles"], message: "Il faut une pièce par case." });
    if (!p.tiles[p.source] || p.tiles[p.source]!.mask === 0) issues.push({ path: ["source"], message: "La source doit être une pièce non vide." });
    p.tiles.forEach((tile, i) => {
        if (!Number.isInteger(tile.mask) || tile.mask < 0 || tile.mask > 15) issues.push({ path: ["tiles", i], message: `Pièce ${i + 1} invalide.` });
    });
    if (issues.length === 0 && !hasSolution(p)) {
        issues.push({ path: ["tiles"], message: "Aucune orientation ne relie toutes les pièces sans fuite : énigme insoluble." });
    }
    return issues;
}

/** Pièces atteintes par la lumière depuis la source (connexions réciproques uniquement). */
export function litTiles(p: GearsPuzzle, rotations: readonly number[]): Set<number> {
    const lit = new Set<number>([p.source]);
    const queue = [p.source];
    while (queue.length) {
        const index = queue.shift()!;
        const open = rotateMask(p.tiles[index]!.mask, rotations[index]!);
        for (const dir of DIRECTIONS) {
            if (!(open & dir.bit)) continue;
            const next = neighbor(index, p.columns, p.rows, dir.dx, dir.dy);
            if (next === -1 || lit.has(next)) continue;
            if (rotateMask(p.tiles[next]!.mask, rotations[next]!) & dir.opposite) {
                lit.add(next);
                queue.push(next);
            }
        }
    }
    return lit;
}

export function gearsSolved(p: GearsPuzzle, rotations: readonly number[]): boolean {
    const lit = litTiles(p, rotations);
    for (let i = 0; i < p.tiles.length; i++) {
        const open = rotateMask(p.tiles[i]!.mask, rotations[i]!);
        if (open === 0) continue;
        if (!lit.has(i)) return false;
        for (const dir of DIRECTIONS) {
            if (!(open & dir.bit)) continue;
            const next = neighbor(i, p.columns, p.rows, dir.dx, dir.dy);
            // Fuite : ouverture vers le bord, ou vers une pièce qui ne répond pas.
            if (next === -1 || !(rotateMask(p.tiles[next]!.mask, rotations[next]!) & dir.opposite)) return false;
        }
    }
    return true;
}

/** Recherche exhaustive avec élagage (grilles de jeu : au plus 8×8). */
function hasSolution(p: GearsPuzzle): boolean {
    const rotations = p.tiles.map((tile) => tile.rotation);
    const choices = p.tiles.map((tile) => (tile.fixed ? [tile.rotation] : distinctRotations(tile.mask)));

    const consistent = (index: number) => {
        // Vérifie les bords et les voisins déjà fixés (au-dessus, à gauche).
        const open = rotateMask(p.tiles[index]!.mask, rotations[index]!);
        for (const dir of DIRECTIONS) {
            const next = neighbor(index, p.columns, p.rows, dir.dx, dir.dy);
            const wants = Boolean(open & dir.bit);
            if (next === -1) {
                if (wants) return false;
                continue;
            }
            if (next < index) {
                const answers = Boolean(rotateMask(p.tiles[next]!.mask, rotations[next]!) & dir.opposite);
                if (wants !== answers) return false;
            }
        }
        return true;
    };

    const search = (index: number): boolean => {
        if (index === p.tiles.length) return gearsSolved(p, rotations);
        for (const r of choices[index]!) {
            rotations[index] = r;
            if (consistent(index) && search(index + 1)) return true;
        }
        return false;
    };
    return search(0);
}

/** Rotations qui donnent des formes différentes (une croix n'a qu'une orientation). */
function distinctRotations(mask: number): number[] {
    const seen = new Set<number>();
    return [0, 1, 2, 3].filter((r) => {
        const shape = rotateMask(mask, r);
        if (seen.has(shape)) return false;
        seen.add(shape);
        return true;
    });
}

/**
 * Grille procédurale : arbre couvrant aléatoire (toujours soluble, toutes les cases utiles),
 * puis pièces tournées au hasard. `difficulty` 1–10 agrandit la grille et retire les pièces scellées.
 */
export function generateGears(seed: number | string, difficulty: number): GearsPuzzle {
    const rng = createRng(seed);
    const d = Math.min(10, Math.max(1, Math.round(difficulty)));
    const columns = Math.min(GEARS_LIMITS.sizeMax, 3 + Math.floor(d / 2));
    const rows = Math.min(GEARS_LIMITS.sizeMax, 3 + Math.floor((d - 1) / 2));
    const size = columns * rows;
    const masks = Array<number>(size).fill(0);

    // Parcours en profondeur aléatoire : chaque passage ouvre un conduit dans les deux cases.
    const visited = new Set<number>();
    const stack = [rng.int(0, size - 1)];
    visited.add(stack[0]!);
    while (stack.length) {
        const current = stack[stack.length - 1]!;
        const options = DIRECTIONS.filter((dir) => {
            const next = neighbor(current, columns, rows, dir.dx, dir.dy);
            return next !== -1 && !visited.has(next);
        });
        if (options.length === 0) {
            stack.pop();
            continue;
        }
        const dir = rng.pick(options);
        const next = neighbor(current, columns, rows, dir.dx, dir.dy);
        masks[current]! |= dir.bit;
        masks[next]! |= dir.opposite;
        visited.add(next);
        stack.push(next);
    }

    // La source : une pièce bien connectée, au centre de préférence.
    const source = [...masks.keys()].sort((a, b) => bitCount(masks[b]!) - bitCount(masks[a]!))[0]!;
    const fixedShare = d <= 2 ? 0.3 : d <= 5 ? 0.15 : 0;

    const tiles: GearTile[] = masks.map((mask, i) => {
        const fixed = i === source || rng.next() < fixedShare;
        return { mask, rotation: fixed ? 0 : rng.int(0, 3), fixed: fixed || undefined };
    });

    // Jamais déjà résolue au départ.
    const rotations = tiles.map((tile) => tile.rotation);
    if (gearsSolved({ columns, rows, tiles, source }, rotations)) {
        const movable = tiles.findIndex((tile) => !tile.fixed && distinctRotations(tile.mask).length > 1);
        if (movable !== -1) tiles[movable]!.rotation = (tiles[movable]!.rotation + 1) % 4;
    }
    return { columns, rows, tiles, source };
}

function bitCount(mask: number): number {
    let count = 0;
    for (let m = mask; m; m &= m - 1) count++;
    return count;
}
