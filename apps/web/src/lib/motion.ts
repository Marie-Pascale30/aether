/**
 * Le joueur préfère-t-il moins d'animations ? Suit le réglage du jeu (`data-motion` sur <html>),
 * ou à défaut celui de l'appareil.
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    const setting = document.documentElement.dataset.motion;
    if (setting === "reduce") return true;
    if (setting === "full") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
