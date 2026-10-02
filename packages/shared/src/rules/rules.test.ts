import { describe, expect, it } from "vitest";
import { GARDEN_STAGE_COUNT } from "../constants";
import { levelInputSchema } from "../schemas";
import { gardenStage } from "./garden";
import { findPairIndex, validateLevelDefinition } from "./levels";
import { computeStars, isBetterResult } from "./scoring";
import { computeLevelStatuses } from "./unlock";

describe("computeStars", () => {
    it("donne 3 étoiles à une résolution parfaite", () => {
        expect(computeStars({ mistakes: 0, hintsUsed: 0 })).toBe(3);
    });
    it("donne 2 étoiles avec peu d'erreurs ou un indice", () => {
        expect(computeStars({ mistakes: 2, hintsUsed: 0 })).toBe(2);
        expect(computeStars({ mistakes: 0, hintsUsed: 1 })).toBe(2);
    });
    it("donne 1 étoile au-delà", () => {
        expect(computeStars({ mistakes: 3, hintsUsed: 0 })).toBe(1);
        expect(computeStars({ mistakes: 0, hintsUsed: 2 })).toBe(1);
    });
});

describe("isBetterResult", () => {
    it("préfère plus d'étoiles, puis le temps le plus court", () => {
        expect(isBetterResult({ stars: 2, durationMs: 9000 }, null)).toBe(true);
        expect(isBetterResult({ stars: 3, durationMs: 9000 }, { stars: 2, durationMs: 1000 })).toBe(true);
        expect(isBetterResult({ stars: 2, durationMs: 900 }, { stars: 2, durationMs: 1000 })).toBe(true);
        expect(isBetterResult({ stars: 2, durationMs: 1000 }, { stars: 2, durationMs: 1000 })).toBe(false);
        expect(isBetterResult({ stars: 1, durationMs: 10 }, { stars: 2, durationMs: 1000 })).toBe(false);
    });
});

describe("gardenStage", () => {
    it("croît de façon monotone et réserve le dernier stade à la fin", () => {
        const stages = Array.from({ length: 11 }, (_, n) => gardenStage(n, 10));
        expect(stages[0]).toBe(0);
        expect(stages[10]).toBe(GARDEN_STAGE_COUNT - 1);
        expect(stages[9]).toBeLessThan(GARDEN_STAGE_COUNT - 1);
        stages.slice(1).forEach((stage, i) => expect(stage).toBeGreaterThanOrEqual(stages[i]!));
    });
    it("gère un parcours vide", () => {
        expect(gardenStage(0, 0)).toBe(0);
    });
});

describe("validateLevelDefinition", () => {
    const symbols = ["○", "✦", "△", "○"];

    it("accepte une énigme cohérente", () => {
        expect(validateLevelDefinition({ symbols, pairs: [[0, 3]] })).toEqual([]);
    });
    it("refuse une case hors plateau", () => {
        expect(validateLevelDefinition({ symbols, pairs: [[0, 9]] })).toHaveLength(1);
    });
    it("refuse une case utilisée deux fois", () => {
        expect(validateLevelDefinition({ symbols, pairs: [[0, 0]] })).toHaveLength(1);
        expect(validateLevelDefinition({ symbols, pairs: [[0, 1], [1, 2]] })).toHaveLength(1);
    });
    it("est appliquée par le schéma de l'éditeur", () => {
        const base = { title: "T", description: "D", hints: ["h"], symbols, columns: 4, published: true };
        expect(levelInputSchema.safeParse({ ...base, pairs: [[0, 3]] }).success).toBe(true);
        expect(levelInputSchema.safeParse({ ...base, pairs: [[0, 9]] }).success).toBe(false);
    });
});

describe("findPairIndex", () => {
    const pairs: [number, number][] = [[0, 5], [1, 3]];

    it("trouve une paire dans les deux sens", () => {
        expect(findPairIndex(pairs, [], 5, 0)).toBe(0);
        expect(findPairIndex(pairs, [], 1, 3)).toBe(1);
    });
    it("ignore les paires déjà trouvées et les mauvaises paires", () => {
        expect(findPairIndex(pairs, [0], 0, 5)).toBe(-1);
        expect(findPairIndex(pairs, [], 0, 1)).toBe(-1);
    });
});

describe("computeLevelStatuses", () => {
    it("ouvre la première énigme et la suivante de chaque énigme résolue", () => {
        const statuses = computeLevelStatuses(["a", "b", "c", "d"], new Set(["a"]));
        expect([...statuses.values()]).toEqual(["completed", "available", "locked", "locked"]);
    });
    it("garde résolue une énigme dont la précédente vient d'être insérée", () => {
        const statuses = computeLevelStatuses(["a", "new", "b"], new Set(["a", "b"]));
        expect([...statuses.values()]).toEqual(["completed", "available", "completed"]);
    });
});
