import { describe, expect, it } from "vitest";
import { PETALS } from "./scoring";
import { buildShareText, computeStreak, dateKey, previousDateKey } from "./daily";

describe("dateKey", () => {
    it("suit le fuseau et non UTC", () => {
        // 23 h 30 UTC le 1er octobre = déjà le 2 octobre à Paris (UTC+2).
        const late = new Date("2026-10-01T23:30:00Z");
        expect(dateKey(late, "UTC")).toBe("2026-10-01");
        expect(dateKey(late, "Europe/Paris")).toBe("2026-10-02");
    });
    it("recule d'un jour, mois et année compris", () => {
        expect(previousDateKey("2026-10-01")).toBe("2026-09-30");
        expect(previousDateKey("2027-01-01")).toBe("2026-12-31");
    });
});

describe("computeStreak", () => {
    it("compte jusqu'à aujourd'hui", () => {
        expect(computeStreak(["2026-09-30", "2026-10-01", "2026-10-02"], "2026-10-02")).toEqual({ current: 3, best: 3, playedToday: true });
    });
    it("garde la série d'hier tant que la journée n'est pas finie", () => {
        expect(computeStreak(["2026-09-30", "2026-10-01"], "2026-10-02")).toEqual({ current: 2, best: 2, playedToday: false });
    });
    it("repart de zéro après un jour manqué, mais retient la meilleure série", () => {
        const days = ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-10-02"];
        expect(computeStreak(days, "2026-10-02")).toEqual({ current: 1, best: 4, playedToday: true });
        expect(computeStreak([], "2026-10-02")).toEqual({ current: 0, best: 0, playedToday: false });
    });
});

describe("buildShareText", () => {
    it("résume l'harmonie et la série, sans temps ni faux pas", () => {
        const text = buildShareText({ date: "2026-10-02", petals: PETALS.SOLVED | PETALS.AUTONOMY, streak: 3 });
        expect(text).toBe("AETHER · Énigme du jour · 2 octobre\n✿✿○ harmonie\nSérie : 3 jours");
    });
});
