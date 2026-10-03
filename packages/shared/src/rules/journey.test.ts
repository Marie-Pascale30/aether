import { describe, expect, it } from "vitest";
import type { ContentBundle, ContentLevel, LevelRecord } from "../types";
import { dailyOutcome } from "./daily";
import { buildJourney, describeWin, recordWin } from "./journey";
import { PETALS } from "./scoring";

const level = (id: string): ContentLevel => ({
    id,
    title: id,
    description: "",
    mechanic: "LINKS",
    kind: "PAIRS",
    symbols: ["a", "b", "c", "d"],
    columns: 2,
    groups: [[0, 1]],
    puzzle: null,
    hints: ["indice"],
});

const bundle: ContentBundle = {
    version: "v1",
    worlds: [
        { id: "w1", slug: "un", title: "Un", tagline: "", description: "", theme: "origines", levels: ["a", "b", "c", "d"].map(level) },
        { id: "w2", slug: "deux", title: "Deux", tagline: "", description: "", theme: "foret", levels: ["e", "f"].map(level) },
        { id: "empty", slug: "vide", title: "Vide", tagline: "", description: "", theme: "ocean", levels: [] },
    ],
    daily: { timeZone: "Europe/Paris", days: [{ date: "2026-10-04", world: { slug: "quotidien", title: "Jour", theme: "cosmos" }, level: level("jour") }] },
};

const records = (ids: string[], petals: number = PETALS.SOLVED) => new Map<string, LevelRecord>(ids.map((id) => [id, { petals, bestTimeMs: 1000 }]));

describe("parcours calculé sur l'appareil", () => {
    it("ouvre les énigmes une à une et le monde suivant après trois", () => {
        const start = buildJourney(bundle, records([]));
        expect(start.worlds.map((w) => w.status)).toEqual(["available", "locked"]);
        expect(start.status("a")).toBe("available");
        expect(start.status("b")).toBe("locked");
        expect(start.summary.resume).toEqual({ world: { slug: "un", title: "Un", theme: "origines" }, levelId: "a" });

        const three = buildJourney(bundle, records(["a", "b", "c"]));
        expect(three.worlds.map((w) => w.status)).toEqual(["available", "available"]);
        expect(three.world("un")!.nextLevelId).toBe("d");
        expect(three.summary.completedLevels).toBe(3);
        expect(three.summary.totalLevels).toBe(6);
    });
    it("compte l'harmonie en pétales et ignore les mondes vides", () => {
        const journey = buildJourney(bundle, records(["a"], PETALS.SOLVED | PETALS.CLARITY));
        expect(journey.worlds).toHaveLength(2);
        expect(journey.summary.harmony).toBe(2);
        expect(journey.summary.maxHarmony).toBe(18);
    });
    it("trouve les énigmes du parcours et celles du jour", () => {
        const journey = buildJourney(bundle, records([]));
        expect(journey.level("b")).toMatchObject({ position: 2, total: 4, previousLevelId: "a", nextLevelId: "c", isDaily: false, groupSize: 2 });
        expect(journey.level("jour")).toMatchObject({ position: 0, isDaily: true });
        expect(journey.level("inconnue")).toBeNull();
    });
});

describe("victoire décrite sur l'appareil", () => {
    it("additionne les pétales et garde le meilleur temps", () => {
        const before = recordWin(new Map(), "a", PETALS.SOLVED | PETALS.AUTONOMY, 5000);
        const after = recordWin(before, "a", PETALS.SOLVED | PETALS.CLARITY, 9000);
        expect(after.get("a")).toEqual({ petals: 7, bestTimeMs: 5000 });
    });
    it("annonce l'énigme suivante, puis le monde ouvert", () => {
        const first = describeWin(bundle, records([]), { levelId: "a", petals: 7, durationMs: 1000, hintsUsed: 0 });
        expect(first).toMatchObject({ nextLevelId: "b", newPetals: 7, worldCompleted: false, nextWorld: null });

        const last = describeWin(bundle, records(["a", "b", "c"]), { levelId: "d", petals: 1, durationMs: 1000, hintsUsed: 2 });
        expect(last).toMatchObject({ nextLevelId: null, worldCompleted: true, gameCompleted: false });
        expect(last.nextWorld?.slug).toBe("deux");
        expect(last.garden.completedLevels).toBe(4);
    });
});

describe("série du jour", () => {
    it("ne compte que la première victoire d'un jour", () => {
        const first = dailyOutcome(new Map([["2026-10-03", 1]]), "2026-10-04", "2026-10-04", 7);
        expect(first.firstToday).toBe(true);
        expect(first.streak.current).toBe(2);
        const again = dailyOutcome(new Map([["2026-10-04", 1]]), "2026-10-04", "2026-10-04", 7);
        expect(again.firstToday).toBe(false);
        expect(again.share).toContain("✿○○");
    });
});
