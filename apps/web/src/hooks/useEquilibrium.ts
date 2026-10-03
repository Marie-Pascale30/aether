"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/settings";

/** Pourquoi le souffle d'Équilibre se manifeste. */
export type NudgeReason = "paths" | "time";

/** Fausses pistes d'affilée, sans avancer, avant un premier souffle. */
const PATHS_BEFORE_NUDGE = 3;
/** Temps de réflexion (onglet visible) sans avancer avant un premier souffle. */
const TIME_BEFORE_NUDGE_MS = 90_000;
const TICK_MS = 5_000;

interface Signals {
    /** Faux tant que l'énigme n'est pas en cours (chargement, fin). */
    active: boolean;
    /** Croît à chaque avancée (lien trouvé, symbole retrouvé…). Une baisse = nouvelle partie. */
    progress: number;
    /** Fausses pistes de la partie. */
    mistakes: number;
}

/**
 * Équilibre Mental : repère, sans jamais le dire, qu'une énigme résiste (plusieurs fausses pistes
 * d'affilée ou une longue réflexion sans avancer) et propose alors un souffle d'aide. Chaque
 * « je continue » double la patience avant le souffle suivant : l'aide reste discrète.
 */
export function useEquilibrium({ active, progress, mistakes }: Signals) {
    const { settings } = useSettings();
    const enabled = settings.equilibre && active;

    const [nudge, setNudge] = useState<NudgeReason | null>(null);
    const patience = useRef(1);
    const idleMs = useRef(0);
    const mistakesAtProgress = useRef(mistakes);
    const lastProgress = useRef(progress);

    const settle = useCallback(() => {
        idleMs.current = 0;
        mistakesAtProgress.current = mistakes;
        setNudge(null);
    }, [mistakes]);

    // Une avancée (ou une nouvelle partie) remet tout à zéro.
    useEffect(() => {
        const restarted = progress < lastProgress.current || mistakes < mistakesAtProgress.current;
        if (progress === lastProgress.current && !restarted) return;
        if (restarted) patience.current = 1;
        lastProgress.current = progress;
        idleMs.current = 0;
        mistakesAtProgress.current = mistakes;
        setNudge(null);
    }, [progress, mistakes]);

    useEffect(() => {
        if (!enabled || nudge) return;
        if (mistakes - mistakesAtProgress.current >= PATHS_BEFORE_NUDGE * patience.current) setNudge("paths");
    }, [enabled, nudge, mistakes]);

    useEffect(() => {
        if (!enabled || nudge) return;
        const timer = setInterval(() => {
            if (document.visibilityState !== "visible") return;
            idleMs.current += TICK_MS;
            if (idleMs.current >= TIME_BEFORE_NUDGE_MS * patience.current) setNudge("time");
        }, TICK_MS);
        return () => clearInterval(timer);
    }, [enabled, nudge]);

    return {
        nudge: enabled ? nudge : null,
        /** « Je continue » : le prochain souffle attendra deux fois plus longtemps. */
        dismiss: () => {
            patience.current *= 2;
            settle();
        },
        /** L'aide a été acceptée : on repart de zéro, sans changer la patience. */
        accept: settle,
    };
}
