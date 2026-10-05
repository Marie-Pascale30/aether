"use client";

import { useEffect, useState } from "react";

/** Millisecondes avant minuit dans un fuseau donné (l'heure du changement d'énigme du jour). */
function untilMidnight(timeZone: string): number {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
        .formatToParts(new Date())
        .reduce<Record<string, number>>((acc, part) => ({ ...acc, [part.type]: Number(part.value) }), {});
    const elapsed = (parts.hour ?? 0) * 3600 + (parts.minute ?? 0) * 60 + (parts.second ?? 0);
    return (24 * 3600 - elapsed) * 1000;
}

/** Compte à rebours rafraîchi chaque minute ; `null` tant que le fuseau n'est pas connu. */
export function useCountdownToMidnight(timeZone: string | undefined): number | null {
    const [remaining, setRemaining] = useState<number | null>(null);

    useEffect(() => {
        if (!timeZone) return;
        const tick = () => setRemaining(untilMidnight(timeZone));
        tick();
        const timer = setInterval(tick, 60_000);
        return () => clearInterval(timer);
    }, [timeZone]);

    return remaining;
}

export function formatCountdown(ms: number): string {
    const minutes = Math.ceil(ms / 60_000);
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours} h ${String(minutes % 60).padStart(2, "0")}` : `${minutes} min`;
}
