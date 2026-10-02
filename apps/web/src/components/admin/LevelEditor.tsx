"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { LEVEL_LIMITS as L, levelInputSchema, type AdminLevel, type LevelInput, type Pair } from "@aether/shared";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { ApiError, type ApiIssue } from "@/lib/api";
import { useCreateLevel, useUpdateLevel } from "@/lib/queries";
import styles from "./LevelEditor.module.css";

const PAIR_COLORS = ["#d9bd72", "#8ce5dc", "#75b78a", "#e59ab5", "#b49cf0", "#f0a860", "#9fd3f0", "#e6e38a"];

const EMPTY: LevelInput = {
    title: "",
    description: "",
    hints: [""],
    symbols: ["○", "△", "□", "◇", "○", "✦", "☾", "✧"],
    columns: 4,
    pairs: [],
    published: false,
};

function toInput(level: AdminLevel): LevelInput {
    const { title, description, hints, symbols, columns, pairs, published } = level;
    return { title, description, hints, symbols, columns, pairs, published };
}

/** Mêmes règles que l'API (schéma partagé), au format des erreurs de l'API. */
function validate(draft: LevelInput): ApiIssue[] {
    const parsed = levelInputSchema.safeParse(draft);
    if (parsed.success) return [];
    return parsed.error.issues.map((issue) => ({
        path: issue.path.filter((key): key is string | number => typeof key !== "symbol"),
        message: issue.message,
    }));
}

/** Retire la case `index` : ses paires disparaissent et les indices suivants se décalent. */
function withoutSymbol(draft: LevelInput, index: number): LevelInput {
    const shift = (cell: number) => (cell > index ? cell - 1 : cell);
    return {
        ...draft,
        symbols: draft.symbols.filter((_, i) => i !== index),
        pairs: draft.pairs.filter((pair) => !pair.includes(index)).map(([a, b]): Pair => [shift(a), shift(b)]),
    };
}

export function LevelEditor({ level }: { level?: AdminLevel }) {
    const router = useRouter();
    const create = useCreateLevel();
    const update = useUpdateLevel();

    const [draft, setDraft] = useState<LevelInput>(() => (level ? toInput(level) : EMPTY));
    const [pairStart, setPairStart] = useState<number | null>(null);
    const [issues, setIssues] = useState<ApiIssue[]>([]);
    const [saved, setSaved] = useState(false);
    /** Après une première tentative d'enregistrement, les erreurs suivent la saisie en direct. */
    const [validateLive, setValidateLive] = useState(false);

    useEffect(() => {
        if (validateLive) setIssues(validate(draft));
    }, [draft, validateLive]);

    const saving = create.isPending || update.isPending;

    const edit = (next: (current: LevelInput) => LevelInput) => {
        setDraft(next);
        setSaved(false);
    };
    const set = <K extends keyof LevelInput>(key: K, value: LevelInput[K]) => edit((current) => ({ ...current, [key]: value }));
    const issueAt = (...path: (string | number)[]) =>
        issues.find((issue) => path.every((key, i) => issue.path[i] === key))?.message;

    const pairOf = useMemo(() => {
        const owner = new Map<number, number>();
        draft.pairs.forEach((pair, p) => pair.forEach((cell) => owner.set(cell, p)));
        return owner;
    }, [draft.pairs]);

    // ─── Paires : clic sur deux cases pour les relier, clic sur une case reliée pour défaire ──

    const onPairCell = (cell: number) => {
        const owner = pairOf.get(cell);
        if (owner !== undefined) {
            set("pairs", draft.pairs.filter((_, p) => p !== owner));
            setPairStart(null);
        } else if (pairStart === null) {
            setPairStart(cell);
        } else if (pairStart === cell) {
            setPairStart(null);
        } else {
            set("pairs", [...draft.pairs, [pairStart, cell]]);
            setPairStart(null);
        }
    };

    // ─── Enregistrement ───────────────────────────────────────────────────

    async function onSubmit(event: FormEvent) {
        event.preventDefault();
        setValidateLive(true);
        const parsed = levelInputSchema.safeParse(draft);
        if (!parsed.success) {
            setIssues(validate(draft));
            return;
        }

        setIssues([]);
        try {
            if (level) {
                await update.mutateAsync({ id: level.id, input: parsed.data });
                setSaved(true);
            } else {
                const created = await create.mutateAsync(parsed.data);
                router.replace(`/admin/niveaux/${created.id}`);
            }
        } catch (error) {
            if (error instanceof ApiError && error.issues.length) setIssues(error.issues);
            else setIssues([{ path: [], message: error instanceof Error ? error.message : "Échec de l'enregistrement." }]);
        }
    }

    const uniqueMessages = [...new Set(issues.map((issue) => issue.message))];

    return (
        <form onSubmit={onSubmit} noValidate>
            <Panel>
                <header className={styles.head}>
                    <div>
                        <div className="tag">Atelier des gardiens</div>
                        <h2>{level ? "Modifier l'énigme" : "Nouvelle énigme"}</h2>
                    </div>
                    <div className="row">
                        <ButtonLink href="/admin/niveaux" variant="ghost">
                            ← Toutes les énigmes
                        </ButtonLink>
                        {level && (
                            <ButtonLink href={`/niveaux/${level.id}`} variant="ghost">
                                Tester
                            </ButtonLink>
                        )}
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? "Enregistrement…" : "Enregistrer"}
                        </Button>
                    </div>
                </header>

                {saved && <p className={styles.saved} role="status">✓ Énigme enregistrée. Les parties en cours sur cette énigme ont été réinitialisées.</p>}
                {uniqueMessages.length > 0 && (
                    <ul className={styles.issues} role="alert">
                        {uniqueMessages.map((message) => (
                            <li key={message}>{message}</li>
                        ))}
                    </ul>
                )}

                <div className={styles.layout}>
                    {/* ─── Texte ─── */}
                    <div className="stack">
                        <Field label="Titre" value={draft.title} maxLength={L.titleMax} onChange={(e) => set("title", e.target.value)} error={issueAt("title")} />
                        <TextArea
                            label="Description"
                            value={draft.description}
                            maxLength={L.descriptionMax}
                            onChange={(e) => set("description", e.target.value)}
                            error={issueAt("description")}
                            hint="Affichée au joueur sous le titre."
                        />

                        <fieldset className={styles.fieldset}>
                            <legend>Indices</legend>
                            <small className={styles.help}>Du plus vague au plus explicite : ils se révèlent un par un, à la demande.</small>
                            {draft.hints.map((hint, i) => (
                                <div key={i} className={styles.hintRow}>
                                    <Field
                                        label={`Indice ${i + 1}`}
                                        value={hint}
                                        maxLength={L.hintMax}
                                        onChange={(e) => set("hints", draft.hints.map((h, j) => (j === i ? e.target.value : h)))}
                                        error={issueAt("hints", i)}
                                    />
                                    <Button
                                        variant="ghost"
                                        onClick={() => set("hints", draft.hints.filter((_, j) => j !== i))}
                                        disabled={draft.hints.length <= L.hintsMin}
                                        aria-label={`Retirer l'indice ${i + 1}`}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            ))}
                            <Button variant="ghost" onClick={() => set("hints", [...draft.hints, ""])} disabled={draft.hints.length >= L.hintsMax}>
                                + Ajouter un indice
                            </Button>
                        </fieldset>

                        <label className={styles.toggle}>
                            <input type="checkbox" checked={draft.published} onChange={(e) => set("published", e.target.checked)} />
                            Publiée (visible dans le parcours des joueurs)
                        </label>
                    </div>

                    {/* ─── Plateau ─── */}
                    <div className="stack">
                        <div className={styles.boardHead}>
                            <h3>Plateau</h3>
                            <label className={styles.columns}>
                                Colonnes
                                <select value={draft.columns} onChange={(e) => set("columns", Number(e.target.value))}>
                                    {Array.from({ length: L.columnsMax - L.columnsMin + 1 }, (_, i) => L.columnsMin + i).map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <small className={styles.help}>
                            Modifie un symbole dans sa case. Pour définir une réponse, clique sur « relier » dans deux cases ;
                            re-clique sur une case reliée pour défaire la paire.
                        </small>

                        <div className={styles.board} style={{ "--columns": draft.columns } as CSSProperties}>
                            {draft.symbols.map((symbol, i) => {
                                const owner = pairOf.get(i);
                                const color = owner === undefined ? undefined : PAIR_COLORS[owner % PAIR_COLORS.length];
                                return (
                                    <div
                                        key={i}
                                        className={styles.cell}
                                        data-picking={pairStart === i || undefined}
                                        data-invalid={Boolean(issueAt("symbols", i)) || undefined}
                                        style={color ? ({ "--pair": color } as CSSProperties) : undefined}
                                    >
                                        <input
                                            aria-label={`Symbole de la case ${i + 1}`}
                                            value={symbol}
                                            maxLength={L.symbolMax}
                                            onChange={(e) => set("symbols", draft.symbols.map((s, j) => (j === i ? e.target.value : s)))}
                                        />
                                        <button type="button" className={styles.pairButton} onClick={() => onPairCell(i)} aria-pressed={owner !== undefined}>
                                            {owner !== undefined ? `paire ${owner + 1}` : pairStart === i ? "…avec ?" : "relier"}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.remove}
                                            onClick={() => {
                                                edit((current) => withoutSymbol(current, i));
                                                setPairStart(null);
                                            }}
                                            disabled={draft.symbols.length <= L.symbolsMin}
                                            aria-label={`Retirer la case ${i + 1}`}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <Button variant="ghost" onClick={() => set("symbols", [...draft.symbols, "✧"])} disabled={draft.symbols.length >= L.symbolsMax}>
                            + Ajouter une case ({draft.symbols.length} / {L.symbolsMax})
                        </Button>

                        <ol className={styles.pairList}>
                            {draft.pairs.length === 0 && <li className={styles.help}>Aucune paire : le joueur n&apos;aurait rien à trouver.</li>}
                            {draft.pairs.map(([a, b], p) => (
                                <li key={`${a}-${b}`} style={{ "--pair": PAIR_COLORS[p % PAIR_COLORS.length] } as CSSProperties}>
                                    Paire {p + 1} : <b>{draft.symbols[a] ?? "?"}</b> (case {a + 1}) ↔ <b>{draft.symbols[b] ?? "?"}</b> (case {b + 1})
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </Panel>
        </form>
    );
}
