"use client";

import { plural } from "@/lib/format";
import { usePendingResults } from "@/lib/offline/outbox";
import { useOnline } from "@/lib/offline/sync";
import { useMe } from "@/lib/queries";
import styles from "./OfflineStatus.module.css";

/** Bandeau discret : hors ligne, le jeu continue ; les victoires partent au retour du réseau. */
export function OfflineStatus() {
    const online = useOnline();
    const { data: me } = useMe();
    const pending = usePendingResults(me?.id).length;

    if (online && pending === 0) return null;

    const waiting = pending > 0 ? ` ${plural(pending, "victoire")} en attente.` : "";
    return (
        <p className={styles.status} role="status" data-offline={!online || undefined}>
            <span aria-hidden>{online ? "↻" : "☾"}</span>
            {online
                ? `Enregistrement de ${plural(pending, "victoire")}…`
                : `Hors ligne : le jeu continue, tes victoires seront enregistrées au retour du réseau.${waiting}`}
        </p>
    );
}
