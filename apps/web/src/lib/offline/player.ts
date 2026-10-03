"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
    buildJourney,
    dateKey,
    petalsFor,
    recordWin,
    type ContentBundle,
    type DailyEntry,
    type JourneyView,
    type LevelRecord,
} from "@aether/shared";
import { api } from "@/lib/api";
import { keys, useMe } from "@/lib/queries";
import { usePendingResults, type PendingResult } from "./outbox";

/** Contenu publié, gardé sur l'appareil (cache persistant) et rafraîchi quand le réseau le permet. */
export function useContent(enabled = true) {
    return useQuery({ queryKey: keys.content, queryFn: api.content, staleTime: 5 * 60_000, enabled });
}

/** Progression connue du serveur (les victoires en attente s'y ajoutent localement). */
export function useSyncState(enabled = true) {
    return useQuery({ queryKey: keys.sync, queryFn: api.me.sync, enabled });
}

export interface PlayerState {
    bundle: ContentBundle;
    journey: JourneyView;
    /** Pétales et meilleurs temps, victoires en attente comprises. */
    records: Map<string, LevelRecord>;
    /** Énigmes du jour réussies : date → pétales de la première victoire. */
    dailyResults: Map<string, number>;
    pending: PendingResult[];
    /** Aujourd'hui, dans le fuseau du jeu. */
    today: string;
}

/** Jour dont `levelId` est l'énigme du jour, pour une victoire remportée à `playedAt`. */
export function dailyDateOf(bundle: ContentBundle, levelId: string, playedAt: Date): string | null {
    const date = dateKey(playedAt, bundle.daily.timeZone);
    return bundle.daily.days.some((day) => day.date === date && day.level.id === levelId) ? date : null;
}

export function todayDaily(bundle: ContentBundle): DailyEntry | null {
    const today = dateKey(new Date(), bundle.daily.timeZone);
    return bundle.daily.days.find((day) => day.date === today) ?? null;
}

/**
 * Tout ce qu'il faut pour jouer, y compris hors ligne : le contenu embarqué, la progression du
 * serveur et les victoires pas encore envoyées, d'où se déduit le parcours.
 */
export function usePlayer() {
    const me = useMe();
    // Contenu et progression sont réservés aux joueurs : on attend la session.
    const content = useContent(Boolean(me.data));
    const sync = useSyncState(Boolean(me.data));
    const pending = usePendingResults(me.data?.id);

    const data = useMemo((): PlayerState | null => {
        if (!content.data || !sync.data) return null;
        const bundle = content.data;
        let records = new Map(Object.entries(sync.data.levels));
        const dailyResults = new Map(sync.data.daily.map((row) => [row.date, row.petals]));

        for (const entry of pending) {
            const petals = petalsFor(entry);
            records = recordWin(records, entry.levelId, petals, entry.durationMs);
            const date = dailyDateOf(bundle, entry.levelId, new Date(entry.playedAt));
            if (date && !dailyResults.has(date)) dailyResults.set(date, petals);
        }

        return {
            bundle,
            journey: buildJourney(bundle, records),
            records,
            dailyResults,
            pending,
            today: dateKey(new Date(), bundle.daily.timeZone),
        };
    }, [content.data, sync.data, pending]);

    const failed = content.error ?? sync.error;
    return {
        data,
        // Une erreur n'importe que si rien n'est en cache (sinon on joue avec ce que l'on a).
        error: data ? null : failed,
        retry: () => {
            void content.refetch();
            void sync.refetch();
        },
    };
}
