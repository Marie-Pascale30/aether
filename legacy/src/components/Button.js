import { h } from "../core/dom.js";

/** @param {{ label: string, variant?: "default" | "primary", onClick?: () => void, hidden?: boolean }} props */
export function Button({ label, variant = "default", onClick, hidden = false }) {
    const className = variant === "primary" ? "btn btn--primary" : "btn";
    return h("button", { type: "button", class: className, onClick, hidden }, label);
}
