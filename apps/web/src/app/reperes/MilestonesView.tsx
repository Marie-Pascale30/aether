"use client";

import { MILESTONE_VALUES, type MilestoneState, type MilestoneValue } from "@aether/shared";
import { ProgressBar } from "@/components/levels/LevelCard";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { plural } from "@/lib/format";
import { useMilestones } from "@/lib/queries";
import styles from "./reperes.module.css";

const VALUE_ORDER: MilestoneValue[] = ["progression", "satisfaction", "curiosite", "serenite"];

const reachedOn = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function MilestonesView() {
    const query = useMilestones();

    if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
    if (!query.data) return <Loading />;

    const { milestones, facts, currentStreak } = query.data;
    const reached = milestones.filter((m) => m.reachedAt).length;

    return (
        <div className="stack">
            <Panel>
                <div className="tag">Ton chemin</div>
                <h2>Repères</h2>
                <p>Ici, pas de classement : seulement les pas que tu as faits, à ton rythme. {plural(reached, "repère atteint", "repères atteints")} sur {milestones.length}.</p>
                <dl className={styles.facts}>
                    <Fact label="Énigmes résolues" value={facts.solvedLevels} />
                    <Fact label="Mondes restaurés" value={facts.restoredWorlds} />
                    <Fact label="Jours de jeu" value={facts.playDays} />
                    <Fact label="Série du jour" value={plural(currentStreak, "jour")} />
                </dl>
            </Panel>

            {VALUE_ORDER.map((value) => (
                <section key={value} className={styles.group} aria-labelledby={`valeur-${value}`}>
                    <h3 id={`valeur-${value}`}>
                        <span aria-hidden>{MILESTONE_VALUES[value].glyph}</span> {MILESTONE_VALUES[value].label}
                    </h3>
                    <ul className={styles.grid}>
                        {milestones
                            .filter((m) => m.value === value)
                            .map((m) => (
                                <li key={m.key}>
                                    <MilestoneCard milestone={m} />
                                </li>
                            ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

function Fact({ label, value }: { label: string; value: number | string }) {
    return (
        <div>
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function MilestoneCard({ milestone }: { milestone: MilestoneState }) {
    const { title, description, current, target, reachedAt } = milestone;
    return (
        <article className={styles.card} data-reached={reachedAt ? true : undefined}>
            <h4>
                <span aria-hidden>{reachedAt ? "✦" : "✧"}</span> {title}
            </h4>
            <p>{description}</p>
            {reachedAt ? (
                <small className={styles.date}>Atteint le {reachedOn(reachedAt)}</small>
            ) : (
                <div className={styles.progress}>
                    <ProgressBar value={current} max={target} label={`${title} : ${current} sur ${target}`} />
                    <small>
                        {current} / {target}
                    </small>
                </div>
            )}
        </article>
    );
}
