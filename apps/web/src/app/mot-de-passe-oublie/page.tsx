"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { forgotPasswordSchema } from "@aether/shared";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { useForgotPassword } from "@/lib/queries";

export default function ForgotPasswordPage() {
    const forgot = useForgotPassword();
    const [error, setError] = useState<string>();
    const [sentTo, setSentTo] = useState<string | null>(null);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message);
            return;
        }
        setError(undefined);
        try {
            await forgot.mutateAsync(parsed.data.email);
            setSentTo(parsed.data.email);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Envoi impossible, réessaie.");
        }
    }

    return (
        <Panel style={{ maxWidth: 460, margin: "40px auto 0" }}>
            <div className="tag">Retrouver l&apos;accès</div>
            <h2>Mot de passe oublié</h2>
            {sentTo ? (
                <>
                    <p role="status">
                        Si un compte existe pour <b>{sentTo}</b>, un lien pour choisir un nouveau mot de passe vient d&apos;y être envoyé. Il
                        est valable une heure.
                    </p>
                    <Link href="/connexion">Retour à la connexion</Link>
                </>
            ) : (
                <form className="stack" onSubmit={onSubmit} noValidate>
                    <p>Indique l&apos;adresse de ton compte : tu recevras un lien pour choisir un nouveau mot de passe.</p>
                    <Field label="Adresse e-mail" name="email" type="email" autoComplete="email" error={error} />
                    <Button type="submit" variant="primary" disabled={forgot.isPending}>
                        {forgot.isPending ? "Envoi…" : "Recevoir le lien"}
                    </Button>
                    <Link href="/connexion">Retour à la connexion</Link>
                </form>
            )}
        </Panel>
    );
}
