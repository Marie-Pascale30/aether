"use client";

import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Loading } from "@/components/ui/States";
import { useMe } from "@/lib/queries";

/** L'API refuse de toute façon les non-administrateurs ; ce garde évite seulement un écran d'erreur. */
export default function AdminLayout({ children }: { children: ReactNode }) {
    const me = useMe();

    if (me.isPending) return <Loading />;
    if (me.data?.role !== "ADMIN") {
        return (
            <Panel style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
                <div className="tag">Accès réservé</div>
                <h2>L&apos;atelier des gardiens</h2>
                <p style={{ marginInline: "auto" }}>Cet espace est réservé aux administrateurs du jardin.</p>
                <ButtonLink href={me.data && !me.data.isGuest ? "/" : "/connexion?next=/admin/niveaux"} variant="primary">
                    {me.data && !me.data.isGuest ? "Retour à l'accueil" : "Se connecter"}
                </ButtonLink>
            </Panel>
        );
    }
    return <>{children}</>;
}
