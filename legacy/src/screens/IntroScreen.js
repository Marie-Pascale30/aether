import { h } from "../core/dom.js";
import { t } from "../i18n/index.js";
import { actions, selectors } from "../game/state.js";
import { Panel } from "../components/Panel.js";
import { Hint } from "../components/Hint.js";
import { Button } from "../components/Button.js";
import { Garden } from "../components/Garden.js";

export function IntroScreen({ navigate }) {
    const start = () => {
        actions.startRun();
        navigate("puzzle");
    };

    const el = Panel(
        {},
        h(
            "div",
            { class: "intro" },
            h(
                "div",
                {},
                h("div", { class: "tag" }, t.intro.tag),
                h("h2", {}, t.intro.title),
                h("p", {}, t.intro.text),
                Hint({ label: t.intro.ruleLabel, text: t.intro.rule }),
                Button({ label: t.intro.enter, variant: "primary", onClick: start }),
            ),
            Garden({ stage: selectors.gardenStage() }),
        ),
    );

    return { el };
}
