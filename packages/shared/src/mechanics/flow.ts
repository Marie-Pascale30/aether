import { createRng } from "../rng";
import { DIRECTIONS, neighbor, type MechanicIssue } from "./issues";

/**
 * FLUX — relier chaque paire de sources de même nature par un chemin, sans croiser les autres
 * flux. Avec `fill`, toute la grille doit être parcourue : rien ne doit rester bloqué.
 *
 * Chaque flux a un symbole (et une couleur) : l'identité ne repose jamais sur la couleur seule.
 */
export interface FlowPuzzle {
    columns: number;
    rows: number;
    /** Une paire de sources par flux. */
    endpoints: { a: number; b: number }[];
    fill: boolean;
    /** Une solution connue (générateur) : sert aux aides, jamais montrée telle quelle. */
    solution?: number[][];
}

/** Chemin tracé par flux, de l'une de ses sources vers l'autre. */
export type FlowPaths = number[][];

export const FLOW_LIMITS = { sizeMin: 3, sizeMax: 9, flowsMax: 6 } as const;

export const flowAdjacent = (a: number, b: number, columns: number) =>
    (Math.abs(a - b) === 1 && Math.floor(a / columns) === Math.floor(b / columns)) || Math.abs(a - b) === columns;

export function validateFlow(p: FlowPuzzle): MechanicIssue[] {
    const issues: MechanicIssue[] = [];
    const size = p.columns * p.rows;
    const { sizeMin, sizeMax, flowsMax } = FLOW_LIMITS;
    if (p.columns < sizeMin || p.columns > sizeMax || p.rows < sizeMin || p.rows > sizeMax) {
        issues.push({ path: ["columns"], message: `La grille fait entre ${sizeMin} et ${sizeMax} cases de côté.` });
    }
    if (p.endpoints.length < 1 || p.endpoints.length > flowsMax) {
        issues.push({ path: ["endpoints"], message: `Entre 1 et ${flowsMax} flux.` });
    }
    const used = new Set<number>();
    p.endpoints.forEach(({ a, b }, i) => {
        for (const cell of [a, b]) {
            if (cell < 0 || cell >= size) issues.push({ path: ["endpoints", i], message: `Le flux ${i + 1} sort de la grille.` });
            else if (used.has(cell)) issues.push({ path: ["endpoints", i], message: `Deux sources partagent la case ${cell + 1}.` });
            used.add(cell);
        }
    });
    if (p.solution && issues.length === 0 && !flowSolved(p, p.solution)) {
        issues.push({ path: ["solution"], message: "La solution fournie ne résout pas l'énigme." });
    }
    return issues;
}

/** Flux propriétaire de chaque case (-1 = libre). */
export function flowOwners(p: FlowPuzzle, paths: FlowPaths): number[] {
    const owners = Array<number>(p.columns * p.rows).fill(-1);
    paths.forEach((path, flow) => path.forEach((cell) => (owners[cell] = flow)));
    return owners;
}

const isComplete = (p: FlowPuzzle, path: readonly number[] | undefined, flow: number) => {
    if (!path || path.length < 2) return false;
    const { a, b } = p.endpoints[flow]!;
    const ends = [path[0], path[path.length - 1]];
    return ends.includes(a) && ends.includes(b) && path.every((cell, i) => i === 0 || flowAdjacent(path[i - 1]!, cell, p.columns));
};

export const flowConnected = (p: FlowPuzzle, paths: FlowPaths) => p.endpoints.filter((_, flow) => isComplete(p, paths[flow], flow)).length;

export function flowSolved(p: FlowPuzzle, paths: FlowPaths): boolean {
    if (!p.endpoints.every((_, flow) => isComplete(p, paths[flow], flow))) return false;
    const owners = Array<number>(p.columns * p.rows).fill(-1);
    for (const [flow, path] of paths.entries()) {
        for (const cell of path) {
            if (owners[cell] !== -1) return false; // deux flux se croisent
            owners[cell] = flow;
        }
    }
    return !p.fill || owners.every((owner) => owner !== -1);
}

/**
 * Prolonge le flux `flow` jusqu'à `cell`, selon les règles du tracé :
 *   - on part d'une de ses sources (le tracé recommence) ou de l'extrémité du tracé ;
 *   - revenir sur son propre tracé le raccourcit ;
 *   - passer sur un autre flux le coupe à cet endroit ;
 *   - on ne traverse jamais la source d'un autre flux, ni au-delà de sa propre arrivée.
 * Renvoie les nouveaux tracés, ou `null` si le mouvement est impossible.
 */
export function flowExtend(p: FlowPuzzle, paths: FlowPaths, flow: number, cell: number): FlowPaths | null {
    const { a, b } = p.endpoints[flow]!;
    const otherSource = p.endpoints.some((ends, other) => other !== flow && (ends.a === cell || ends.b === cell));
    if (otherSource) return null;

    const next = paths.map((path) => [...path]);
    const path = next[flow] ?? [];

    if (cell === a || cell === b) {
        // Toucher une source : on (re)commence, ou on termine si le tracé vient de l'autre source.
        if (path.length > 0 && path[path.length - 1] !== cell && flowAdjacent(path[path.length - 1]!, cell, p.columns) && path[0] !== cell) {
            next[flow] = [...path, cell];
        } else if (path.indexOf(cell) > 0) {
            next[flow] = path.slice(0, path.indexOf(cell) + 1);
        } else {
            next[flow] = [cell];
        }
        return clearCell(next, flow, cell);
    }

    if (path.length === 0) return null;
    const own = path.indexOf(cell);
    if (own !== -1) {
        next[flow] = path.slice(0, own + 1);
        return next;
    }
    const tail = path[path.length - 1]!;
    if (!flowAdjacent(tail, cell, p.columns)) return null;
    if (isComplete(p, path, flow)) return null; // le flux est déjà relié
    next[flow] = [...path, cell];
    return clearCell(next, flow, cell);
}

/** Coupe les autres flux qui passaient par cette case. */
function clearCell(paths: FlowPaths, flow: number, cell: number): FlowPaths {
    return paths.map((path, other) => {
        if (other === flow) return path;
        const at = path.indexOf(cell);
        return at === -1 ? path : path.slice(0, at);
    });
}

/**
 * Grille procédurale à remplissage complet, toujours soluble : un chemin qui passe par toutes
 * les cases (serpentin), déformé par des mouvements « backbite », puis découpé en flux.
 */
export function generateFlow(seed: number | string, difficulty: number): FlowPuzzle {
    const rng = createRng(seed);
    const d = Math.min(10, Math.max(1, Math.round(difficulty)));
    const columns = Math.min(FLOW_LIMITS.sizeMax, 4 + Math.floor(d / 2));
    const rows = columns;
    const size = columns * rows;

    // Serpentin initial.
    let path: number[] = [];
    for (let y = 0; y < rows; y++) {
        for (let i = 0; i < columns; i++) path.push(y * columns + (y % 2 === 0 ? i : columns - 1 - i));
    }

    // Backbite : on relie une extrémité à un voisin et on inverse le morceau, pour varier la forme.
    for (let step = 0; step < size * 40; step++) {
        if (rng.next() < 0.5) path.reverse();
        const end = path[path.length - 1]!;
        const dir = rng.pick(DIRECTIONS);
        const target = neighbor(end, columns, rows, dir.dx, dir.dy);
        if (target === -1) continue;
        const at = path.indexOf(target);
        if (at === path.length - 2) continue;
        path = [...path.slice(0, at + 1), ...path.slice(at + 1).reverse()];
    }

    // Découpe en flux de longueurs variées (au moins 3 cases chacun).
    const flows = Math.min(FLOW_LIMITS.flowsMax, Math.max(2, Math.round(size / (9 - Math.min(5, Math.floor(d / 2))))));
    const cuts = new Set<number>();
    while (cuts.size < flows - 1) {
        const cut = rng.int(3, size - 3);
        if ([...cuts].every((other) => Math.abs(other - cut) >= 3)) cuts.add(cut);
    }
    const bounds = [0, ...[...cuts].sort((x, y) => x - y), size];
    const solution = bounds.slice(1).map((end, i) => path.slice(bounds[i], end));

    return {
        columns,
        rows,
        fill: true,
        endpoints: solution.map((segment) => ({ a: segment[0]!, b: segment[segment.length - 1]! })),
        solution,
    };
}
