import { h } from "./dom.js";

/**
 * Routeur d'écrans minimal.
 * Chaque route est une fabrique `({ navigate }) => ({ el, destroy? })`.
 * Naviguer vers la route courante la reconstruit (utile pour « Réinitialiser »).
 */
export function createRouter(root, routes) {
    let current = null;

    function navigate(name) {
        const factory = routes[name];
        if (!factory) throw new Error(`Route inconnue : ${name}`);

        current?.destroy?.();
        current = factory({ navigate });

        root.replaceChildren(h("section", { class: `screen screen--${name}` }, current.el));
        window.scrollTo(0, 0);
    }

    return { navigate };
}
