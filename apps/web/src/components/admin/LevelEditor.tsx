"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
    generatePuzzle,
    GROUP_SIZE,
    MECHANICS,
    LEVEL_LIMITS as L,
    levelInputSchema,
    type AdminLevel,
    type Group,
    type LevelInput,
    type LevelKind,
    type Mechanic,
} from "@aether/shared";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { LocalPuzzleEditor } from "./LocalPuzzleEditor";
import { SymbolPalette } from "./SymbolPalette";
import { ApiError, type ApiIssue } from "@/lib/api";
import { KIND_COPY, MECHANIC_COPY } from "@/lib/kinds";
import { useAdminWorlds, useCreateLevel, useUpdateLevel } from "@/lib/queries";
import styles from "./LevelEditor.module.css";

const GROUP_COLORS = ["#d9bd72", "#8ce5dc", "#75b78a", "#e59ab5", "#b49cf0", "#f0a860", "#9fd3f0", "#e6e38a"];
const KINDS: LevelKind[] = ["PAIRS", "GROUPS", "SEQUENCE"];

const MECHANIC_LABELS: Record<Mechanic, string> = {
    LINKS: "Liens (paires, familles, suites)",
    ...Object.fromEntries(Object.entries(MECHANIC_COPY).map(([mechanic, copy]) => [mechanic, copy.label])),
} as Record<Mechanic, string>;

const emptyDraft = (worldId: string): LevelInput => ({
    worldId,
    mechanic: "LINKS",
    puzzle: null,
    kind: "PAIRS",
    title: "",
    description: "",
    hints: [""],
    symbols: ["○", "△", "□", "◇", "○", "✦", "☾", "✧"],
    columns: 4,
    groups: [],
    published: false,
});

function toInput(level: AdminLevel): LevelInput {
    const { worldId, mechanic, puzzle, kind, title, description, hints, symbols, columns, groups, published } = level;
    return { worldId, mechanic, puzzle, kind, title, description, hints, symbols, columns, groups, published };
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

/** Retire la case `index` : ses liens disparaissent et les indices suivants se décalent. */
function withoutSymbol(draft: LevelInput, index: number): LevelInput {
    const shift = (cell: number) => (cell > index ? cell - 1 : cell);
    return {
        ...draft,
        symbols: draft.symbols.filter((_, i) => i !== index),
        groups: draft.groups.filter((group) => !group.includes(index)).map((group): Group => group.map(shift)),
    };
}

interface Props {
    level?: AdminLevel;
    /** Monde présélectionné pour une nouvelle énigme. */
    initialWorldId?: string;
}

export function LevelEditor({ level, initialWorldId }: Props) {
    const router = useRouter();
    const worlds = useAdminWorlds();
    const create = useCreateLevel();
    const update = useUpdateLevel();

    const [draft, setDraft] = useState<LevelInput>(() => (level ? toInput(level) : emptyDraft(initialWorldId ?? "")));
    const [groupSize, setGroupSize] = useState(() => level?.groups[0]?.length ?? GROUP_SIZE[draft.kind].min);
    /** Lien en cours de construction (cases choisies, dans l'ordre). */
    const [building, setBuilding] = useState<number[]>([]);
    /** Case que la palette remplit (la dernière cliquée), ou `null` pour ajouter une case. */
    const [activeCell, setActiveCell] = useState<number | null>(null);
    const [issues, setIssues] = useState<ApiIssue[]>([]);
    const [saved, setSaved] = useState(false);
    /** Après une première tentative d'enregistrement, les erreurs suivent la saisie en direct. */
    const [validateLive, setValidateLive] = useState(false);

    // Nouvelle énigme sans monde choisi : le premier monde par défaut, dès que la liste arrive.
    useEffect(() => {
        const first = worlds.data?.[0];
        if (!draft.worldId && first) setDraft((current) => ({ ...current, worldId: first.id }));
    }, [worlds.data, draft.worldId]);

    useEffect(() => {
        if (validateLive) setIssues(validate(draft));
    }, [draft, validateLive]);

    const saving = create.isPending || update.isPending;
    const ordered = draft.kind === "SEQUENCE";
    const sizes = GROUP_SIZE[draft.kind];

    const edit = (next: (current: LevelInput) => LevelInput) => {
        setDraft(next);
        setSaved(false);
    };
    const set = <K extends keyof LevelInput>(key: K, value: LevelInput[K]) => edit((current) => ({ ...current, [key]: value }));
    const issueAt = (...path: (string | number)[]) =>
        issues.find((issue) => path.every((key, i) => issue.path[i] === key))?.message;

    const groupOf = useMemo(() => {
        const owner = new Map<number, [number, number]>();
        draft.groups.forEach((group, g) => group.forEach((cell, rank) => owner.set(cell, [g, rank])));
        return owner;
    }, [draft.groups]);

    // ─── Genre et taille : en changer efface les liens, qui n'ont plus le même sens ──

    const resetLinks = (next: Partial<LevelInput>, size: number) => {
        if (draft.groups.length > 0 && !window.confirm("Ce changement efface les liens déjà définis. Continuer ?")) return;
        edit((current) => ({ ...current, ...next, groups: [] }));
        setGroupSize(size);
        setBuilding([]);
    };

    const changeMechanic = (mechanic: Mechanic) => {
        if (mechanic === draft.mechanic) return;
        const hasContent = draft.mechanic === "LINKS" ? draft.groups.length > 0 : Boolean(draft.puzzle);
        if (hasContent && !window.confirm("Changer de mécanique remplace le plateau actuel. Continuer ?")) return;
        edit((current) => ({
            ...current,
            mechanic,
            puzzle: mechanic === "LINKS" ? null : generatePuzzle(mechanic, Math.random().toString(36).slice(2, 8), 3),
        }));
        setBuilding([]);
    };

    // ─── Liens : on choisit les cases une à une ; un lien complet est ajouté automatiquement ──

    const onLinkCell = (cell: number) => {
        const owner = groupOf.get(cell);
        if (owner) {
            set("groups", draft.groups.filter((_, g) => g !== owner[0]));
            setBuilding([]);
            return;
        }
        const rank = building.indexOf(cell);
        if (rank !== -1) {
            setBuilding(ordered ? building.slice(0, rank) : building.filter((c) => c !== cell));
            return;
        }
        const next = [...building, cell];
        if (next.length < groupSize) {
            setBuilding(next);
            return;
        }
        set("groups", [...draft.groups, next]);
        setBuilding([]);
    };

    const linkLabel = (cell: number) => {
        const owner = groupOf.get(cell);
        if (owner) return ordered ? `lien ${owner[0] + 1} · ${owner[1] + 1}` : `lien ${owner[0] + 1}`;
        const rank = building.indexOf(cell);
        if (rank !== -1) return ordered ? `étape ${rank + 1}` : "choisie";
        return "relier";
    };

    /** La palette remplit la case active puis passe à la suivante, pour composer un plateau d'affilée. */
    const onPaletteSymbol = (symbol: string) => {
        if (activeCell !== null && activeCell < draft.symbols.length) {
            set("symbols", draft.symbols.map((s, i) => (i === activeCell ? symbol : s)));
            setActiveCell(activeCell + 1 < draft.symbols.length ? activeCell + 1 : null);
        } else if (draft.symbols.length < L.symbolsMax) {
            set("symbols", [...draft.symbols, symbol]);
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
    const separator = ordered ? " → " : " · ";

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
                        <label className={styles.select}>
                            Monde
                            <select value={draft.worldId} onChange={(e) => set("worldId", e.target.value)}>
                                {worlds.data?.map((world) => (
                                    <option key={world.id} value={world.id}>
                                        {world.title}
                                        {!world.published && " (brouillon)"}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className={styles.select}>
                            Mécanique
                            <select value={draft.mechanic} onChange={(e) => changeMechanic(e.target.value as Mechanic)}>
                                {MECHANICS.map((mechanic) => (
                                    <option key={mechanic} value={mechanic}>
                                        {MECHANIC_LABELS[mechanic]}
                                    </option>
                                ))}
                            </select>
                        </label>
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
                    {draft.mechanic !== "LINKS" ? (
                        <LocalPuzzleEditor
                            mechanic={draft.mechanic}
                            puzzle={draft.puzzle}
                            issues={issues}
                            onChange={(puzzle) => set("puzzle", puzzle)}
                        />
                    ) : (
                    <div className="stack">
                        <div className={styles.boardHead}>
                            <h3>Plateau</h3>
                            <label className={styles.select}>
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

                        <div className={styles.kindRow}>
                            <div className={styles.kinds} role="radiogroup" aria-label="Genre d'énigme">
                                {KINDS.map((kind) => (
                                    <button
                                        key={kind}
                                        type="button"
                                        role="radio"
                                        aria-checked={draft.kind === kind}
                                        className={styles.kindButton}
                                        onClick={() => kind !== draft.kind && resetLinks({ kind }, GROUP_SIZE[kind].min)}
                                    >
                                        <span aria-hidden>{KIND_COPY[kind].glyph}</span> {KIND_COPY[kind].label}
                                    </button>
                                ))}
                            </div>
                            {sizes.min !== sizes.max && (
                                <label className={styles.select}>
                                    Cases par lien
                                    <select value={groupSize} onChange={(e) => resetLinks({}, Number(e.target.value))}>
                                        {Array.from({ length: sizes.max - sizes.min + 1 }, (_, i) => sizes.min + i).map((n) => (
                                            <option key={n} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                        </div>

                        <small className={styles.help}>
                            Modifie un symbole dans sa case. Pour définir une réponse, clique sur « relier » dans {groupSize} cases
                            {ordered ? ", dans l'ordre du chemin" : ""} ; re-clique sur une case reliée pour défaire son lien.
                        </small>

                        <div className={styles.board} style={{ "--columns": draft.columns } as CSSProperties}>
                            {draft.symbols.map((symbol, i) => {
                                const owner = groupOf.get(i);
                                const color = owner ? GROUP_COLORS[owner[0] % GROUP_COLORS.length] : undefined;
                                return (
                                    <div
                                        key={i}
                                        className={styles.cell}
                                        data-picking={building.includes(i) || undefined}
                                        data-active={activeCell === i || undefined}
                                        data-invalid={Boolean(issueAt("symbols", i)) || undefined}
                                        style={color ? ({ "--pair": color } as CSSProperties) : undefined}
                                    >
                                        <input
                                            aria-label={`Symbole de la case ${i + 1}`}
                                            value={symbol}
                                            maxLength={L.symbolMax}
                                            onFocus={() => setActiveCell(i)}
                                            onChange={(e) => set("symbols", draft.symbols.map((s, j) => (j === i ? e.target.value : s)))}
                                        />
                                        <button type="button" className={styles.pairButton} onClick={() => onLinkCell(i)} aria-pressed={owner !== undefined}>
                                            {linkLabel(i)}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.remove}
                                            onClick={() => {
                                                edit((current) => withoutSymbol(current, i));
                                                setBuilding([]);
                                                setActiveCell(null);
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

                        <SymbolPalette
                            used={draft.symbols}
                            targetLabel={activeCell !== null && activeCell < draft.symbols.length ? `case ${activeCell + 1}` : "nouvelle case"}
                            onPick={onPaletteSymbol}
                        />

                        <ol className={styles.pairList}>
                            {draft.groups.length === 0 && <li className={styles.help}>Aucun lien : le joueur n&apos;aurait rien à trouver.</li>}
                            {draft.groups.map((group, g) => (
                                <li key={group.join("-")} style={{ "--pair": GROUP_COLORS[g % GROUP_COLORS.length] } as CSSProperties}>
                                    Lien {g + 1} :{" "}
                                    {group.map((cell, rank) => (
                                        <span key={cell}>
                                            {rank > 0 && separator}
                                            <b>{draft.symbols[cell] ?? "?"}</b> <small>(case {cell + 1})</small>
                                        </span>
                                    ))}
                                </li>
                            ))}
                        </ol>
                    </div>
                    )}
                </div>
            </Panel>
        </form>
    );
}
