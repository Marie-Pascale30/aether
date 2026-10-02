"use client";

import { Garden } from "@/components/garden/Garden";
import { LevelGrid } from "@/components/levels/LevelCard";
import { ButtonLink } from "@/components/ui/Button";
import { Callout, Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { useGrowingStage } from "@/hooks/useGrowingStage";
import { KIND_COPY } from "@/lib/kinds";
import { useWorld } from "@/lib/queries";
import styles from "../mondes.module.css";

export function WorldView({ slug }: { slug: string }) {
    const world = useWorld(slug);
    const garden = useGrowingStage(world.data?.garden.stage, slug);

    if (world.error) return <ErrorState error={world.error} onRetry={() => void world.refetch()} />;
    if (!world.data) return <Loading />;

    const w = world.data;
    const { completedLevels, totalLevels } = w.garden;
    const kinds = [...new Set(w.levels.map((level) => level.kind))];
    const cta = w.nextLevelId
        ? { href: `/niveaux/${w.nextLevelId}`, label: completedLevels > 0 ? "Continuer la restauration" : "Entrer dans le monde" }
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
                            {kinds
                                .map((kind) => {
                                    const copy = KIND_COPY[kind];
                                    return `${copy.glyph} ${copy.label.toLowerCase()}`;
                                })
                                .join(" · ")}
                            . Chaque énigme résolue fait pousser ce jardin.
                        </Callout>
                        <p className={styles.count}>
                            {completedLevels} / {totalLevels} énigmes restaurées · {w.stars} / {w.maxStars} ★
                        </p>
                        <div className="row">
                            {w.status === "locked" ? (
                                <span className="muted">Restaure le monde précédent pour ouvrir celui-ci.</span>
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
