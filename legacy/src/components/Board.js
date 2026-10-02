import { h } from "../core/dom.js";
import { t } from "../i18n/index.js";
import { SymbolNode } from "./SymbolNode.js";

/**
 * Plateau de symboles. Ne contient aucune règle de jeu : il remonte les clics via `onPick(index)`
 * et expose `select` / `link` pour que l'écran reflète l'état du `Puzzle`.
 */
export function Board({ symbols, columns = 4, onPick }) {
    const nodes = symbols.map((symbol, i) =>
        SymbolNode({ symbol, label: t.puzzle.nodeLabel(i + 1), onClick: () => onPick(i) }),
    );

    const el = h("div", { class: "board" }, nodes.map((node) => node.el));
    el.style.setProperty("--board-columns", columns);

    return {
        el,
        select(index, selected = true) {
            nodes[index].setSelected(selected);
        },
        link(indices) {
            indices.forEach((i) => nodes[i].setLinked());
        },
    };
}
