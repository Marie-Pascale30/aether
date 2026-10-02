"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { pad2 } from "@/lib/format";
import { useAdminLevels, useDeleteLevel, useReorderLevels } from "@/lib/queries";
import styles from "../admin.module.css";

export default function AdminLevelsPage() {
    const levels = useAdminLevels();
    const reorder = useReorderLevels();
    const remove = useDeleteLevel();
    const [error, setError] = useState<string>();

    if (levels.error) return <ErrorState error={levels.error} onRetry={() => void levels.refetch()} />;
    if (!levels.data) return <Loading />;

    const list = levels.data;
    const busy = reorder.isPending || remove.isPending;

    const move = (index: number, delta: -1 | 1) => {
        const ids = list.map((level) => level.id);
        const target = index + delta;
        if (target < 0 || target >= ids.length) return;
        [ids[index], ids[target]] = [ids[target]!, ids[index]!];
        reorder.mutate(ids, { onError: (err) => setError(err.message) });
    };

    const onDelete = (id: string, title: string) => {
        if (!window.confirm(`Supprimer « ${title} » ? La progression des joueurs sur cette énigme sera effacée.`)) return;
        remove.mutate(id, { onError: (err) => setError(err.message) });
    };

    // Numérotation du parcours joueur : seules les énigmes publiées comptent.
    let publishedPosition = 0;

    return (
        <Panel>
            <header className={styles.head}>
                <div>
                    <div className="tag">Atelier des gardiens</div>
                    <h2>Énigmes</h2>
                </div>
                <ButtonLink href="/admin/niveaux/nouveau" variant="primary">
                    + Nouvelle énigme
                </ButtonLink>
            </header>

            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}

            <div className={styles.scroll}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th scope="col">N°</th>
                            <th scope="col">Titre</th>
                            <th scope="col">État</th>
                            <th scope="col">Plateau</th>
                            <th scope="col">Ordre</th>
                            <th scope="col">
                                <span className="visually-hidden">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((level, i) => {
                            if (level.published) publishedPosition += 1;
                            return (
                                <tr key={level.id} data-draft={!level.published || undefined}>
                                    <td className={styles.position}>{level.published ? pad2(publishedPosition) : "—"}</td>
                                    <td>
                                        <Link href={`/admin/niveaux/${level.id}`}>{level.title}</Link>
                                    </td>
                                    <td>
                                        <span className={styles.badge} data-published={level.published}>
                                            {level.published ? "Publiée" : "Brouillon"}
                                        </span>
                                    </td>
                                    <td className={styles.muted}>
                                        {level.symbols.length} cases · {level.pairs.length} lien{level.pairs.length > 1 ? "s" : ""}
                                    </td>
                                    <td>
                                        <div className={styles.orderButtons}>
                                            <Button variant="ghost" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="Monter">
                                                ↑
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => move(i, 1)}
                                                disabled={busy || i === list.length - 1}
                                                aria-label="Descendre"
                                            >
                                                ↓
                                            </Button>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.rowActions}>
                                            <ButtonLink href={`/niveaux/${level.id}`} variant="ghost">
                                                Tester
                                            </ButtonLink>
                                            <Button variant="danger" onClick={() => onDelete(level.id, level.title)} disabled={busy}>
                                                Supprimer
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}
