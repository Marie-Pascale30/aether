import { h } from "../core/dom.js";
import { t } from "../i18n/index.js";

export function Header() {
    return h(
        "header",
        { class: "top" },
        h("div", { class: "logo" }, t.app.name),
        h("div", { class: "progress" }, t.app.version),
    );
}
