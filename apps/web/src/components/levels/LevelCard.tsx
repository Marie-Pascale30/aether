import Link from "next/link";
import type { LevelSummary } from "@aether/shared";
import { Harmony } from "@/components/ui/Harmony";
import { pad2 } from "@/lib/format";
import { goalLabel, levelLabel } from "@/lib/kinds";
import styles from "./levels.module.css";

export function LevelCard({ level }: { level: LevelSummary }) {
    const label = levelLabel(level.mechanic, level.kind);
    const content = (
        <>
            <span className={styles.number}>{pad2(level.position)}</span>
            <span className={styles.title}>{level.title}</span>
            <span className={styles.kind}>
                <span aria-hidden>{label.glyph}</span> {label.label}
            </span>
            <span className={styles.meta}>
                {level.status === "locked" && "Scellée"}
                {level.status === "available" && goalLabel(level.mechanic, level.kind, level.groupCount)}
                {level.status === "completed" && (
                    <Harmony petals={level.petals} size="sm" />
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

export function LevelGrid({ levels }: { levels: LevelSummary[] }) {
    return (
        <ol className={styles.grid}>
            {levels.map((level) => (
                <li key={level.id}>
                    <LevelCard level={level} />
                </li>
            ))}
        </ol>
    );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
    return (
        <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
            <span style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
        </div>
    );
}
