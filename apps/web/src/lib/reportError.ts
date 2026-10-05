import type { ClientErrorInput } from "@aether/shared";

const MAX_REPORTS_PER_PAGE = 10;
let sent = 0;

/**
 * Envoie une erreur du navigateur au journal de l'API. Ne lève jamais : un rapport perdu
 * ne doit pas provoquer une seconde erreur. Plafonné pour ne pas inonder le serveur.
 */
export function reportClientError(kind: ClientErrorInput["kind"], error: unknown, digest?: string): void {
    try {
        if (typeof window === "undefined" || sent >= MAX_REPORTS_PER_PAGE) return;
        sent += 1;

        const err = error instanceof Error ? error : new Error(String(error));
        const report: ClientErrorInput = {
            kind,
            message: err.message.slice(0, 2000) || "(sans message)",
            stack: err.stack?.slice(0, 8000),
            url: window.location.href.slice(0, 2000),
            digest,
        };

        const body = JSON.stringify(report);
        const beacon = navigator.sendBeacon?.("/api/client-errors", new Blob([body], { type: "application/json" }));
        if (!beacon) {
            void fetch("/api/client-errors", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
        }
    } catch {
        // rapport impossible : on abandonne silencieusement
    }
}
