import { h } from "../core/dom.js";

/** Encadré « Principe : … » / « Indice : … ». */
export function Hint({ label, text }) {
    return h("div", { class: "rule" }, h("b", {}, label), " ", text);
}
