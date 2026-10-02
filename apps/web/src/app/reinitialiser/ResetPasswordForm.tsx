"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { resetPasswordSchema } from "@aether/shared";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { useResetPassword } from "@/lib/queries";

export function ResetPasswordForm({ token }: { token: string }) {
    const router = useRouter();
    const reset = useResetPassword();
    const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const password = String(form.get("password") ?? "");
        if (password !== form.get("confirm")) {
            setErrors({ confirm: "Les deux mots de passe ne correspondent pas." });
            return;
        }
        const parsed = resetPasswordSchema.safeParse({ token, password });
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            setErrors(issue?.path[0] === "token" ? { form: issue.message } : { password: issue?.message });
            return;
        }
        setErrors({});
        try {
            await reset.mutateAsync(parsed.data);
            router.push("/mondes");
        } catch (err) {
            setErrors({ form: err instanceof Error ? err.message : "Échec, réessaie." });
        }
    }

    return (
        <Panel style={{ maxWidth: 460, margin: "40px auto 0" }}>
            <div className="tag">Retrouver l&apos;accès</div>
            <h2>Nouveau mot de passe</h2>
            {!token ? (
                <p>
                    Ce lien est incomplet. <Link href="/mot-de-passe-oublie">Demande un nouveau lien</Link>.
                </p>
            ) : (
                <form className="stack" onSubmit={onSubmit} noValidate>
                    <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" error={errors.password} hint="8 caractères minimum." />
                    <Field label="Confirmation" name="confirm" type="password" autoComplete="new-password" error={errors.confirm} />
                    {errors.form && (
                        <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
                            {errors.form} <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
                        </p>
                    )}
                    <small className="muted">Tes autres appareils seront déconnectés.</small>
                    <Button type="submit" variant="primary" disabled={reset.isPending}>
                        {reset.isPending ? "Un instant…" : "Enregistrer et me connecter"}
                    </Button>
                </form>
            )}
        </Panel>
    );
}
