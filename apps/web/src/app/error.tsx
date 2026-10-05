"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { reportClientError } from "@/lib/reportError";

export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
    useEffect(() => reportClientError("boundary", error, error.digest), [error]);

    return (
        <Panel style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
            <div className="tag">Un souffle a manqué</div>
            <h2>Quelque chose s&apos;est brisé</h2>
            <p style={{ marginInline: "auto" }}>
                L&apos;incident a été signalé. Tu peux réessayer, ou revenir à l&apos;accueil.
                {error.digest && (
                    <>
                        <br />
                        <small className="muted">Référence : {error.digest}</small>
                    </>
                )}
            </p>
            <div className="row" style={{ justifyContent: "center" }}>
                <Button variant="primary" onClick={retry}>
                    Réessayer
                </Button>
                <ButtonLink href="/">Accueil</ButtonLink>
            </div>
        </Panel>
    );
}
