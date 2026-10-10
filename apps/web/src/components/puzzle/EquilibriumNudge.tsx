"use client";

import type { NudgeReason } from "@/hooks/useEquilibrium";
import { Button, ButtonLink } from "@/components/ui/Button";
import styles from "./Puzzle.module.css";

const OPENING: Record<NudgeReason, string> = {
    paths: "Plusieurs chemins explorés : c'est ainsi que l'on trouve. Rien ne presse.",
    time: "Cette énigme invite à la réflexion. Prends tout ton temps.",
};

interface Props {
    reason: NudgeReason;
    hintsRemaining: number;
    onHint: () => void;
    /** Éclaircir le plateau (atténuer quelques leurres), quand la mécanique le permet. */
    onClarify?: () => void;
    onDismiss: () => void;
    /** Où respirer un instant (le monde de l'énigme). */
    pauseHref: string;
}

/** Souffle d'Équilibre : une aide proposée, jamais imposée, et sans un mot sur l'échec. */
export function EquilibriumNudge({ reason, hintsRemaining, onHint, onClarify, onDismiss, pauseHref }: Props) {
    return (
        <aside className={styles.nudge} aria-live="polite" aria-label="Équilibre">
            <span className={styles.nudgeGlyph} aria-hidden>
                ☾
            </span>
            <div>
                <p>{OPENING[reason]}</p>
                {hintsRemaining === 0 && !onClarify && <p className={styles.nudgeSoft}>Parfois, l&apos;esprit trouve en s&apos;éloignant un instant.</p>}
                <div className={styles.nudgeActions}>
                    {onClarify && (
                        <Button variant="ghost" onClick={onClarify}>
                            ◌ Éclaircir le plateau
                        </Button>
                    )}
                    {hintsRemaining > 0 ? (
                        <Button variant="ghost" onClick={onHint}>
                            ✧ Recevoir une inspiration
                        </Button>
                    ) : (
                        <ButtonLink href={pauseHref} variant="ghost">
                            Faire une pause au jardin
                        </ButtonLink>
                    )}
                    <Button variant="ghost" onClick={onDismiss}>
                        Je continue
                    </Button>
                </div>
            </div>
        </aside>
    );
}
