import { h } from "../core/dom.js";

/** Message d'état annoncé aux lecteurs d'écran. `tone` : "success" | "fail" | undefined. */
export function StatusMessage(initialText) {
    const el = h("div", { class: "status", role: "status", "aria-live": "polite" }, initialText);

    return {
        el,
        set(text, tone) {
            el.textContent = text;
            el.className = tone ? `status status--${tone}` : "status";
        },
    };
}
