"use client";

import { useEffect } from "react";
import { IS_APP } from "@/lib/platform";

/**
 * Enregistre le service worker (`public/sw.js`), qui garde les pages et leurs fichiers pour
 * rouvrir le jeu sans réseau. En développement, il gênerait le rechargement à chaud : on s'en
 * passe, et on retire celui qu'aurait laissé une version de production.
 */
export function ServiceWorker() {
    useEffect(() => {
        // Dans une application, les pages sont déjà sur l'appareil : pas de service worker.
        if (IS_APP || !("serviceWorker" in navigator)) return;
        if (process.env.NODE_ENV !== "production") {
            void navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((r) => void r.unregister()));
            return;
        }
        void navigator.serviceWorker.register(`/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID}`).catch((error: unknown) => console.warn("Service worker non enregistré :", error));
    }, []);
    return null;
}
