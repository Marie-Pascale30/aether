"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aether:garden-seen";
const GROW_DELAY_MS = 700;

function readSeen(): number | null {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === null ? null : Number(value);
    } catch {
        return null;
    }
}

function writeSeen(stage: number) {
    try {
        localStorage.setItem(STORAGE_KEY, String(stage));
    } catch {
        // stockage indisponible : le jardin s'affichera simplement sans animation de croissance
    }
}

/**
 * Affiche d'abord le jardin tel que le joueur l'a vu la dernière fois, puis le fait croître
 * jusqu'à son stade réel : chaque progrès se voit pousser.
 */
export function useGrowingStage(target: number | undefined): { stage: number; instant: boolean } {
    const [state, setState] = useState<{ stage: number; instant: boolean }>({ stage: 0, instant: true });

    useEffect(() => {
        if (target === undefined) return;

        const seen = readSeen();
        if (seen === null || seen >= target) {
            setState({ stage: target, instant: true });
            writeSeen(target);
            return;
        }

        setState({ stage: seen, instant: true });
        const timer = setTimeout(() => {
            setState({ stage: target, instant: false });
            writeSeen(target);
        }, GROW_DELAY_MS);
        return () => clearTimeout(timer);
    }, [target]);

    return state;
}
