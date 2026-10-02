"use client";

import Link from "next/link";
import type { LevelSummary } from "@aether/shared";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Stars } from "@/components/ui/Stars";
import { ErrorState, Loading } from "@/components/ui/States";
import { formatDuration, pad2, plural } from "@/lib/format";
import { useLevels, useProgress } from "@/lib/queries";
import styles from "./niveaux.module.css";

export function LevelMap() {
    const levels = useLevels();
    const { data: progress } = useProgress();

    if (levels.error) return <ErrorState error={levels.error} onRetry={() => void levels.refetch()} />;
    if (!levels.data) return <Loading />;

    const completed = levels.data.filter((level) => level.status === "completed").length;
    const total = levels.data.length;

    return (
        <Panel>
            <header className={styles.head}>
                <div>
                    <div className="tag">Jardin des Origines</div>
                    <h2>Les énigmes</h2>
                </div>
                <ButtonLink href="/jardin" variant="ghost">
                    Voir le jardin
                </ButtonLink>
            </header>

            <div className={styles.progress}>
                <div
                    className={styles.bar}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={completed}
                    aria-label="Énigmes restaurées"
                >
                    <span style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
                </div>
                <span>
                    {completed} / {total} restaurées
                    {progress && ` · ${progress.totalStars} / ${progress.maxStars} ★`}
                </span>
            </div>

            {total === 0 ? (
                <p>Aucune énigme n&apos;est encore publiée.</p>
            ) : (
                <ol className={styles.grid}>
                    {levels.data.map((level) => (
                        <li key={level.id}>
                            <LevelCard level={level} />
                        </li>
                    ))}
                </ol>
            )}
        </Panel>
    );
}

function LevelCard({ level }: { level: LevelSummary }) {
    const content = (
        <>
            <span className={styles.number}>{pad2(level.position)}</span>
            <span className={styles.title}>{level.title}</span>
            <span className={styles.meta}>
                {level.status === "locked" && "Scellée"}
                {level.status === "available" && plural(level.pairCount, "lien") + " à trouver"}
                {level.status === "completed" && (
                    <>
                        <Stars count={level.bestStars} size="sm" />
                        {level.bestTimeMs !== null && <span>{formatDuration(level.bestTimeMs)}</span>}
                    </>
                )}
            </span>
        </>
    );

    if (level.status === "locked") {
        return (
            <div className={styles.card} data-status="locked" aria-label={`Énigme ${level.position} : scellée`}>
                <span className={styles.lock} aria-hidden>
                    ⌬
                </span>
                {content}
            </div>
        );
    }

    return (
        <Link href={`/niveaux/${level.id}`} className={styles.card} data-status={level.status}>
            {content}
        </Link>
    );
}
