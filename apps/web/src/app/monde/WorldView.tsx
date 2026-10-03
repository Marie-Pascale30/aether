"use client";

import { Garden } from "@/components/garden/Garden";
import { LevelGrid } from "@/components/levels/LevelCard";
import { ButtonLink } from "@/components/ui/Button";
import { Callout, Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { useGrowingStage } from "@/hooks/useGrowingStage";
import { levelLabel } from "@/lib/kinds";
import { usePlayer } from "@/lib/offline/player";
import { levelHref } from "@/lib/routes";
import styles from "../mondes/mondes.module.css";

export function WorldView({ slug }: { slug: string }) {
    const player = usePlayer();
    const w = player.data?.journey.world(slug) ?? null;
    const garden = useGrowingStage(w?.garden.stage, slug);

    if (player.error) return <ErrorState error={player.error} onRetry={player.retry} />;
    if (!player.data) return <Loading />;
    if (!w) {
        return (
            <Panel>
                <h2>Ce monde n&apos;existe pas</h2>
                <ButtonLink href="/mondes">Tous les mondes</ButtonLink>
            </Panel>
        );
    }

    const { completedLevels, totalLevels } = w.garden;
    const labels = [...new Map(w.levels.map((level) => [levelLabel(level.mechanic, level.kind).label, levelLabel(level.mechanic, level.kind)])).values()];
    const cta = w.nextLevelId
        ? { href: levelHref(w.nextLevelId), label: completedLevels > 0 ? "Continuer la restauration" : "Entrer dans le monde" }
        : null;

    return (
        <div className="stack">
            <Panel>
                <div className={styles.intro}>
                    <div>
                        <div className="tag">
                            Monde {w.position}
                            {w.status === "completed" && " · restauré"}
                        </div>
                        <h2>{w.title}</h2>
                        <p>{w.description}</p>
                        <Callout label="Ici :">
                            {labels.map((label) => `${label.glyph} ${label.label.toLowerCase()}`).join(" · ")}
                            . Chaque énigme résolue fait pousser ce jardin.
                        </Callout>
                        <p className={styles.count}>
                            {completedLevels} / {totalLevels} énigmes restaurées · {w.harmony} / {w.maxHarmony} ✿
                        </p>
                        <div className="row">
                            {w.status === "locked" ? (
                                <span className="muted">Résous trois énigmes du monde précédent pour ouvrir celui-ci.</span>
                            ) : (
                                cta && (
                                    <ButtonLink href={cta.href} variant="primary">
                                        {cta.label}
                                    </ButtonLink>
                                )
                            )}
                            <ButtonLink href="/mondes" variant="ghost">
                                Tous les mondes
                            </ButtonLink>
                        </div>
                    </div>
                    <Garden stage={garden.stage} instant={garden.instant} theme={w.theme} />
                </div>
            </Panel>

            <Panel>
                <header className={styles.levelsHead}>
                    <h3>Les énigmes</h3>
                </header>
                <LevelGrid levels={w.levels} />
            </Panel>
        </div>
    );
}
