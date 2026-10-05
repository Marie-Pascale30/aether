"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { CompletionResult, SyncState } from "@aether/shared";
import { api, ApiError } from "@/lib/api";
import { keys, useMe } from "@/lib/queries";
import { outbox, usePendingResults } from "./outbox";

const RETRY_MS = 60_000;

// ─── Réseau ─────────────────────────────────────────────────────────────────

function subscribeOnline(listener: () => void) {
    window.addEventListener("online", listener);
    window.addEventListener("offline", listener);
    return () => {
        window.removeEventListener("online", listener);
        window.removeEventListener("offline", listener);
    };
}

/** Le navigateur se croit-il en ligne ? (Toujours vrai au rendu serveur.) */
export function useOnline(): boolean {
    return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

// ─── Résultats confirmés ─────────────────────────────────────────────────────

const syncedListeners = new Map<string, (completion: CompletionResult) => void>();

/** Être prévenu quand le serveur a enregistré une victoire (repères atteints, notamment). */
export function onResultSynced(resultId: string, listener: (completion: CompletionResult) => void) {
    syncedListeners.set(resultId, listener);
    return () => {
        if (syncedListeners.get(resultId) === listener) syncedListeners.delete(resultId);
    };
}

function withWin(state: SyncState, levelId: string, completion: CompletionResult): SyncState {
    const { daily } = completion;
    return {
        levels: { ...state.levels, [levelId]: { petals: completion.levelPetals, bestTimeMs: completion.bestTimeMs } },
        daily:
            daily && !state.daily.some((row) => row.date === daily.date)
                ? [...state.daily, { date: daily.date, petals: completion.petals, durationMs: completion.durationMs, hintsUsed: completion.hintsUsed }]
                : state.daily,
    };
}

// ─── Envoi ──────────────────────────────────────────────────────────────────

/**
 * Vide la file des victoires, dans l'ordre (une énigme peut dépendre de la précédente) : au
 * démarrage, au retour du réseau, à chaque nouvelle victoire, puis toutes les minutes. Une
 * coupure ou une erreur serveur arrête la tournée (on réessaiera) ; un refus définitif (4xx :
 * énigme retirée, jour passé…) retire la victoire de la file.
 */
export function OutboxSync() {
    const qc = useQueryClient();
    const { data: me } = useMe();
    const pending = usePendingResults(me?.id);
    const online = useOnline();
    const running = useRef(false);
    const lastPlayer = useRef<string | undefined>(undefined);

    // Joueur changé côté serveur (session expirée, autre compte) : ses données ne sont plus les nôtres.
    useEffect(() => {
        if (!me) return;
        if (lastPlayer.current && lastPlayer.current !== me.id) {
            qc.removeQueries({ predicate: ({ queryKey }) => (queryKey[0] === "me" && queryKey.length > 1) || queryKey[0] === "daily" });
        }
        lastPlayer.current = me.id;
    }, [me, qc]);

    const flush = useCallback(async () => {
        if (running.current || !me || !navigator.onLine) return;
        running.current = true;
        let sent = 0;
        try {
            for (const entry of outbox.forUser(me.id)) {
                const { levelId, userId: _owner, ...input } = entry;
                try {
                    const completion = await api.play.result(levelId, input);
                    // La victoire passe de la file au cache de progression sans « trou » visible.
                    qc.setQueryData<SyncState>(keys.sync, (state) => state && withWin(state, levelId, completion));
                    outbox.remove(entry.resultId);
                    sent += 1;
                    syncedListeners.get(entry.resultId)?.(completion);
                } catch (error) {
                    if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 429) {
                        console.warn("Victoire refusée par le serveur, retirée de la file :", error.message);
                        outbox.remove(entry.resultId);
                        continue;
                    }
                    break; // hors ligne, session expirée ou serveur indisponible : on réessaiera
                }
            }
        } finally {
            running.current = false;
            if (sent > 0) {
                await Promise.all([keys.sync, keys.stats, keys.milestones, keys.daily].map((queryKey) => qc.invalidateQueries({ queryKey })));
            }
        }
    }, [me, qc]);

    useEffect(() => {
        if (online && pending.length > 0) void flush();
    }, [online, pending, flush]);

    useEffect(() => {
        const timer = setInterval(() => void flush(), RETRY_MS);
        return () => clearInterval(timer);
    }, [flush]);

    return null;
}
