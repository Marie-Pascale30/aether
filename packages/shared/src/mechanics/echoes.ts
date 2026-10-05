import { createRng, type Rng } from "../rng";
import type { MechanicIssue } from "./issues";

/**
 * ÉCHOS — retrouver la règle cachée à partir de quelques exemples « A → B », puis l'appliquer
 * à une nouvelle situation. Une réponse fausse ne coûte rien d'autre qu'un essai : l'option
 * s'efface, l'explication n'apparaît qu'une fois la règle trouvée.
 */
export interface EchoesPuzzle {
    examples: { from: string; to: string }[];
    question: string;
    options: string[];
    answer: number;
    /** Formulation de la règle, révélée après la bonne réponse. */
    explanation: string;
}

export function validateEchoes(p: EchoesPuzzle): MechanicIssue[] {
    const issues: MechanicIssue[] = [];
    if (p.examples.length < 2) issues.push({ path: ["examples"], message: "Au moins deux exemples pour qu'une règle se dessine." });
    p.examples.forEach((example, i) => {
        if (!example.from.trim() || !example.to.trim()) issues.push({ path: ["examples", i], message: `L'exemple ${i + 1} est incomplet.` });
    });
    if (!p.question.trim()) issues.push({ path: ["question"], message: "La question est requise." });
    if (p.options.length < 2 || p.options.length > 6) issues.push({ path: ["options"], message: "Entre 2 et 6 propositions." });
    if (new Set(p.options).size !== p.options.length) issues.push({ path: ["options"], message: "Deux propositions sont identiques." });
    if (!Number.isInteger(p.answer) || p.answer < 0 || p.answer >= p.options.length) {
        issues.push({ path: ["answer"], message: "La bonne réponse doit être l'une des propositions." });
    }
    if (!p.explanation.trim()) issues.push({ path: ["explanation"], message: "Explique la règle (elle s'affiche après la réussite)." });
    return issues;
}

export const echoesCorrect = (p: EchoesPuzzle, choice: number) => choice === p.answer;

// ─── Familles de règles ──────────────────────────────────────────────────────

interface Rule {
    apply(input: Item): Item;
    describe: string;
}

/** Un élément de règle : un symbole répété `count` fois (ou un nombre). */
interface Item {
    glyph: string;
    count: number;
}

const FILL: Record<string, string> = { "○": "●", "△": "▲", "□": "■", "◇": "◆", "☆": "★", "▽": "▼" };
const UNFILL = Object.fromEntries(Object.entries(FILL).map(([open, full]) => [full, open]));
const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
const MIRROR: Record<string, string> = { "◀": "▶", "▶": "◀", "↖": "↗", "↗": "↖", "↙": "↘", "↘": "↙", "←": "→", "→": "←", "↑": "↑", "↓": "↓" };

const RULES: { weight: number; make(rng: Rng): { rule: Rule; inputs: Item[] } }[] = [
    {
        // Ajouter (ou retirer) le même nombre d'éléments.
        weight: 1,
        make(rng) {
            const delta = rng.pick([1, 2, 3, -1]);
            const glyph = rng.pick(["●", "✦", "▲", "■"]);
            return {
                rule: { apply: (i) => ({ ...i, count: i.count + delta }), describe: delta > 0 ? `On ajoute ${delta} élément${delta > 1 ? "s" : ""}.` : "On retire un élément." },
                inputs: rng.shuffle([2, 3, 4, 5]).map((count) => ({ glyph, count })),
            };
        },
    },
    {
        // Doubler la quantité.
        weight: 1,
        make(rng) {
            const glyph = rng.pick(["●", "✦", "◆"]);
            return {
                rule: { apply: (i) => ({ ...i, count: i.count * 2 }), describe: "La quantité double." },
                inputs: rng.shuffle([1, 2, 3]).map((count) => ({ glyph, count })),
            };
        },
    },
    {
        // Remplir la forme (ou la vider).
        weight: 1,
        make(rng) {
            const fill = rng.next() < 0.6;
            const map = fill ? FILL : UNFILL;
            return {
                rule: { apply: (i) => ({ ...i, glyph: map[i.glyph] ?? i.glyph }), describe: fill ? "La forme se remplit." : "La forme se vide." },
                inputs: rng.shuffle(Object.keys(map)).slice(0, 4).map((glyph) => ({ glyph, count: 1 })),
            };
        },
    },
    {
        // Tourner une flèche d'un huitième ou d'un quart de tour.
        weight: 1,
        make(rng) {
            const step = rng.pick([2, 2, 1, -2]);
            const turn = (glyph: string) => ARROWS[(ARROWS.indexOf(glyph) + step + 8) % 8]!;
            const label = Math.abs(step) === 2 ? "d'un quart de tour" : "d'un huitième de tour";
            return {
                rule: { apply: (i) => ({ ...i, glyph: turn(i.glyph) }), describe: `La flèche tourne ${label} ${step > 0 ? "dans le sens des aiguilles d'une montre" : "dans l'autre sens"}.` },
                inputs: rng.shuffle(ARROWS).slice(0, 4).map((glyph) => ({ glyph, count: 1 })),
            };
        },
    },
    {
        // Reflet dans un miroir vertical.
        weight: 1,
        make(rng) {
            return {
                rule: { apply: (i) => ({ ...i, glyph: MIRROR[i.glyph] ?? i.glyph }), describe: "Chaque signe se reflète dans un miroir." },
                inputs: rng.shuffle(["◀", "↖", "↙", "←", "▶", "↗"]).slice(0, 4).map((glyph) => ({ glyph, count: 1 })),
            };
        },
    },
];

const render = (item: Item) => (item.count <= 0 ? "∅" : item.glyph.repeat(Math.min(item.count, 12)));

/** Combine deux règles (difficulté élevée) : d'abord l'une, puis l'autre. */
function compose(first: Rule, second: Rule): Rule {
    return { apply: (i) => second.apply(first.apply(i)), describe: `${first.describe} Puis : ${second.describe.charAt(0).toLowerCase()}${second.describe.slice(1)}` };
}

/**
 * Énigme procédurale. `difficulty` 1–10 : plus d'exemples au début, moins ensuite ; à partir
 * de 7, deux règles se combinent toujours (quantité + forme), comme l'annoncent les niveaux.
 */
export function generateEchoes(seed: number | string, difficulty: number): EchoesPuzzle {
    const rng = createRng(seed);
    const d = Math.min(10, Math.max(1, Math.round(difficulty)));
    // Les deux premières familles (quantités) sont celles qui se combinent avec le remplissage.
    const family = d >= 7 ? RULES[rng.int(0, 1)]! : RULES[rng.int(0, RULES.length - 1)]!;
    let { rule, inputs } = family.make(rng);

    if (d >= 7) {
        // Quantité + remplissage : les deux transformations restent visibles ensemble.
        const fillRule = RULES[2]!.make(rng).rule;
        const shapes = rng.shuffle(Object.keys(FILL));
        inputs = inputs.map((item, i) => ({ ...item, glyph: shapes[i % shapes.length]! }));
        rule = compose(rule, fillRule);
    }

    const exampleCount = d <= 3 ? 3 : 2;
    const [question, ...rest] = inputs;
    const examples = rest.slice(0, exampleCount).map((input) => ({ from: render(input), to: render(rule.apply(input)) }));
    const answer = render(rule.apply(question!));

    // Leurres plausibles : l'entrée inchangée, et la règle appliquée à côté.
    const decoys = new Set<string>([render(question!), ...rest.map((input) => render(rule.apply(input)))]);
    const near = rule.apply(question!);
    decoys.add(render({ ...near, count: near.count + 1 }));
    decoys.add(render({ ...near, count: Math.max(1, near.count - 1) }));
    decoys.delete(answer);
    const options = rng.shuffle([answer, ...rng.shuffle([...decoys]).slice(0, 3)]);

    return { examples, question: render(question!), options, answer: options.indexOf(answer), explanation: rule.describe };
}
