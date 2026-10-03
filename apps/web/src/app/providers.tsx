"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient, type Query } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, type ReactNode } from "react";
import { ServiceWorker } from "@/lib/offline/ServiceWorker";
import { keys } from "@/lib/queries";
import { OutboxSync } from "@/lib/offline/sync";
import { SettingsProvider } from "@/lib/settings";
import { SoundProvider } from "@/lib/sound/SoundProvider";

/** Durée de vie du cache gardé sur l'appareil. */
const CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
/** À changer quand la forme des données en cache change : l'ancien cache est alors ignoré. */
const CACHE_BUSTER = "phase-3";
/** Gardé pour le hors ligne : joueur, contenu, progression, repères, énigme du jour. */
const PERSISTED_ROOTS = new Set(["me", "content", "daily"]);

const shouldPersist = (query: Query) => query.state.status === "success" && PERSISTED_ROOTS.has(String(query.queryKey[0]));

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    // Les requêtes restaurées doivent vivre au moins aussi longtemps que le cache persistant ;
                    // Infinity évite aussi un minuteur au-delà de la limite de setTimeout (~24,8 jours).
                    queries: { staleTime: 30_000, gcTime: Infinity, refetchOnWindowFocus: false },
                },
            }),
    );
    const [persister] = useState(() =>
        createSyncStoragePersister({
            storage: typeof window === "undefined" ? undefined : window.localStorage,
            key: "aether:cache",
            throttleTime: 1000,
        }),
    );

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: CACHE_BUSTER, dehydrateOptions: { shouldDehydrateQuery: shouldPersist } }}
            // Le joueur gardé sur l'appareil peut dater d'avant une connexion : on le revérifie aussitôt.
            onSuccess={() => void queryClient.invalidateQueries({ queryKey: keys.me, exact: true })}
        >
            <SettingsProvider>
                <SoundProvider>{children}</SoundProvider>
            </SettingsProvider>
            <OutboxSync />
            <ServiceWorker />
        </PersistQueryClientProvider>
    );
}
