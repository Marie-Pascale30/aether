import { generateEchoes, validateEchoes, type EchoesPuzzle } from "./echoes";
import { generateFlow, validateFlow, type FlowPuzzle } from "./flow";
import { generateGears, validateGears, type GearsPuzzle } from "./gears";
import type { MechanicIssue } from "./issues";
import { generateMemory, validateMemory, type MemoryPuzzle } from "./memory";

export * from "./echoes";
export * from "./flow";
export * from "./gears";
export * from "./issues";
export * from "./memory";

/**
 * Mécaniques de jeu. LINKS (paires, familles, suites) est validée par le serveur coup par coup ;
 * les autres tournent entièrement sur l'appareil (prêtes pour le hors ligne) et seul le
 * résultat est envoyé.
 */
export const MECHANICS = ["LINKS", "MEMORY", "GEARS", "FLOW", "ECHOES"] as const;
export type Mechanic = (typeof MECHANICS)[number];
export type LocalMechanic = Exclude<Mechanic, "LINKS">;
export const LOCAL_MECHANICS: LocalMechanic[] = ["MEMORY", "GEARS", "FLOW", "ECHOES"];

export interface PuzzleByMechanic {
    MEMORY: MemoryPuzzle;
    GEARS: GearsPuzzle;
    FLOW: FlowPuzzle;
    ECHOES: EchoesPuzzle;
}

export type LocalPuzzle = PuzzleByMechanic[LocalMechanic];

const VALIDATORS: { [M in LocalMechanic]: (p: PuzzleByMechanic[M]) => MechanicIssue[] } = {
    MEMORY: validateMemory,
    GEARS: validateGears,
    FLOW: validateFlow,
    ECHOES: validateEchoes,
};

const GENERATORS: { [M in LocalMechanic]: (seed: number | string, difficulty: number) => PuzzleByMechanic[M] } = {
    MEMORY: generateMemory,
    GEARS: generateGears,
    FLOW: generateFlow,
    ECHOES: generateEchoes,
};

export function validatePuzzle<M extends LocalMechanic>(mechanic: M, puzzle: PuzzleByMechanic[M]): MechanicIssue[] {
    return VALIDATORS[mechanic](puzzle);
}

/** Énigme procédurale, identique pour une même graine sur tous les appareils. */
export function generatePuzzle<M extends LocalMechanic>(mechanic: M, seed: number | string, difficulty: number): PuzzleByMechanic[M] {
    return GENERATORS[mechanic](seed, difficulty);
}

export const isLocalMechanic = (mechanic: Mechanic): mechanic is LocalMechanic => mechanic !== "LINKS";
export * from "./schemas";
