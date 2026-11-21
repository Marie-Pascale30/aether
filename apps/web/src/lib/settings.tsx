"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type MotionPreference = "system" | "reduce" | "full";
export type SymbolSize = "normal" | "large";
/** Apparence : « nuit » (bleu nuit), « ivoire » (parchemin, pour le plein jour), ou celle de l'appareil. */
export type ThemePreference = "nuit" | "ivoire" | "systeme";

export interface Settings {
    /** Coupe tout le son (bouton de l'en-tête). */
    muted: boolean;
    /** Volume général, de 0 à 1. */
    volume: number;
    effects: boolean;
    ambient: boolean;
    /** « system » suit la préférence du système d'exploitation. */
    motion: MotionPreference;
    symbols: SymbolSize;
    /** Afficher le temps pendant et après une énigme (masqué par défaut : aucun chrono imposé). */
    showTimer: boolean;
    /** Équilibre Mental : un souffle d'aide discret quand une énigme résiste. */
    equilibre: boolean;
    /** Loupe : plateaux et symboles agrandis. */
    loupe: boolean;
    theme: ThemePreference;
    /** Légères vibrations aux moments clés (téléphones, applications). */
    vibrations: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    muted: false,
    volume: 0.6,
    effects: true,
    ambient: true,
    motion: "system",
    symbols: "normal",
    showTimer: false,
    equilibre: true,
    loupe: false,
    theme: "nuit",
    vibrations: true,
};

const STORAGE_KEY = "aether:settings";
/** Ancienne préférence « son coupé », reprise une fois. */
const LEGACY_MUTED_KEY = "aether:muted";

function readSettings(): Settings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as Partial<Settings>) };
        return { ...DEFAULT_SETTINGS, muted: localStorage.getItem(LEGACY_MUTED_KEY) === "1" };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

interface SettingsContextValue {
    settings: Settings;
    /** Faux jusqu'à la lecture des préférences (rendu serveur, premier rendu client). */
    hydrated: boolean;
    update: (patch: Partial<Settings>) => void;
    reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Préférences du joueur, propres à cet appareil (localStorage). Les réglages d'affichage sont
 * appliqués par des attributs sur <html>, que les feuilles de style lisent.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setSettings(readSettings());
        setHydrated(true);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.motion = settings.motion;
        root.dataset.symbols = settings.symbols;
    }, [settings.motion, settings.symbols]);

    // Apparence : « systeme » suit le réglage clair / sombre de l'appareil, et ses changements.
    useEffect(() => {
        const root = document.documentElement;
        const light = window.matchMedia("(prefers-color-scheme: light)");
        const apply = () => {
            root.dataset.theme = settings.theme === "systeme" ? (light.matches ? "ivoire" : "nuit") : settings.theme;
        };
        apply();
        light.addEventListener("change", apply);
        return () => light.removeEventListener("change", apply);
    }, [settings.theme]);

    const persist = useCallback((next: Settings) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            // stockage indisponible (navigation privée) : les réglages valent pour la session
        }
        return next;
    }, []);

    const update = useCallback((patch: Partial<Settings>) => setSettings((current) => persist({ ...current, ...patch })), [persist]);
    const reset = useCallback(() => setSettings(persist(DEFAULT_SETTINGS)), [persist]);

    const value = useMemo(() => ({ settings, hydrated, update, reset }), [settings, hydrated, update, reset]);
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
    const value = useContext(SettingsContext);
    if (!value) throw new Error("useSettings doit être utilisé sous <SettingsProvider>.");
    return value;
}
