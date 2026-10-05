import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
    echoesCorrect,
    flowExtend,
    flowSolved,
    gearsSolved,
    generatePuzzle,
    litTiles,
    memoryAnswer,
    memoryBeginRecall,
    memoryPrompt,
    memoryStart,
    rotateMask,
    validatePuzzle,
    LOCAL_MECHANICS,
    type FlowPaths,
    type FlowPuzzle,
} from "./index";

describe("générateur pseudo-aléatoire", () => {
    it("est déterministe pour une même graine", () => {
        const a = createRng("2026-10-02");
        const b = createRng("2026-10-02");
        expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
        expect(createRng("autre").next()).not.toBe(createRng("2026-10-02").next());
    });
});

describe("générateurs : toujours des énigmes valides, à toutes les difficultés", () => {
    for (const mechanic of LOCAL_MECHANICS) {
        it(mechanic, () => {
            for (let difficulty = 1; difficulty <= 10; difficulty++) {
                for (let seed = 0; seed < 8; seed++) {
                    const puzzle = generatePuzzle(mechanic, `${mechanic}-${seed}`, difficulty);
                    expect(validatePuzzle(mechanic, puzzle as never), `${mechanic} d${difficulty} s${seed}`).toEqual([]);
                }
            }
        });
    }
    it("donnent la même énigme pour la même graine", () => {
        expect(generatePuzzle("FLOW", "x", 5)).toEqual(generatePuzzle("FLOW", "x", 5));
    });
});

describe("Mémoires", () => {
    const puzzle = { columns: 2, cells: ["☀", "☾", "✦", null], targets: [1, 0] };

    it("demande les symboles dans l'ordre et compte les essais", () => {
        let state = memoryBeginRecall(memoryStart());
        expect(memoryPrompt(puzzle, state)).toBe("☾");
        const wrong = memoryAnswer(puzzle, state, 2);
        expect(wrong.correct).toBe(false);
        expect(wrong.state.mistakes).toBe(1);
        state = memoryAnswer(puzzle, wrong.state, 1).state;
        expect(memoryPrompt(puzzle, state)).toBe("☀");
        state = memoryAnswer(puzzle, state, 0).state;
        expect(state.phase).toBe("done");
    });
    it("refuse un symbole demandé qui apparaît deux fois", () => {
        expect(validatePuzzle("MEMORY", { columns: 2, cells: ["☀", "☀", "✦", "☾"], targets: [0] })).toHaveLength(1);
    });
});

describe("Rouages", () => {
    it("tourne les ouvertures dans le sens horaire", () => {
        expect(rotateMask(1, 1)).toBe(2); // N → E
        expect(rotateMask(3, 1)).toBe(6); // N+E → E+S
        expect(rotateMask(8, 1)).toBe(1); // O → N
    });
    it("n'accepte que le réseau complet et sans fuite", () => {
        // Deux pièces côte à côte : source ouverte vers l'est, voisine vers l'ouest.
        const puzzle = { columns: 2, rows: 1, source: 0, tiles: [{ mask: 2, rotation: 0 }, { mask: 8, rotation: 0 }] };
        expect(gearsSolved(puzzle, [0, 0])).toBe(true);
        expect(gearsSolved(puzzle, [0, 1])).toBe(false); // la voisine regarde vers le nord : fuite
        expect(litTiles(puzzle, [0, 1]).size).toBe(1);
    });
    it("signale une grille insoluble", () => {
        const impossible = { columns: 2, rows: 1, source: 0, tiles: [{ mask: 2, rotation: 0 }, { mask: 5, rotation: 0 }] };
        expect(validatePuzzle("GEARS", impossible).length).toBeGreaterThan(0);
    });
    it("génère des grilles résolues par leur orientation d'origine, mais mélangées", () => {
        const puzzle = generatePuzzle("GEARS", "g", 4);
        expect(gearsSolved(puzzle, puzzle.tiles.map(() => 0))).toBe(true);
        expect(gearsSolved(puzzle, puzzle.tiles.map((t) => t.rotation))).toBe(false);
    });
});

describe("Flux", () => {
    // 3×3 : flux 0 de la case 0 à 2, flux 1 de 3 à 8 (en passant par 4, 5... ), remplissage complet.
    const puzzle: FlowPuzzle = { columns: 3, rows: 3, fill: true, endpoints: [{ a: 0, b: 2 }, { a: 3, b: 8 }] };
    const draw = (flow: number, cells: number[], start: FlowPaths = [[], []]) =>
        cells.reduce<FlowPaths>((paths, cell) => flowExtend(puzzle, paths, flow, cell) ?? paths, start);

    it("trace, coupe et valide les flux", () => {
        let paths = draw(0, [0, 1, 2]);
        expect(paths[0]).toEqual([0, 1, 2]);
        paths = draw(1, [3, 4, 5, 8], paths);
        expect(flowSolved(puzzle, paths)).toBe(false); // 6 et 7 restent vides
        paths = draw(1, [3, 6, 7, 4, 5, 8], paths);
        expect(flowSolved(puzzle, paths)).toBe(true);
    });
    it("ne traverse pas la source d'un autre flux, et coupe un flux croisé", () => {
        expect(flowExtend(puzzle, [[0, 1], []], 0, 3)).toBeNull();
        const cut = draw(1, [3, 4, 1], [[0, 1, 2], []]);
        expect(cut[0]).toEqual([0]); // le flux 0 est coupé là où le flux 1 est passé
    });
    it("les solutions générées résolvent leur énigme", () => {
        for (let d = 1; d <= 10; d++) {
            const generated = generatePuzzle("FLOW", `f${d}`, d);
            expect(flowSolved(generated, generated.solution!)).toBe(true);
        }
    });
});

describe("Échos", () => {
    it("combine toujours deux règles à partir de la difficulté 7", () => {
        for (let seed = 0; seed < 10; seed++) {
            expect(generatePuzzle("ECHOES", `c${seed}`, 8).explanation).toContain("Puis :");
        }
    });
    it("a une seule bonne réponse parmi des propositions distinctes", () => {
        for (let d = 1; d <= 10; d++) {
            const puzzle = generatePuzzle("ECHOES", `e${d}`, d);
            expect(echoesCorrect(puzzle, puzzle.answer)).toBe(true);
            expect(new Set(puzzle.options).size).toBe(puzzle.options.length);
            expect(puzzle.options.length).toBeGreaterThanOrEqual(2);
        }
    });
});
