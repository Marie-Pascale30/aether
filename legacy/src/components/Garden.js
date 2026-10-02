import { h } from "../core/dom.js";

/** Décor du jardin ; `stage` est l'emoji de l'arbre (voir `growth` dans les niveaux). */
export function Garden({ stage }) {
    return h(
        "div",
        { class: "garden", "aria-hidden": "true" },
        h("div", { class: "garden__stars" }),
        h("div", { class: "garden__tree" }, stage),
    );
}
