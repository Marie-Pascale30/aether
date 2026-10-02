"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportError";

/**
 * Dernier recours si la mise en page racine elle-même échoue. Elle remplace tout le document :
 * les styles globaux ne s'appliquent pas, d'où les styles en ligne.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
    useEffect(() => reportClientError("boundary", error, error.digest), [error]);

    return (
        <html lang="fr">
            <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#07131b", color: "#edf1df", fontFamily: "system-ui, sans-serif" }}>
                <title>AETHER · Erreur</title>
                <div style={{ textAlign: "center", padding: 24 }}>
                    <div style={{ color: "#d9bd72", letterSpacing: ".3em", fontSize: 13, fontWeight: 700 }}>AETHER</div>
                    <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>Le jardin s&apos;est assoupi</h1>
                    <p style={{ color: "#9db4ad" }}>Une erreur inattendue est survenue ; elle a été signalée.</p>
                    <button
                        type="button"
                        onClick={retry}
                        style={{ background: "#d9bd72", color: "#132019", border: 0, borderRadius: 999, padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}
                    >
                        Réessayer
                    </button>
                </div>
            </body>
        </html>
    );
}
