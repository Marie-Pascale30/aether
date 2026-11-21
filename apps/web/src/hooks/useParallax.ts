"use client";

import { useEffect, type RefObject } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Parallaxe douce : pose `--px` et `--py` (de -1 à 1) sur l'élément, d'après la souris au-dessus de
 * lui ou l'inclinaison de l'appareil. Les feuilles de style en déduisent un léger décalage par plan.
 * Rien ne bouge si le joueur préfère moins d'animations.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, enabled: boolean) {
    useEffect(() => {
        const element = ref.current;
        if (!enabled || !element || prefersReducedMotion()) return;

        let frame = 0;
        const set = (x: number, y: number) => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                element.style.setProperty("--px", Math.max(-1, Math.min(1, x)).toFixed(3));
                element.style.setProperty("--py", Math.max(-1, Math.min(1, y)).toFixed(3));
            });
        };

        const onPointer = (event: PointerEvent) => {
            if (event.pointerType !== "mouse") return;
            const box = element.getBoundingClientRect();
            set(((event.clientX - box.left) / box.width) * 2 - 1, ((event.clientY - box.top) / box.height) * 2 - 1);
        };
        const onLeave = () => set(0, 0);
        // Téléphone tenu en main : gamma (gauche-droite) et bêta (avant-arrière, autour de 45°).
        const onTilt = (event: DeviceOrientationEvent) => {
            if (event.gamma === null || event.beta === null) return;
            set(event.gamma / 25, (event.beta - 45) / 30);
        };

        element.addEventListener("pointermove", onPointer);
        element.addEventListener("pointerleave", onLeave);
        window.addEventListener("deviceorientation", onTilt);
        return () => {
            cancelAnimationFrame(frame);
            element.removeEventListener("pointermove", onPointer);
            element.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("deviceorientation", onTilt);
        };
    }, [ref, enabled]);
}
