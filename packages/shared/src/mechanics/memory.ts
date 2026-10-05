import { createRng } from "../rng";
import type { MechanicIssue } from "./issues";

/**
 * MÉMOIRES — observer un plateau, puis retrouver où se trouvait chaque symbole demandé.
 * L'observation dure le temps que le joueur souhaite (pas de compte à rebours) ; en variante
 * « progressive », les symboles s'effacent un à un pendant qu'on les regarde.
 */
export interface MemoryPuzzle {
    columns: number;
    /** Contenu des cases ; `null` = case vide. */
    cells: (string | null)[];
    /** Cases à retrouver, dans l'ordre des questions. Chaque symbole demandé est unique sur le plateau. */
    targets: number[];
    progressive?: boolean;
}

export interface MemoryState {
    phase: "observe" | "recall" | "done";
    /** Question en cours (index dans `targets`). */
    step: number;
    mistakes: number;
    /** Cases déjà retrouvées. */
    found: number[];
}

export type MemoryAnswer = { correct: true; state: MemoryState } | { correct: false; state: MemoryState };

export const MEMORY_LIMITS = { columnsMin: 2, columnsMax: 6, cellsMin: 4, cellsMax: 30 } as const;

export function validateMemory(p: MemoryPuzzle): MechanicIssue[] {
    const issues: MechanicIssue[] = [];
    if (p.columns < MEMORY_LIMITS.columnsMin || p.columns > MEMORY_LIMITS.columnsMax) {
        issues.push({ path: ["columns"], message: `Entre ${MEMORY_LIMITS.columnsMin} et ${MEMORY_LIMITS.columnsMax} colonnes.` });
    }
    if (p.cells.length < MEMORY_LIMITS.cellsMin || p.cells.length > MEMORY_LIMITS.cellsMax) {
        issues.push({ path: ["cells"], message: `Entre ${MEMORY_LIMITS.cellsMin} et ${MEMORY_LIMITS.cellsMax} cases.` });
    }
    if (p.targets.length === 0) issues.push({ path: ["targets"], message: "Au moins un symbole à retrouver." });

    p.targets.forEach((cell, i) => {
        const symbol = p.cells[cell];
        if (symbol == null) {
            issues.push({ path: ["targets", i], message: `La question ${i + 1} désigne une case vide ou inexistante.` });
            return;
        }
        // Un symbole présent deux fois rendrait la question ambiguë.
        if (p.cells.filter((s) => s === symbol).length > 1) {
            issues.push({ path: ["targets", i], message: `« ${symbol} » apparaît plusieurs fois : la question ${i + 1} serait ambiguë.` });
        }
    });
    if (new Set(p.targets).size !== p.targets.length) issues.push({ path: ["targets"], message: "Une case est demandée deux fois." });
    return issues;
}

export const memoryStart = (): MemoryState => ({ phase: "observe", step: 0, mistakes: 0, found: [] });

export const memoryBeginRecall = (state: MemoryState): MemoryState => ({ ...state, phase: "recall" });

/** Symbole demandé à l'étape en cours. */
export const memoryPrompt = (p: MemoryPuzzle, state: MemoryState): string | null =>
    state.phase === "recall" ? (p.cells[p.targets[state.step]!] ?? null) : null;

export function memoryAnswer(p: MemoryPuzzle, state: MemoryState, cell: number): MemoryAnswer {
    if (state.phase !== "recall" || state.found.includes(cell)) return { correct: false, state };
    const target = p.targets[state.step];
    if (cell !== target) return { correct: false, state: { ...state, mistakes: state.mistakes + 1 } };

    const step = state.step + 1;
    return {
        correct: true,
        state: { ...state, step, found: [...state.found, cell], phase: step >= p.targets.length ? "done" : "recall" },
    };
}

const MEMORY_SYMBOLS = ["☀", "☾", "✦", "❄", "🔥", "💧", "🌱", "🍂", "🐚", "🦋", "⭐", "🌸", "🪶", "🍄", "🌊", "🪨", "🔔", "🗝", "📜", "🕯"];

/**
 * Plateau procédural. `difficulty` de 1 à 10 : plus de cases, plus de questions, puis la
 * variante progressive et quelques cases vides qui brouillent les repères.
 */
export function generateMemory(seed: number | string, difficulty: number): MemoryPuzzle {
    const rng = createRng(seed);
    const d = Math.min(10, Math.max(1, Math.round(difficulty)));
    const columns = d <= 3 ? 3 : d <= 7 ? 4 : 5;
    const rows = d <= 2 ? 2 : d <= 5 ? 3 : 4;
    const size = columns * rows;
    const empties = d >= 6 ? Math.min(3, d - 5) : 0;
    const symbols = rng.shuffle(MEMORY_SYMBOLS).slice(0, size - empties);
    const cells = rng.shuffle([...symbols, ...Array<null>(empties).fill(null)]);
    const filled = cells.flatMap((symbol, i) => (symbol ? [i] : []));
    const questions = Math.min(filled.length, 2 + Math.ceil(d / 2));

    return { columns, cells, targets: rng.shuffle(filled).slice(0, questions), progressive: d >= 4 };
}
