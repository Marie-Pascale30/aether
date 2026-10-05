"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminLevel, AdminWorld } from "@aether/shared";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { useDragReorder } from "@/hooks/useDragReorder";
import { pad2 } from "@/lib/format";
import { countLabel, levelLabel } from "@/lib/kinds";
import { useAdminLevels, useAdminWorlds, useDeleteLevel, useDuplicateLevel, useReorderLevels } from "@/lib/queries";
import styles from "../admin.module.css";

export default function AdminLevelsPage() {
    const levels = useAdminLevels();
    const worlds = useAdminWorlds();
    const [error, setError] = useState<string>();

    const failure = levels.error ?? worlds.error;
    if (failure) return <ErrorState error={failure} onRetry={() => void Promise.all([levels.refetch(), worlds.refetch()])} />;
    if (!levels.data || !worlds.data) return <Loading />;

    return (
        <div className="stack">
            <Panel>
                <header className={styles.head}>
                    <div>
                        <div className="tag">Atelier des gardiens</div>
                        <h2>Énigmes</h2>
                    </div>
                    <div className="row">
                        <ButtonLink href="/admin/mondes" variant="ghost">
                            Gérer les mondes
                        </ButtonLink>
                        <ButtonLink href="/admin/niveaux/nouveau" variant="primary">
                            + Nouvelle énigme
                        </ButtonLink>
                    </div>
                </header>
                {error && (
                    <p className={styles.error} role="alert">
                        {error}
                    </p>
                )}
            </Panel>

            {worlds.data.map((world) => (
                <WorldLevels
                    key={world.id}
                    world={world}
                    levels={levels.data.filter((level) => level.worldId === world.id)}
                    onError={setError}
                />
            ))}
        </div>
    );
}

function WorldLevels({ world, levels, onError }: { world: AdminWorld; levels: AdminLevel[]; onError: (message: string) => void }) {
    const router = useRouter();
    const reorder = useReorderLevels();
    const remove = useDeleteLevel();
    const duplicate = useDuplicateLevel();
    const busy = reorder.isPending || remove.isPending || duplicate.isPending;
    const fail = { onError: (err: Error) => onError(err.message) };
    const drag = useDragReorder(
        levels.map((level) => level.id),
        (ids) => reorder.mutate({ worldId: world.id, ids }, fail),
    );

    const move = (index: number, delta: -1 | 1) => {
        const ids = levels.map((level) => level.id);
        const target = index + delta;
        if (target < 0 || target >= ids.length) return;
        [ids[index], ids[target]] = [ids[target]!, ids[index]!];
        reorder.mutate({ worldId: world.id, ids }, fail);
    };

    const onDelete = (level: AdminLevel) => {
        if (!window.confirm(`Supprimer « ${level.title} » ? La progression des joueurs sur cette énigme sera effacée.`)) return;
        remove.mutate(level.id, fail);
    };

    const onDuplicate = (level: AdminLevel) =>
        duplicate.mutate(level.id, { ...fail, onSuccess: (copy) => router.push(`/admin/niveaux/${copy.id}`) });

    // Numérotation du parcours joueur : seules les énigmes publiées comptent.
    let publishedPosition = 0;

    return (
        <Panel>
            <header className={styles.head}>
                <div>
                    <div className="tag">
                        Monde · {world.slug}
                        {!world.published && " · brouillon"}
                    </div>
                    <h3>{world.title}</h3>
                </div>
                <ButtonLink href={`/admin/niveaux/nouveau?monde=${world.id}`} variant="ghost">
                    + Énigme dans ce monde
                </ButtonLink>
            </header>

            {levels.length === 0 ? (
                <p className="muted">Ce monde ne contient encore aucune énigme.</p>
            ) : (
                <div className={styles.scroll}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col">
                                    <span className="visually-hidden">Déplacer</span>
                                </th>
                                <th scope="col">N°</th>
                                <th scope="col">Titre</th>
                                <th scope="col">Mécanique</th>
                                <th scope="col">État</th>
                                <th scope="col">Plateau</th>
                                <th scope="col">Ordre</th>
                                <th scope="col">
                                    <span className="visually-hidden">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {levels.map((level, i) => {
                                if (level.published) publishedPosition += 1;
                                return (
                                    <tr key={level.id} className={styles.row} data-draft={!level.published || undefined} {...drag.rowProps(level.id)}>
                                        <td className={styles.handle} title="Glisser pour déplacer" aria-hidden>
                                            ⠿
                                        </td>
                                        <td className={styles.position}>{level.published ? pad2(publishedPosition) : "—"}</td>
                                        <td>
                                            <Link href={`/admin/niveaux/${level.id}`}>{level.title}</Link>
                                        </td>
                                        <td className={styles.muted}>
                                            {levelLabel(level.mechanic, level.kind).glyph} {levelLabel(level.mechanic, level.kind).label}
                                        </td>
                                        <td>
                                            <span className={styles.badge} data-published={level.published}>
                                                {level.published ? "Publiée" : "Brouillon"}
                                            </span>
                                        </td>
                                        <td className={styles.muted}>
                                            {level.mechanic === "LINKS"
                                                ? `${level.symbols.length} cases · ${countLabel(level.kind, level.groups.length)}`
                                                : "Plateau généré"}
                                        </td>
                                        <td>
                                            <div className={styles.orderButtons}>
                                                <Button variant="ghost" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="Monter">
                                                    ↑
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => move(i, 1)}
                                                    disabled={busy || i === levels.length - 1}
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
                                                <Button variant="ghost" onClick={() => onDuplicate(level)} disabled={busy}>
                                                    Dupliquer
                                                </Button>
                                                <Button variant="danger" onClick={() => onDelete(level)} disabled={busy}>
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
            )}
        </Panel>
    );
}
