"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SoundEngine, type Cue } from "./engine";

const STORAGE_KEY = "aether:muted";

interface SoundContextValue {
    muted: boolean;
    toggleMuted: () => void;
    play: (cue: Cue) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function readMuted(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

export function SoundProvider({ children }: { children: ReactNode }) {
    const engine = useRef<SoundEngine | null>(null);
    const [muted, setMuted] = useState(true); // muet tant que la préférence n'est pas lue (rendu serveur)
    const [unlocked, setUnlocked] = useState(false);

    const getEngine = () => (engine.current ??= new SoundEngine());

    useEffect(() => setMuted(readMuted()), []);

    // Les navigateurs n'autorisent le son qu'après un geste : on attend le premier clic / touche.
    useEffect(() => {
        if (unlocked) return;
        const unlock = () => setUnlocked(true);
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        return () => {
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
        };
    }, [unlocked]);

    useEffect(() => {
        if (!unlocked) return;
        if (muted) getEngine().stopAmbient();
        else getEngine().startAmbient();
    }, [muted, unlocked]);

    const toggleMuted = useCallback(() => {
        setUnlocked(true);
        setMuted((current) => {
            const next = !current;
            try {
                localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
            } catch {
                // stockage indisponible (navigation privée) : la préférence vaut pour la session
            }
            return next;
        });
    }, []);

    const play = useCallback((cue: Cue) => {
        if (!muted) getEngine().play(cue);
    }, [muted]);

    const value = useMemo(() => ({ muted, toggleMuted, play }), [muted, toggleMuted, play]);
    return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
    const value = useContext(SoundContext);
    if (!value) throw new Error("useSound doit être utilisé sous <SoundProvider>.");
    return value;
}
