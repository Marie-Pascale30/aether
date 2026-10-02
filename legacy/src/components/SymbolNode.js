import { h } from "../core/dom.js";

/** Une case du plateau. Renvoie l'élément et des méthodes pour piloter son état visuel. */
export function SymbolNode({ symbol, label, onClick }) {
    const el = h(
        "button",
        { type: "button", class: "node", "aria-pressed": "false", onClick },
        h("span", { class: "node__shape" }, symbol),
        h("small", { class: "node__label" }, label),
    );

    return {
        el,
        setSelected(selected) {
            el.classList.toggle("node--selected", selected);
            el.setAttribute("aria-pressed", String(selected));
        },
        setLinked() {
            el.classList.add("node--linked");
            el.setAttribute("aria-disabled", "true");
        },
    };
}
