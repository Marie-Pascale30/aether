"use client";

import { useEffect, useState } from "react";

/** Millisecondes écoulées depuis `startedAt`, rafraîchies chaque seconde tant que `running`. */
export function useElapsed(startedAt: string | undefined, running: boolean): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!running) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [running]);

    return startedAt ? Math.max(0, now - Date.parse(startedAt)) : 0;
}
