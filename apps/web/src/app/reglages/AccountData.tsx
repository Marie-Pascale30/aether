"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { useDeleteAccount, useMe } from "@/lib/queries";
import styles from "./reglages.module.css";

/** Données personnelles : export (droits d'accès et de portabilité), suppression du compte, mentions. */
export function AccountData() {
    const { data: me } = useMe();
    const [deleted, setDeleted] = useState(false);

    return (
        <section className={styles.section} aria-labelledby="reglages-donnees">
            <h3 id="reglages-donnees">Mes données</h3>
            {deleted ? (
                <p className={styles.notice} role="status">
                    Ton compte et toute ta progression ont été supprimés. Merci d&apos;avoir pris soin du jardin.{" "}
                    <Link href="/">Revenir à l&apos;accueil</Link>
                </p>
            ) : (
                me && (
                    <>
                        <ExportButton />
                        <DeleteAccount isGuest={me.isGuest} isAdmin={me.role === "ADMIN"} onDeleted={() => setDeleted(true)} />
                    </>
                )
            )}
            <p className={styles.legal}>
                <Link href="/confidentialite">Politique de confidentialité</Link> · <Link href="/mentions-legales">Mentions légales</Link>
            </p>
        </section>
    );
}

function ExportButton() {
    const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");

    async function onExport() {
        setState("pending");
        try {
            const data = await api.me.export();
            const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `aether-mes-donnees-${data.exportedAt.slice(0, 10)}.json`;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
            setState("done");
        } catch {
            setState("error");
        }
    }

    return (
        <div className={styles.stackStart}>
            <p className={styles.explain}>
                Télécharge une copie de tout ce que le jeu garde sur toi : profil, progression, énigmes du jour, repères et parties
                (fichier JSON).
            </p>
            <Button variant="ghost" onClick={onExport} disabled={state === "pending"}>
                {state === "pending" ? "Préparation…" : "Exporter mes données"}
            </Button>
            {state === "done" && (
                <small className={styles.ok} role="status">
                    Fichier téléchargé ✓
                </small>
            )}
            {state === "error" && (
                <small className={styles.error} role="alert">
                    L&apos;export a échoué. Vérifie ta connexion et réessaie.
                </small>
            )}
        </div>
    );
}

function DeleteAccount({ isGuest, isAdmin, onDeleted }: { isGuest: boolean; isAdmin: boolean; onDeleted: () => void }) {
    const remove = useDeleteAccount();
    const [open, setOpen] = useState(false);
    const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});

    if (isAdmin) {
        return <p className={styles.explain}>Un compte administrateur ne se supprime pas depuis le jeu.</p>;
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const password = String(form.get("password") ?? "");
        const next: typeof errors = {};
        if (!isGuest && !password) next.password = "Saisis ton mot de passe pour confirmer.";
        if (form.get("confirm") !== "on") next.confirm = "Coche la case pour confirmer.";
        setErrors(next);
        if (Object.keys(next).length) return;

        try {
            await remove.mutateAsync(isGuest ? undefined : password);
            onDeleted();
        } catch (error) {
            const issue = error instanceof ApiError ? error.issues.find((found) => found.path[0] === "password") : undefined;
            setErrors(issue ? { password: issue.message } : { form: error instanceof Error ? error.message : "La suppression a échoué." });
        }
    }

    if (!open) {
        return (
            <Button variant="danger" onClick={() => setOpen(true)}>
                Supprimer mon compte
            </Button>
        );
    }

    return (
        <form className={styles.danger} onSubmit={onSubmit} noValidate>
            <h4>Supprimer mon compte</h4>
            <p>
                {isGuest
                    ? "Ta progression d'invité sera effacée définitivement : mondes restaurés, pétales, énigmes du jour et repères."
                    : "Ton compte sera effacé définitivement, avec toute ta progression : mondes restaurés, pétales, énigmes du jour et repères. Cette action est irréversible."}
            </p>
            {!isGuest && (
                <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" error={errors.password} maxLength={128} />
            )}
            <label className={styles.confirm}>
                <input type="checkbox" name="confirm" aria-invalid={Boolean(errors.confirm)} />
                <span>Je comprends que la suppression est définitive.</span>
            </label>
            {errors.confirm && <small className={styles.error}>{errors.confirm}</small>}
            {errors.form && (
                <small className={styles.error} role="alert">
                    {errors.form}
                </small>
            )}
            <div className="row">
                <Button type="submit" variant="danger" disabled={remove.isPending}>
                    {remove.isPending ? "Suppression…" : "Supprimer définitivement"}
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                    Annuler
                </Button>
            </div>
        </form>
    );
}
