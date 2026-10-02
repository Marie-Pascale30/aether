/**
 * Logique pure d'une énigme (aucune dépendance au DOM, testable isolément).
 *
 * `select(index)` renvoie un résultat que l'UI traduit en affichage :
 *   { type: "ignored" }                 clic sans effet
 *   { type: "selected", index }         premier élément choisi
 *   { type: "deselected", index }       premier élément re-cliqué → annulé
 *   { type: "match", pair: [a, b] }     paire correcte
 *   { type: "mismatch", pair: [a, b] }  paire incorrecte → appeler `clearSelection()`
 */
export class Puzzle {
    #pairs;
    #selection = [];
    #found = new Set();

    constructor(level) {
        this.#pairs = level.pairs;
    }

    get foundCount() {
        return this.#found.size;
    }

    get remaining() {
        return this.#pairs.length - this.#found.size;
    }

    get isComplete() {
        return this.remaining === 0;
    }

    isLinked(index) {
        return [...this.#found].some((p) => this.#pairs[p].includes(index));
    }

    select(index) {
        // Deux éléments sélectionnés = mauvaise paire en attente d'effacement : on bloque.
        if (this.isComplete || this.#selection.length >= 2 || this.isLinked(index)) {
            return { type: "ignored" };
        }

        if (this.#selection.includes(index)) {
            this.#selection = [];
            return { type: "deselected", index };
        }

        this.#selection.push(index);
        if (this.#selection.length < 2) return { type: "selected", index };

        const pair = [...this.#selection];
        const pairIndex = this.#findPair(...pair);
        if (pairIndex === -1) return { type: "mismatch", pair };

        this.#found.add(pairIndex);
        this.#selection = [];
        return { type: "match", pair };
    }

    clearSelection() {
        this.#selection = [];
    }

    #findPair(a, b) {
        return this.#pairs.findIndex(
            ([x, y], i) => !this.#found.has(i) && ((x === a && y === b) || (x === b && y === a)),
        );
    }
}
