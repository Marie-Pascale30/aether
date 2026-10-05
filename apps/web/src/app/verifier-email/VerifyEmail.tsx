"use client";

import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Loading } from "@/components/ui/States";
import { useVerifyEmail } from "@/lib/queries";

export function VerifyEmail({ token }: { token: string }) {
    const verify = useVerifyEmail();
    const sent = useRef(false);

    useEffect(() => {
        // Ref : le jeton est à usage unique, il ne doit partir qu'une fois (mode strict de React).
        if (!token || sent.current) return;
        sent.current = true;
        verify.mutate(token);
    }, [token, verify]);

    if (token && (verify.isIdle || verify.isPending)) return <Loading label="Confirmation de ton adresse…" />;

    return (
        <Panel style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
            {verify.isSuccess ? (
                <>
                    <div className="tag">Adresse confirmée</div>
                    <h2>Merci, {verify.data.displayName}</h2>
                    <p style={{ marginInline: "auto" }}>Ton compte est sécurisé : tu pourras récupérer ton mot de passe si tu l&apos;oublies.</p>
                    <ButtonLink href="/mondes" variant="primary">
                        Retour au jeu
                    </ButtonLink>
                </>
            ) : (
                <>
                    <div className="tag">Lien invalide</div>
                    <h2>Confirmation impossible</h2>
                    <p style={{ marginInline: "auto" }}>
                        {verify.error?.message ?? "Ce lien est incomplet."} Tu peux demander un nouveau lien depuis ton profil.
                    </p>
                    <ButtonLink href="/profil" variant="primary">
                        Mon profil
                    </ButtonLink>
                </>
            )}
        </Panel>
    );
}
