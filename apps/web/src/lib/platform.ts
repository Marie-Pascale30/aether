/**
 * Où tourne le jeu : sur le site (Next sert les pages et relaie /api sur la même origine), ou
 * dans une application (Capacitor, Tauri) qui embarque les pages et appelle l'API à distance.
 * Fixé à la construction (`npm run build:app`).
 */
export const IS_APP = process.env.NEXT_PUBLIC_PLATFORM === "app";

/** Racine de l'API : relative sur le site, absolue dans les applications. */
export const API_ROOT = `${IS_APP ? (process.env.NEXT_PUBLIC_API_URL ?? "") : ""}/api`;

const TOKEN_KEY = "aether:session";

/**
 * Jeton de session des applications (le site utilise un cookie httpOnly, jamais lisible ici).
 * Gardé sur l'appareil, dans le stockage de l'application.
 */
export const appSession = {
    get(): string | null {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    },
    set(token: string | null): void {
        try {
            if (token) localStorage.setItem(TOKEN_KEY, token);
            else localStorage.removeItem(TOKEN_KEY);
        } catch {
            // stockage indisponible : la session vaut jusqu'à la fermeture
        }
    },
};
