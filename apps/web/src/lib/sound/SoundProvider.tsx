"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSettings } from "@/lib/settings";
import { SoundEngine, type Cue } from "./engine";

interface SoundContextValue {
    muted: boolean;
    toggleMuted: () => void;
    play: (cue: Cue) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

/** Sons du jeu, pilotés par les réglages (volume, effets, ambiance, son coupé). */
export function SoundProvider({ children }: { children: ReactNode }) {
    const { settings, hydrated, update } = useSettings();
    const engine = useRef<SoundEngine | null>(null);
    const [unlocked, setUnlocked] = useState(false);

    const getEngine = () => (engine.current ??= new SoundEngine());
    // Muet tant que les préférences ne sont pas lues : rien ne doit jouer contre l'avis du joueur.
    const muted = !hydrated || settings.muted;

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
        if (engine.current || unlocked) getEngine().setVolume(settings.volume);
    }, [settings.volume, unlocked]);

    useEffect(() => {
        if (!unlocked) return;
        if (muted || !settings.ambient) getEngine().stopAmbient();
        else getEngine().startAmbient();
    }, [muted, settings.ambient, unlocked]);

    const toggleMuted = useCallback(() => {
        setUnlocked(true);
        update({ muted: !settings.muted });
    }, [settings.muted, update]);

    const play = useCallback(
        (cue: Cue) => {
            if (!muted && settings.effects) getEngine().play(cue);
        },
        [muted, settings.effects],
    );

    const value = useMemo(() => ({ muted, toggleMuted, play }), [muted, toggleMuted, play]);
    return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
    const value = useContext(SoundContext);
    if (!value) throw new Error("useSound doit être utilisé sous <SoundProvider>.");
    return value;
}
