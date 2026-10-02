"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { displayNameSchema } from "@aether/shared";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { Stars } from "@/components/ui/Stars";
import { ErrorState, Loading } from "@/components/ui/States";
import { formatDuration, pad2 } from "@/lib/format";
import { useLogout, useMe, useStats, useUpdateDisplayName } from "@/lib/queries";
import styles from "./profil.module.css";

export function ProfileView() {
    const { data: me } = useMe();
    const stats = useStats();

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
                    <h2>Statistiques</h2>

                    <dl className={styles.totals}>
                        <Total label="Étoiles" value={stats.data.totals.totalStars} />
                        <Total label="Énigmes résolues" value={stats.data.levels.filter((level) => level.completions > 0).length} />
                        <Total label="Parties" value={stats.data.totals.sessions} />
                        <Total label="Erreurs" value={stats.data.totals.mistakes} />
                        <Total label="Indices" value={stats.data.totals.hintsUsed} />
                        <Total label="Temps de jeu" value={formatDuration(stats.data.totals.playTimeMs)} />
                    </dl>

                    <div className={styles.scroll}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th scope="col">Monde</th>
                                    <th scope="col">Énigme</th>
                                    <th scope="col">Meilleur</th>
                                    <th scope="col">Temps</th>
                                    <th scope="col">Résolue</th>
                                    <th scope="col">Parties</th>
                                    <th scope="col">Erreurs</th>
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
                                        <td>{level.bestStars === null ? "—" : <Stars count={level.bestStars} size="sm" />}</td>
                                        <td>{level.bestTimeMs === null ? "—" : formatDuration(level.bestTimeMs)}</td>
                                        <td>{level.completions}×</td>
                                        <td>{level.sessions}</td>
                                        <td>{level.mistakes}</td>
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
                retrouver partout et apparaître au classement.
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
            <p className={styles.email}>{me.email}</p>

            <form className={styles.nameForm} onSubmit={onSubmit}>
                <Field
                    label="Pseudo"
                    name="displayName"
                    defaultValue={me.displayName}
                    error={error}
                    hint={saved ? "Enregistré ✓" : "Affiché au classement."}
                />
                <Button type="submit" disabled={update.isPending}>
                    Enregistrer
                </Button>
            </form>

            <Button variant="ghost" onClick={onLogout} disabled={logout.isPending}>
                Se déconnecter
            </Button>
        </Panel>
    );
}
