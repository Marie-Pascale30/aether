import type { LocalMechanic } from "../mechanics";
import { facultyOf, type Faculty } from "./mind";

/**
 * La Promenade : des énigmes générées sans fin, qui s'ajustent à la façon de jouer. Chaque
 * mécanique garde sa propre difficulté (1 à 10) : elle monte d'un cran après une énigme résolue
 * sans inspiration ni fausse piste, redescend après une énigme qui a résisté, et ne bouge pas sinon.
 */
export const PROMENADE_MECHANICS: readonly LocalMechanic[] = ["MEMORY", "GEARS", "FLOW", "ECHOES", "CHIMES"];

export const PROMENADE_DIFFICULTY = { min: 1, max: 10, start: 2 } as const;

/** Fausses pistes à partir desquelles une énigme « a résisté ». */
const STRUGGLE_MISTAKES = 3;

export interface PromenadeState {
    difficulty: Record<LocalMechanic, number>;
    /** Énigmes résolues en Promenade (sert aussi de graine : chaque énigme est nouvelle). */
    solved: number;
    last: LocalMechanic | null;
}

export const promenadeStart = (): PromenadeState => ({
    difficulty: Object.fromEntries(PROMENADE_MECHANICS.map((m) => [m, PROMENADE_DIFFICULTY.start])) as Record<LocalMechanic, number>,
    solved: 0,
    last: null,
});

export function adaptDifficulty(current: number, { mistakes, hintsUsed }: { mistakes: number; hintsUsed: number }): number {
    const next = mistakes === 0 && hintsUsed === 0 ? current + 1 : mistakes >= STRUGGLE_MISTAKES || hintsUsed > 0 ? current - 1 : current;
    return Math.max(PROMENADE_DIFFICULTY.min, Math.min(PROMENADE_DIFFICULTY.max, next));
}

/**
 * Prochaine mécanique : celle dont la faculté est la moins pratiquée (profil mental), jamais la
 * même deux fois de suite. `practice` : pratique par faculté (plus c'est bas, plus on la propose).
 */
export function nextPromenadeMechanic(state: PromenadeState, practice: Partial<Record<Faculty, number>> = {}): LocalMechanic {
    const candidates = PROMENADE_MECHANICS.filter((mechanic) => mechanic !== state.last);
    const weight = (mechanic: LocalMechanic) => practice[facultyOf({ mechanic, kind: "PAIRS" })] ?? 0;
    // À pratique égale, on suit l'ordre de la liste en tournant à partir du nombre d'énigmes résolues.
    const rotation = (mechanic: LocalMechanic) => (PROMENADE_MECHANICS.indexOf(mechanic) - state.solved + 100) % PROMENADE_MECHANICS.length;
    return [...candidates].sort((a, b) => weight(a) - weight(b) || rotation(a) - rotation(b))[0]!;
}

export function recordPromenadeWin(
    state: PromenadeState,
    mechanic: LocalMechanic,
    performance: { mistakes: number; hintsUsed: number },
): PromenadeState {
    return {
        difficulty: { ...state.difficulty, [mechanic]: adaptDifficulty(state.difficulty[mechanic], performance) },
        solved: state.solved + 1,
        last: mechanic,
    };
}
