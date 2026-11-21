"use client";

import { useCallback } from "react";
import { IS_APP } from "@/lib/platform";
import { useSettings } from "@/lib/settings";

export type Haptic = "tap" | "soft" | "success";

/** Motifs pour le navigateur (millisecondes de vibration et de pause) : toujours brefs et doux. */
const PATTERNS: Record<Haptic, number | number[]> = {
    tap: 8,
    soft: [14, 50, 14],
    success: [18, 70, 28, 70, 40],
};

async function vibrate(kind: Haptic) {
    if (IS_APP) {
        // Dans les applications : le moteur haptique du téléphone, plus fin qu'une vibration.
        try {
            const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
            if (kind === "success") await Haptics.notification({ type: NotificationType.Success });
            else await Haptics.impact({ style: kind === "tap" ? ImpactStyle.Light : ImpactStyle.Medium });
        } catch {
            // pas de moteur haptique : tant pis, le son et la lumière suffisent
        }
        return;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(PATTERNS[kind]);
}

/** Légère vibration aux moments clés, si le joueur l'a laissée activée. */
export function useHaptics() {
    const { settings } = useSettings();
    return useCallback((kind: Haptic) => settings.vibrations && void vibrate(kind), [settings.vibrations]);
}
