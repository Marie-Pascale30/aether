import { z } from "zod";

/** Structure de chaque plateau ; la cohérence (solvabilité, ambiguïtés) est vérifiée ensuite par les validateurs. */
const index = z.number().int().min(0);

export const memoryPuzzleSchema = z.object({
    columns: z.number().int(),
    cells: z.array(z.string().trim().min(1).max(8).nullable()),
    targets: z.array(index),
    progressive: z.boolean().optional(),
});

export const gearsPuzzleSchema = z.object({
    columns: z.number().int(),
    rows: z.number().int(),
    tiles: z.array(z.object({ mask: z.number().int(), rotation: z.number().int().min(0).max(3), fixed: z.boolean().optional() })),
    source: index,
});

export const flowPuzzleSchema = z.object({
    columns: z.number().int(),
    rows: z.number().int(),
    endpoints: z.array(z.object({ a: index, b: index })),
    fill: z.boolean(),
    solution: z.array(z.array(index)).optional(),
});

export const echoesPuzzleSchema = z.object({
    examples: z.array(z.object({ from: z.string().max(40), to: z.string().max(40) })),
    question: z.string().max(40),
    options: z.array(z.string().trim().min(1).max(40)),
    answer: z.number().int(),
    explanation: z.string().max(200),
});

export const PUZZLE_SCHEMAS = {
    MEMORY: memoryPuzzleSchema,
    GEARS: gearsPuzzleSchema,
    FLOW: flowPuzzleSchema,
    ECHOES: echoesPuzzleSchema,
} as const;
