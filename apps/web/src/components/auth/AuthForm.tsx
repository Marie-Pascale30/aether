"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { loginSchema, registerSchema } from "@aether/shared";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { ApiError } from "@/lib/api";
import { useLogin, useMe, useRegister } from "@/lib/queries";
import styles from "./AuthForm.module.css";

type Mode = "login" | "register";
type Errors = Partial<Record<"displayName" | "email" | "password" | "form", string>>;
type Issue = { path: PropertyKey[]; message: string };

/** Premier message d'erreur par champ, depuis Zod (client) ou l'API (`issues`). */
function toErrors(issues: Issue[]): Errors {
    const errors: Errors = {};
    for (const issue of issues) {
        const key = (issue.path[0] as keyof Errors | undefined) ?? "form";
        errors[key] ??= issue.message;
    }
    return errors;
}

/** N'accepte qu'une redirection interne (évite les redirections ouvertes vers un autre site). */
function safeNext(next: string | null): string {
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/mondes";
}

export function AuthForm({ mode }: { mode: Mode }) {
    const router = useRouter();
    const next = safeNext(useSearchParams().get("next"));
    const { data: me } = useMe();
    const login = useLogin();
    const register = useRegister();
    const [errors, setErrors] = useState<Errors>({});

    const pending = login.isPending || register.isPending;
    const isRegister = mode === "register";

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));

        // Même schéma que l'API : les erreurs de saisie s'affichent sans aller-retour serveur.
        // Renvoie les erreurs de validation, ou `null` si le compte est ouvert.
        const submit = async (): Promise<Issue[] | null> => {
            if (isRegister) {
                const parsed = registerSchema.safeParse(values);
                if (!parsed.success) return parsed.error.issues;
                await register.mutateAsync(parsed.data);
                return null;
            }
            const parsed = loginSchema.safeParse(values);
            if (!parsed.success) return parsed.error.issues;
            await login.mutateAsync(parsed.data);
            return null;
        };

        setErrors({});
        try {
            const issues = await submit();
            if (issues) {
                setErrors(toErrors(issues));
                return;
            }
            router.push(next);
        } catch (error) {
            if (error instanceof ApiError && error.issues.length) setErrors(toErrors(error.issues));
            else setErrors({ form: error instanceof Error ? error.message : "Échec, réessaie." });
        }
    }

    return (
        <Panel className={styles.panel}>
            <div className="tag">{isRegister ? "Rejoindre les gardiens" : "Retour au jardin"}</div>
            <h2>{isRegister ? "Créer un compte" : "Connexion"}</h2>

            {me?.isGuest && (
                <p className={styles.note}>
                    {isRegister
                        ? "Tu joues en invité : ta progression actuelle sera rattachée à ce compte."
                        : "Ta progression d'invité sera fusionnée avec ton compte (le meilleur résultat de chaque énigme est gardé)."}
                </p>
            )}

            <form className="stack" onSubmit={onSubmit} noValidate>
                {isRegister && (
                    <Field label="Pseudo" name="displayName" autoComplete="nickname" error={errors.displayName} hint="Le nom que te donnera le Gardien." />
                )}
                <Field label="Adresse e-mail" name="email" type="email" autoComplete="email" error={errors.email} />
                <Field
                    label="Mot de passe"
                    name="password"
                    type="password"
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    error={errors.password}
                    hint={isRegister ? "8 caractères minimum." : undefined}
                />
                {!isRegister && (
                    <Link href="/mot-de-passe-oublie" className={styles.forgot}>
                        Mot de passe oublié ?
                    </Link>
                )}

                {errors.form && (
                    <p className={styles.formError} role="alert">
                        {errors.form}
                    </p>
                )}

                <Button type="submit" variant="primary" disabled={pending}>
                    {pending ? "Un instant…" : isRegister ? "Créer mon compte" : "Me connecter"}
                </Button>
            </form>

            <p className={styles.switch}>
                {isRegister ? (
                    <>
                        Déjà un compte ? <Link href={`/connexion?next=${encodeURIComponent(next)}`}>Se connecter</Link>
                    </>
                ) : (
                    <>
                        Pas encore de compte ? <Link href={`/inscription?next=${encodeURIComponent(next)}`}>En créer un</Link>
                    </>
                )}
            </p>
        </Panel>
    );
}
