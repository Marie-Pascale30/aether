"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { changePasswordSchema, displayNameSchema } from "@aether/shared";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { Harmony } from "@/components/ui/Harmony";
import { ErrorState, Loading } from "@/components/ui/States";
import { formatDuration, pad2 } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { useSettings } from "@/lib/settings";
import { useChangePassword, useLogout, useMe, useResendVerification, useStats, useUpdateDisplayName } from "@/lib/queries";
import styles from "./profil.module.css";

export function ProfileView() {
    const { data: me } = useMe();
    const stats = useStats();
    const { settings } = useSettings();

    return (
        <div className="stack">
            {me?.isGuest ? <GuestCard /> : <AccountCard />}
            {stats.error ? (
                <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
            ) : !stats.data ? (
                <Loading />
            ) : (
                <Panel>
                    <div className="tag">Carnet de route</div>
                    <h2>Ton chemin</h2>
                    <p className="muted">Ici, on ne se compare qu&apos;à soi-même.</p>

                    <dl className={styles.totals}>
                        <Total label="Pétales d'harmonie" value={stats.data.totals.harmony} />
                        <Total label="Énigmes résolues" value={stats.data.levels.filter((level) => level.completions > 0).length} />
                        <Total label="Parties" value={stats.data.totals.sessions} />
                        <Total label="Indices écoutés" value={stats.data.totals.hintsUsed} />
                        <Total label="Temps passé à jouer" value={formatDuration(stats.data.totals.playTimeMs)} />
                    </dl>

                    <div className={styles.scroll}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th scope="col">Monde</th>
                                    <th scope="col">Énigme</th>
                                    <th scope="col">Harmonie</th>
                                    {settings.showTimer && <th scope="col">Meilleur temps</th>}
                                    <th scope="col">Résolue</th>
                                    <th scope="col">Parties</th>
                                    <th scope="col">Indices</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.data.levels.map((level) => (
                                    <tr key={level.levelId}>
                                        <td className={styles.world}>{level.worldTitle}</td>
                                        <td>
                                            <span className={styles.position}>{pad2(level.position)}</span> {level.title}
                                        </td>
                                        <td>{level.petals === 0 ? "—" : <Harmony petals={level.petals} size="sm" />}</td>
                                        {settings.showTimer && <td>{level.bestTimeMs === null ? "—" : formatDuration(level.bestTimeMs)}</td>}
                                        <td>{level.completions}×</td>
                                        <td>{level.sessions}</td>
                                        <td>{level.hintsUsed}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}
        </div>
    );
}

function Total({ label, value }: { label: string; value: number | string }) {
    return (
        <div>
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function GuestCard() {
    return (
        <Panel>
            <div className="tag">Invité</div>
            <h2>Ta progression t&apos;attend</h2>
            <p>
                Tu joues sans compte : ta progression est sauvegardée sur ce navigateur. Crée un compte pour la
                retrouver sur tous tes appareils.
            </p>
            <div className="row">
                <ButtonLink href="/inscription?next=/profil" variant="primary">
                    Créer un compte
                </ButtonLink>
                <ButtonLink href="/connexion?next=/profil" variant="ghost">
                    J&apos;ai déjà un compte
                </ButtonLink>
            </div>
        </Panel>
    );
}

function AccountCard() {
    const router = useRouter();
    const { data: me } = useMe();
    const update = useUpdateDisplayName();
    const logout = useLogout();
    const [error, setError] = useState<string>();
    const [saved, setSaved] = useState(false);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaved(false);
        const parsed = displayNameSchema.safeParse(new FormData(event.currentTarget).get("displayName"));
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message);
            return;
        }
        setError(undefined);
        try {
            await update.mutateAsync(parsed.data);
            setSaved(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
        }
    }

    async function onLogout() {
        await logout.mutateAsync();
        router.push("/");
    }

    if (!me) return null;

    return (
        <Panel>
            <div className="tag">Gardien</div>
            <h2>{me.displayName}</h2>
            <p className={styles.email}>
                {me.email}
                {me.emailVerified && <span className={styles.verified}> · adresse confirmée ✓</span>}
            </p>
            {!me.emailVerified && <VerifyReminder />}

            <form className={styles.nameForm} onSubmit={onSubmit}>
                <Field
                    label="Pseudo"
                    name="displayName"
                    defaultValue={me.displayName}
                    error={error}
                    hint={saved ? "Enregistré ✓" : "Le nom que te donnera le Gardien."}
                />
                <Button type="submit" disabled={update.isPending}>
                    Enregistrer
                </Button>
            </form>

            <ChangePasswordForm />

            <Button variant="ghost" onClick={onLogout} disabled={logout.isPending}>
                Se déconnecter
            </Button>
        </Panel>
    );
}

function VerifyReminder() {
    const resend = useResendVerification();
    return (
        <div className={styles.reminder} role="status">
            <span>Ton adresse n&apos;est pas encore confirmée : sans elle, impossible de récupérer ton mot de passe.</span>
            {resend.isSuccess ? (
                <span className={styles.verified}>Lien envoyé ✓</span>
            ) : (
                <Button variant="ghost" onClick={() => resend.mutate()} disabled={resend.isPending}>
                    Renvoyer le lien
                </Button>
            )}
            {resend.error && <small className={styles.formError}>{resend.error.message}</small>}
        </div>
    );
}

type PasswordErrors = Partial<Record<"currentPassword" | "newPassword" | "form", string>>;

function ChangePasswordForm() {
    const change = useChangePassword();
    const [open, setOpen] = useState(false);
    const [errors, setErrors] = useState<PasswordErrors>({});
    const [done, setDone] = useState(false);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const parsed = changePasswordSchema.safeParse(Object.fromEntries(new FormData(form)));
        if (!parsed.success) {
            const next: PasswordErrors = {};
            for (const issue of parsed.error.issues) next[issue.path[0] as keyof PasswordErrors] ??= issue.message;
            setErrors(next);
            return;
        }
        setErrors({});
        try {
            await change.mutateAsync(parsed.data);
            form.reset();
            setDone(true);
            setOpen(false);
        } catch (err) {
            const issue = err instanceof ApiError ? err.issues[0] : undefined;
            setErrors(issue ? { [issue.path[0] as keyof PasswordErrors]: issue.message } : { form: err instanceof Error ? err.message : "Échec." });
        }
    }

    if (!open) {
        return (
            <p className={styles.passwordRow}>
                {done && <span className={styles.verified}>Mot de passe changé ✓ Tes autres appareils ont été déconnectés. </span>}
                <Button variant="ghost" onClick={() => setOpen(true)}>
                    Changer de mot de passe
                </Button>
            </p>
        );
    }

    return (
        <form className={styles.passwordForm} onSubmit={onSubmit} noValidate>
            <Field label="Mot de passe actuel" name="currentPassword" type="password" autoComplete="current-password" error={errors.currentPassword} />
            <Field
                label="Nouveau mot de passe"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                error={errors.newPassword}
                hint="8 caractères minimum. Tes autres appareils seront déconnectés."
            />
            {errors.form && <small className={styles.formError}>{errors.form}</small>}
            <div className="row">
                <Button type="submit" variant="primary" disabled={change.isPending}>
                    Enregistrer
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                    Annuler
                </Button>
            </div>
        </form>
    );
}
