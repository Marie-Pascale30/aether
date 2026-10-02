/**
 * Crée un élément DOM de façon déclarative.
 *
 *   h("button", { class: "btn", onClick: fn }, "Texte")
 *
 * Les enfants de type chaîne sont insérés comme nœuds texte (pas d'injection HTML).
 */
export function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;

        if (key === "class") node.className = value;
        else if (key === "style" && typeof value === "object") Object.assign(node.style, value);
        else if (key === "dataset") Object.assign(node.dataset, value);
        else if (key.startsWith("on") && typeof value === "function") {
            node.addEventListener(key.slice(2).toLowerCase(), value);
        } else node.setAttribute(key, value === true ? "" : value);
    }

    node.append(...children.flat().filter((child) => child != null && child !== false));
    return node;
}
