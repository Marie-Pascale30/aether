"use client";

import { useSyncExternalStore } from "react";
import type { LevelResultInput } from "@aether/shared";

/** Victoire jouée sur l'appareil, en attente d'envoi (hors ligne, ou envoi en cours). */
export interface PendingResult extends LevelResultInput {
    levelId: string;
    /** Joueur qui a remporté la victoire : la file ne mélange jamais deux joueurs. */
    userId: string;
}

const STORAGE_KEY = "aether:outbox";
const EMPTY: PendingResult[] = [];

let entries: PendingResult[] | null = null;
const listeners = new Set<() => void>();

function load(): PendingResult[] {
    if (entries) return entries;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        entries = stored ? (JSON.parse(stored) as PendingResult[]) : [];
    } catch {
        entries = [];
    }
    return entries;
}

function save(next: PendingResult[]) {
    entries = next;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // stockage indisponible (navigation privée) : la file vit le temps de la session
    }
    listeners.forEach((listener) => listener());
}

/**
 * File des victoires à envoyer, gardée sur l'appareil (localStorage) : elle survit à un
 * rechargement ou à une fermeture hors ligne, et se vide dans l'ordre, dès que le réseau revient.
 */
export const outbox = {
    all: (): PendingResult[] => (typeof window === "undefined" ? EMPTY : load()),
    forUser: (userId: string | undefined) => outbox.all().filter((entry) => entry.userId === userId),
    add: (entry: PendingResult) => save([...load(), entry]),
    remove: (resultId: string) => save(load().filter((entry) => entry.resultId !== resultId)),
    /** Les victoires d'un invité suivent le compte auquel il se connecte. */
    reassign: (fromUserId: string, toUserId: string) =>
        save(load().map((entry) => (entry.userId === fromUserId ? { ...entry, userId: toUserId } : entry))),
    subscribe(listener: () => void) {
        listeners.add(listener);
        const onStorage = (event: StorageEvent) => {
            if (event.key !== STORAGE_KEY) return;
            entries = null; // un autre onglet a modifié la file
            listener();
        };
        window.addEventListener("storage", onStorage);
        return () => {
            listeners.delete(listener);
            window.removeEventListener("storage", onStorage);
        };
    },
};

/** Victoires en attente du joueur courant (référence stable tant que la file ne change pas). */
export function usePendingResults(userId: string | undefined): PendingResult[] {
    const all = useSyncExternalStore(outbox.subscribe, outbox.all, () => EMPTY);
    return pendingFor(all, userId);
}

const cache = new WeakMap<PendingResult[], Map<string, PendingResult[]>>();
function pendingFor(all: PendingResult[], userId: string | undefined): PendingResult[] {
    if (!userId) return EMPTY;
    let byUser = cache.get(all);
    if (!byUser) cache.set(all, (byUser = new Map()));
    let filtered = byUser.get(userId);
    if (!filtered) byUser.set(userId, (filtered = all.filter((entry) => entry.userId === userId)));
    return filtered;
}
