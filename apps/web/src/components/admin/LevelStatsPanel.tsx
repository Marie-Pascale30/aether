"use client";

import type { LevelKind } from "@aether/shared";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { formatDuration } from "@/lib/format";
import { useAdminLevelStats } from "@/lib/queries";
import styles from "./LevelStatsPanel.module.css";

const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const decimal = (value: number | null) => (value === null ? "—" : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

/**
 * Comment les joueurs vivent cette énigme. Une fausse piste fréquente signale souvent
 * un indice trop vague ou un leurre qui satisfait lui aussi l'indice.
 */
export function LevelStatsPanel({ levelId, kind }: { levelId: string; kind: LevelKind }) {
    const stats = useAdminLevelStats(levelId);

    if (stats.error) return <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />;
    if (!stats.data) return <Loading label="Calcul des statistiques…" />;

    const s = stats.data;
    const separator = kind === "SEQUENCE" ? " → " : " + ";

    return (
        <Panel className={styles.panel}>
            <header className={styles.head}>
                <div>
                    <div className="tag">Statistiques de conception</div>
                    <h3>Comment les joueurs la vivent</h3>
                </div>
                <small className="muted">
                    {s.since ? `Coups enregistrés depuis le ${new Date(s.since).toLocaleDateString("fr-FR")}` : "Aucun coup enregistré"} · parties
                    des administrateurs exclues
                </small>
            </header>

            {s.sessions === 0 ? (
                <p className="muted">Aucun joueur n&apos;a encore ouvert cette énigme.</p>
            ) : (
                <>
                    <dl className={styles.tiles}>
                        <Tile label="Joueurs" value={s.players} />
                        <Tile label="Parties" value={s.sessions} />
                        <Tile label="Réussite" value={s.completionRate === null ? "—" : `${Math.round(s.completionRate * 100)} %`} />
                        <Tile label="Temps médian" value={s.medianDurationMs === null ? "—" : formatDuration(s.medianDurationMs)} />
                        <Tile label="Fausses pistes par victoire" value={decimal(s.averageMistakes)} />
                        <Tile label="Indices par victoire" value={decimal(s.averageHints)} />
                    </dl>

                    <div className={styles.columns}>
                        <section>
                            <h4>Harmonie des victoires</h4>
                            <Bars
                                total={s.completions}
                                rows={s.harmony.map((row) => ({ key: row.petals, label: "✿".repeat(row.petals), value: row.count }))}
                                unit="victoire"
                            />
                        </section>
                        <section>
                            <h4>Indices révélés</h4>
                            <Bars
                                total={s.sessions}
                                rows={s.hints.map((row) => ({ key: row.hint, label: `Indice ${row.hint}`, value: row.sessions }))}
                                unit="partie"
                            />
                        </section>
                    </div>

                    <section className={styles.leads}>
                        <h4>Fausses pistes les plus fréquentes</h4>
                        {s.falseLeads.length === 0 ? (
                            <p className="muted">Aucune mauvaise réponse : l&apos;énigme est peut-être trop évidente.</p>
                        ) : (
                            <ol>
                                {s.falseLeads.map((lead) => (
                                    <li key={lead.cells.join("-")}>
                                        <span className={styles.combo}>
                                            {lead.symbols.map((symbol, i) => (
                                                <span key={i}>
                                                    {i > 0 && <span className={styles.sep}>{separator}</span>}
                                                    {symbol}
                                                </span>
                                            ))}
                                        </span>
                                        <span className={styles.cells}>cases {lead.cells.map((cell) => cell + 1).join(", ")}</span>
                                        <span className={styles.count}>
                                            {lead.count} fois · {lead.sessions} partie{lead.sessions > 1 ? "s" : ""} ({percent(lead.sessions, s.sessions)} %)
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                        <small className="muted">
                            Une fausse piste tentée dans une grande part des parties révèle souvent une ambiguïté : un leurre qui satisfait lui
                            aussi l&apos;indice, ou un indice trop vague.
                        </small>
                    </section>
                </>
            )}
        </Panel>
    );
}

function Tile({ label, value }: { label: string; value: number | string }) {
    return (
        <div className={styles.tile}>
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

interface BarRow {
    key: number;
    label: string;
    value: number;
}

/** Barres horizontales à une seule série : la valeur est écrite au bout, en couleur de texte. */
function Bars({ rows, total, unit }: { rows: BarRow[]; total: number; unit: string }) {
    const max = Math.max(1, ...rows.map((row) => row.value));
    return (
        <ul className={styles.bars}>
            {rows.map((row) => {
                const share = percent(row.value, total);
                const description = `${row.label} : ${row.value} ${unit}${row.value > 1 ? "s" : ""} (${share} %)`;
                return (
                    <li key={row.key} title={description} aria-label={description}>
                        <span className={styles.barLabel} aria-hidden>
                            {row.label}
                        </span>
                        <span className={styles.track} aria-hidden>
                            {row.value > 0 && <span className={styles.fill} style={{ width: `${(row.value / max) * 100}%` }} />}
                        </span>
                        <span className={styles.barValue} aria-hidden>
                            {row.value} <small>({share} %)</small>
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
