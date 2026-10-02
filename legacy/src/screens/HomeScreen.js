import { h } from "../core/dom.js";
import { t } from "../i18n/index.js";
import { Button } from "../components/Button.js";

export function HomeScreen({ navigate }) {
    const el = h(
        "div",
        { class: "hero" },
        h("div", { class: "symbol", "aria-hidden": "true" }),
        h("div", { class: "tag" }, t.home.tagline),
        h("h1", {}, t.app.name),
        h("p", {}, t.home.pitch),
        Button({ label: t.home.start, variant: "primary", onClick: () => navigate("intro") }),
        h("div", { class: "footer" }, t.home.footer),
    );

    return { el };
}
