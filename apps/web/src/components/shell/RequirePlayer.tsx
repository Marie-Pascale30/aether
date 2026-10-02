"use client";

import { useEffect, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { useMe, useStartAsGuest } from "@/lib/queries";
import { signedOut } from "@/lib/signedOut";

/**
 * Les pages de jeu exigent un joueur. Sans session, on en ouvre une en invité, sans
 * formulaire : on joue tout de suite, et on crée un compte plus tard si on le souhaite.
 * Exception : juste après une déconnexion volontaire, on laisse le choix.
 */
export function RequirePlayer({ children }: { children: ReactNode }) {
    const me = useMe();
    const guest = useStartAsGuest();

    // Lu au rendu (et non dans un effet) : sinon l'invité serait créé avant que l'indicateur
    // soit pris en compte. `me.data` n'est jamais `null` côté serveur, donc pas d'écart d'hydratation.
    const noSession = me.isSuccess && me.data === null;
    const afterSignOut = noSession && signedOut.get();
    const needsGuest = noSession && !afterSignOut;

    useEffect(() => {
        if (needsGuest && guest.isIdle) guest.mutate();
    }, [needsGuest, guest]);

    if (me.error) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
    if (guest.error) return <ErrorState error={guest.error} onRetry={() => guest.mutate()} />;

    if (afterSignOut) {
        return (
            <Panel style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
                <div className="tag">À bientôt</div>
                <h2>Session fermée</h2>
                <p style={{ marginInline: "auto" }}>Reprends ton compte, ou pars pour une nouvelle promenade en invité.</p>
                <div className="row" style={{ justifyContent: "center" }}>
                    <ButtonLink href="/connexion" variant="primary">
                        Me reconnecter
                    </ButtonLink>
                    <Button onClick={() => guest.mutate()} disabled={guest.isPending}>
                        Jouer en invité
                    </Button>
                </div>
            </Panel>
        );
    }

    if (!me.data) return <Loading />;
    return <>{children}</>;
}
