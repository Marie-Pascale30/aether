"use client";

import { useState, type FormEvent } from "react";
import { WORLD_THEMES, worldInputSchema, type AdminWorld, type WorldInput, type WorldTheme } from "@aether/shared";
import { Garden } from "@/components/garden/Garden";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import { useAdminWorlds, useCreateWorld, useDeleteWorld, useReorderWorlds, useUpdateWorld } from "@/lib/queries";
import styles from "../admin.module.css";

const THEME_LABELS: Record<WorldTheme, string> = {
    origines: "Origines (vert tendre)",
    foret: "Forêt (vert profond)",
    ocean: "Océan (bleu-vert)",
    cosmos: "Cosmos (violet)",
};

const EMPTY: WorldInput = { slug: "", title: "", tagline: "", description: "", theme: "origines", published: false };

export default function AdminWorldsPage() {
    const worlds = useAdminWorlds();
    const reorder = useReorderWorlds();
    const remove = useDeleteWorld();
    const [editing, setEditing] = useState<string | "new" | null>(null);
    const [error, setError] = useState<string>();

    if (worlds.error) return <ErrorState error={worlds.error} onRetry={() => void worlds.refetch()} />;
    if (!worlds.data) return <Loading />;

    const list = worlds.data;
    const fail = { onError: (err: Error) => setError(err.message) };

    const move = (index: number, delta: -1 | 1) => {
        const ids = list.map((world) => world.id);
        const target = index + delta;
        if (target < 0 || target >= ids.length) return;
        [ids[index], ids[target]] = [ids[target]!, ids[index]!];
        reorder.mutate(ids, fail);
    };

    const onDelete = (world: AdminWorld) => {
        if (!window.confirm(`Supprimer le monde « ${world.title} » ?`)) return;
        remove.mutate(world.id, fail);
    };

    return (
        <div className="stack">
            <Panel>
                <header className={styles.head}>
                    <div>
                        <div className="tag">Atelier des gardiens</div>
                        <h2>Mondes</h2>
                        <p>Les joueurs les parcourent dans cet ordre : un monde s&apos;ouvre quand le précédent est entièrement restauré.</p>
                    </div>
                    <div className="row">
                        <ButtonLink href="/admin/niveaux" variant="ghost">
                            ← Énigmes
                        </ButtonLink>
                        <Button variant="primary" onClick={() => setEditing("new")}>
                            + Nouveau monde
                        </Button>
                    </div>
                </header>
                {error && (
                    <p className={styles.error} role="alert">
                        {error}
                    </p>
                )}
            </Panel>

            {editing === "new" && <WorldForm onDone={() => setEditing(null)} />}

            {list.map((world, i) =>
                editing === world.id ? (
                    <WorldForm key={world.id} world={world} onDone={() => setEditing(null)} />
                ) : (
                    <Panel key={world.id} className={styles.worldRow}>
                        <Garden stage={3} theme={world.theme} instant className={styles.worldThumb} />
                        <div className={styles.worldInfo}>
                            <div className="tag">
                                Monde {i + 1} · {world.slug}
                            </div>
                            <h3>{world.title}</h3>
                            <p className={styles.muted}>{world.tagline}</p>
                            <span className={styles.badge} data-published={world.published}>
                                {world.published ? "Publié" : "Brouillon"}
                            </span>{" "}
                            <span className={styles.muted}>{world.levelCount} énigme{world.levelCount > 1 ? "s" : ""}</span>
                        </div>
                        <div className={styles.worldActions}>
                            <div className={styles.orderButtons}>
                                <Button variant="ghost" onClick={() => move(i, -1)} disabled={reorder.isPending || i === 0} aria-label="Monter">
                                    ↑
                                </Button>
                                <Button variant="ghost" onClick={() => move(i, 1)} disabled={reorder.isPending || i === list.length - 1} aria-label="Descendre">
                                    ↓
                                </Button>
                            </div>
                            <Button onClick={() => setEditing(world.id)}>Modifier</Button>
                            <Button
                                variant="danger"
                                onClick={() => onDelete(world)}
                                disabled={remove.isPending || world.levelCount > 0}
                                title={world.levelCount > 0 ? "Vide d'abord ce monde de ses énigmes" : undefined}
                            >
                                Supprimer
                            </Button>
                        </div>
                    </Panel>
                ),
            )}
        </div>
    );
}

function WorldForm({ world, onDone }: { world?: AdminWorld; onDone: () => void }) {
    const create = useCreateWorld();
    const update = useUpdateWorld();
    const [draft, setDraft] = useState<WorldInput>(() => (world ? { ...world } : EMPTY));
    const [errors, setErrors] = useState<Partial<Record<keyof WorldInput | "form", string>>>({});
    const set = <K extends keyof WorldInput>(key: K, value: WorldInput[K]) => setDraft((current) => ({ ...current, [key]: value }));

    async function onSubmit(event: FormEvent) {
        event.preventDefault();
        const parsed = worldInputSchema.safeParse(draft);
        if (!parsed.success) {
            const next: typeof errors = {};
            for (const issue of parsed.error.issues) next[issue.path[0] as keyof WorldInput] ??= issue.message;
            setErrors(next);
            return;
        }
        try {
            if (world) await update.mutateAsync({ id: world.id, input: parsed.data });
            else await create.mutateAsync(parsed.data);
            onDone();
        } catch (error) {
            setErrors({ form: error instanceof ApiError || error instanceof Error ? error.message : "Échec de l'enregistrement." });
        }
    }

    return (
        <Panel>
            <form className="stack" onSubmit={onSubmit} noValidate>
                <h3>{world ? `Modifier « ${world.title} »` : "Nouveau monde"}</h3>
                <div className={styles.formGrid}>
                    <Field label="Titre" value={draft.title} onChange={(e) => set("title", e.target.value)} error={errors.title} />
                    <Field
                        label="Identifiant d'URL"
                        value={draft.slug}
                        onChange={(e) => set("slug", e.target.value)}
                        error={errors.slug}
                        hint="/mondes/<identifiant> — minuscules et tirets"
                    />
                </div>
                <Field label="Accroche" value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} error={errors.tagline} />
                <TextArea label="Description" value={draft.description} onChange={(e) => set("description", e.target.value)} error={errors.description} />
                <div className={styles.formGrid}>
                    <label className={styles.selectField}>
                        Ambiance du jardin
                        <select value={draft.theme} onChange={(e) => set("theme", e.target.value as WorldTheme)}>
                            {WORLD_THEMES.map((theme) => (
                                <option key={theme} value={theme}>
                                    {THEME_LABELS[theme]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.checkbox}>
                        <input type="checkbox" checked={draft.published} onChange={(e) => set("published", e.target.checked)} />
                        Publié (visible des joueurs)
                    </label>
                </div>
                <Garden stage={4} theme={draft.theme} instant className={styles.preview} />
                {errors.form && (
                    <p className={styles.error} role="alert">
                        {errors.form}
                    </p>
                )}
                <div className="row">
                    <Button type="submit" variant="primary" disabled={create.isPending || update.isPending}>
                        Enregistrer
                    </Button>
                    <Button variant="ghost" onClick={onDone}>
                        Annuler
                    </Button>
                </div>
            </form>
        </Panel>
    );
}
