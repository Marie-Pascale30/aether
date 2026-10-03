import { describe, expect, it } from "vitest";
import { GARDEN_STAGE_COUNT } from "../constants";
import { attemptSchema, levelInputSchema } from "../schemas";
import { gardenStage } from "./garden";
import { findGroupIndex, matchesGroup, validateLevelDefinition } from "./levels";
import { computeStars, isBetterResult } from "./scoring";
import { computeJourney, computeLevelStatuses } from "./unlock";

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
    it("gère un monde vide", () => {
        expect(gardenStage(0, 0)).toBe(0);
    });
});

describe("validateLevelDefinition", () => {
    const symbols = ["○", "✦", "△", "○", "□", "◇"];

    it("accepte une énigme cohérente de chaque genre", () => {
        expect(validateLevelDefinition({ kind: "PAIRS", symbols, groups: [[0, 3]] })).toEqual([]);
        expect(validateLevelDefinition({ kind: "GROUPS", symbols, groups: [[0, 1, 2]] })).toEqual([]);
        expect(validateLevelDefinition({ kind: "SEQUENCE", symbols, groups: [[2, 0, 4, 5]] })).toEqual([]);
    });
    it("refuse une taille de groupe interdite pour le genre", () => {
        expect(validateLevelDefinition({ kind: "PAIRS", symbols, groups: [[0, 1, 2]] })).toHaveLength(1);
        expect(validateLevelDefinition({ kind: "GROUPS", symbols, groups: [[0, 1]] })).toHaveLength(1);
    });
    it("refuse des groupes de tailles différentes", () => {
        expect(validateLevelDefinition({ kind: "GROUPS", symbols, groups: [[0, 1, 2], [3, 4, 5, 1]] }).length).toBeGreaterThan(0);
    });
    it("refuse une case hors plateau ou utilisée deux fois", () => {
        expect(validateLevelDefinition({ kind: "PAIRS", symbols, groups: [[0, 9]] })).toHaveLength(1);
        expect(validateLevelDefinition({ kind: "PAIRS", symbols, groups: [[0, 0]] })).toHaveLength(1);
        expect(validateLevelDefinition({ kind: "PAIRS", symbols, groups: [[0, 1], [1, 2]] })).toHaveLength(1);
    });
    it("est appliquée par le schéma de l'éditeur", () => {
        const base = { worldId: "w", kind: "PAIRS", title: "T", description: "D", hints: ["h"], symbols, columns: 3, published: true };
        expect(levelInputSchema.safeParse({ ...base, groups: [[0, 3]] }).success).toBe(true);
        expect(levelInputSchema.safeParse({ ...base, groups: [[0, 9]] }).success).toBe(false);
    });
});

describe("matchesGroup / findGroupIndex", () => {
    it("ignore l'ordre pour des paires et des groupes", () => {
        expect(matchesGroup([0, 5], [5, 0], false)).toBe(true);
        expect(matchesGroup([1, 2, 3], [3, 1, 2], false)).toBe(true);
        expect(matchesGroup([1, 2, 3], [1, 2], false)).toBe(false);
    });
    it("exige l'ordre exact pour une suite", () => {
        expect(matchesGroup([4, 1, 7], [4, 1, 7], true)).toBe(true);
        expect(matchesGroup([4, 1, 7], [7, 1, 4], true)).toBe(false);
    });
    it("ignore les groupes déjà trouvés", () => {
        const groups = [[0, 5], [1, 3]];
        expect(findGroupIndex(groups, [], [3, 1], false)).toBe(1);
        expect(findGroupIndex(groups, [0], [0, 5], false)).toBe(-1);
        expect(findGroupIndex(groups, [], [0, 1], false)).toBe(-1);
    });
    it("refuse un coup qui choisit deux fois la même case", () => {
        expect(attemptSchema.safeParse({ cells: [1, 1] }).success).toBe(false);
        expect(attemptSchema.safeParse({ cells: [1, 2, 3] }).success).toBe(true);
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

describe("computeJourney", () => {
    const worlds = [
        { id: "w1", levelIds: ["a", "b"] },
        { id: "w2", levelIds: ["c", "d"] },
        { id: "w3", levelIds: ["e"] },
    ];

    it("scelle les mondes suivants tant que le premier n'est pas assez avancé", () => {
        const { worlds: w, levels } = computeJourney(worlds, new Set(["a"]));
        expect([...w.values()]).toEqual(["available", "locked", "locked"]);
        expect(levels.get("b")).toBe("available");
        expect(levels.get("c")).toBe("locked");
    });
    it("ouvre le monde suivant quand le précédent est restauré (moins de 3 énigmes)", () => {
        const { worlds: w, levels } = computeJourney(worlds, new Set(["a", "b"]));
        expect([...w.values()]).toEqual(["completed", "available", "locked"]);
        expect(levels.get("c")).toBe("available");
        expect(levels.get("d")).toBe("locked");
    });
    it("ouvre le monde suivant après 3 énigmes, sans attendre la fin du monde", () => {
        const big = [{ id: "w1", levelIds: ["a", "b", "c", "d", "e"] }, { id: "w2", levelIds: ["f"] }];
        expect(computeJourney(big, new Set(["a", "b"])).worlds.get("w2")).toBe("locked");
        const { worlds: w } = computeJourney(big, new Set(["a", "b", "c"]));
        expect([...w.values()]).toEqual(["available", "available"]);
    });
    it("ne saute pas un monde scellé, même avec des énigmes résolues plus loin", () => {
        const big = [{ id: "w1", levelIds: ["a", "b", "c"] }, { id: "w2", levelIds: ["d", "e", "f"] }, { id: "w3", levelIds: ["g"] }];
        expect(computeJourney(big, new Set(["d", "e", "f"])).worlds.get("w3")).toBe("locked");
    });
});
