"use client";

import { useEffect, useState } from "react";

const STORAGE_PREFIX = "aether:garden-seen:";
const GROW_DELAY_MS = 700;

function readSeen(key: string): number | null {
    try {
        const value = localStorage.getItem(STORAGE_PREFIX + key);
        return value === null ? null : Number(value);
    } catch {
        return null;
    }
}

function writeSeen(key: string, stage: number) {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, String(stage));
    } catch {
        // stockage indisponible : le jardin s'affichera simplement sans animation de croissance
    }
}

/**
 * Affiche d'abord le jardin tel que le joueur l'a vu la dernière fois, puis le fait croître
 * jusqu'à son stade réel : chaque progrès se voit pousser. Mémorisé séparément pour chaque monde (`key`).
 */
export function useGrowingStage(target: number | undefined, key: string): { stage: number; instant: boolean } {
    const [state, setState] = useState<{ stage: number; instant: boolean }>({ stage: 0, instant: true });

    useEffect(() => {
        if (target === undefined) return;

        const seen = readSeen(key);
        if (seen === null || seen >= target) {
            setState({ stage: target, instant: true });
            writeSeen(key, target);
            return;
        }

        setState({ stage: seen, instant: true });
        const timer = setTimeout(() => {
            setState({ stage: target, instant: false });
            writeSeen(key, target);
        }, GROW_DELAY_MS);
        return () => clearTimeout(timer);
    }, [target, key]);

    return state;
}
