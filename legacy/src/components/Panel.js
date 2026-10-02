import { h } from "../core/dom.js";

export function Panel({ class: extraClass = "" } = {}, ...children) {
    return h("div", { class: `panel ${extraClass}`.trim() }, ...children);
}
