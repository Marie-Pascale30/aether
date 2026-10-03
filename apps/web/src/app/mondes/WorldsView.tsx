"use client";

import Link from "next/link";
import type { WorldSummary } from "@aether/shared";
import { Garden } from "@/components/garden/Garden";
import { ProgressBar } from "@/components/levels/LevelCard";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { useProgress, useWorlds } from "@/lib/queries";
import styles from "./mondes.module.css";

export function WorldsView() {
    const worlds = useWorlds();
    const { data: progress } = useProgress();

    if (worlds.error) return <ErrorState error={worlds.error} onRetry={() => void worlds.refetch()} />;
    if (!worlds.data) return <Loading />;

    return (
        <div className="stack">
            <Panel>
                <div className="tag">Le monde d&apos;AETHER</div>
                <h2>Les mondes</h2>
                <p>Chaque monde a son jardin et sa manière de relier les choses. Restaure-le entièrement pour ouvrir le suivant.</p>
                {progress && (
                    <div className={styles.total}>
                        <ProgressBar value={progress.completedLevels} max={progress.totalLevels} label="Énigmes restaurées" />
                        <span>
                            {progress.completedLevels} / {progress.totalLevels} énigmes · {progress.harmony} / {progress.maxHarmony} ✿
                        </span>
                    </div>
                )}
            </Panel>

            {worlds.data.length === 0 ? (
                <Panel>
                    <p>Aucun monde n&apos;est encore ouvert.</p>
                </Panel>
            ) : (
                <ol className={styles.list}>
                    {worlds.data.map((world) => (
                        <li key={world.id}>
                            <WorldCard world={world} />
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

function WorldCard({ world }: { world: WorldSummary }) {
    const { completedLevels, totalLevels } = world.garden;
    const content = (
        <>
            <Garden stage={world.garden.stage} theme={world.theme} instant className={styles.garden} />
            <div className={styles.body}>
                <div className="tag">
                    Monde {world.position}
                    {world.status === "completed" && " · restauré"}
                    {world.status === "locked" && " · scellé"}
                </div>
                <h3>{world.title}</h3>
                <p>{world.tagline}</p>
                <div className={styles.cardProgress}>
                    <ProgressBar value={completedLevels} max={totalLevels} label={`Progression : ${world.title}`} />
                    <span>
                        {completedLevels} / {totalLevels} · {world.harmony} ✿
                    </span>
                </div>
            </div>
        </>
    );

    if (world.status === "locked") {
        return (
            <div className={styles.card} data-status="locked">
                {content}
                <span className={styles.sealed}>Restaure le monde précédent pour l&apos;ouvrir.</span>
            </div>
        );
    }
    return (
        <Link href={`/mondes/${world.slug}`} className={styles.card} data-status={world.status}>
            {content}
        </Link>
    );
}
