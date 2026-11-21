"use client";

import { useEffect, useState } from "react";

export type SkyPhase = "night" | "dawn" | "day" | "dusk";
export type Season = "hiver" | "printemps" | "ete" | "automne";

export interface SkyTime {
    phase: SkyPhase;
    season: Season;
}

/** Moment de la journée selon l'heure locale. */
export function skyPhase(hour: number): SkyPhase {
    if (hour >= 5 && hour < 8) return "dawn";
    if (hour >= 8 && hour < 17) return "day";
    if (hour >= 17 && hour < 21) return "dusk";
    return "night";
}

/** Saison (hémisphère nord) selon le mois, de 0 (janvier) à 11. */
export function season(month: number): Season {
    if (month === 11 || month <= 1) return "hiver";
    if (month <= 4) return "printemps";
    if (month <= 7) return "ete";
    return "automne";
}

/**
 * L'heure et la saison du joueur, pour le ciel des jardins. `null` au premier rendu (identique au
 * rendu serveur), puis l'heure réelle, revue toutes les dix minutes.
 */
export function useSkyTime(): SkyTime | null {
    const [time, setTime] = useState<SkyTime | null>(null);
    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTime({ phase: skyPhase(now.getHours()), season: season(now.getMonth()) });
        };
        update();
        const timer = setInterval(update, 10 * 60 * 1000);
        return () => clearInterval(timer);
    }, []);
    return time;
}
