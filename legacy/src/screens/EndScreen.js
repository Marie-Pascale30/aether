import { h } from "../core/dom.js";
import { t } from "../i18n/index.js";
import { Panel } from "../components/Panel.js";
import { Button } from "../components/Button.js";

export function EndScreen({ navigate }) {
    const [firstLine, ...otherLines] = t.end.quote;

    const el = Panel(
        { class: "story" },
        h("div", { class: "tag" }, t.end.tag),
        h("div", { class: "quote" }, firstLine, otherLines.flatMap((line) => [h("br"), line])),
        h("p", {}, t.end.text),
        Button({ label: t.end.back, variant: "primary", onClick: () => navigate("intro") }),
    );

    return { el };
}
