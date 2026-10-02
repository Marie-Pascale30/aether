"use client";

import { useEffect, useId, useRef } from "react";
import type { CompletionResult } from "@aether/shared";
import { ShareButton } from "@/components/daily/ShareButton";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { formatDuration } from "@/lib/format";
import styles from "./Puzzle.module.css";

interface Props {
    completion: CompletionResult;
    /** Monde de l'énigme, pour y revenir. */
    worldSlug: string;
    onReplay: () => void;
    onClose: () => void;
}

export function CompletionPanel({ completion, worldSlug, onReplay, onClose }: Props) {
    const titleId = useId();
    const primaryRef = useRef<HTMLAnchorElement>(null);
    const { stars, durationMs, mistakes, hintsUsed, isNewBest, bestStars, bestTimeMs, nextLevelId, gameCompleted, worldCompleted, nextWorld, daily } =
        completion;
    const worldJustDone = worldCompleted && !nextLevelId;

    useEffect(() => {
        primaryRef.current?.focus();
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const primary = daily
        ? { href: "/quotidien", label: "Résumé du jour" }
        : nextLevelId
        ? { href: `/niveaux/${nextLevelId}`, label: "Énigme suivante" }
        : gameCompleted
          ? { href: "/fin", label: "Découvrir la fin" }
          : nextWorld
            ? { href: `/mondes/${nextWorld.slug}`, label: `Monde suivant : ${nextWorld.title}` }
            : { href: `/mondes/${worldSlug}`, label: "Retour au monde" };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={styles.completion}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="tag">{daily ? "Énigme du jour" : worldJustDone ? "Monde restauré" : "Énigme restaurée"}</div>
                <h2 id={titleId}>{worldJustDone ? "Le monde se souvient" : "Le lien est juste"}</h2>
                <Stars count={stars} size="lg" animate />

                <dl className={styles.summary}>
                    <div>
                        <dt>Temps</dt>
                        <dd>{formatDuration(durationMs)}</dd>
                    </div>
                    <div>
                        <dt>Erreurs</dt>
                        <dd>{mistakes}</dd>
                    </div>
                    <div>
                        <dt>Indices</dt>
                        <dd>{hintsUsed}</dd>
                    </div>
                </dl>

                {daily && (
                    <p className={styles.record}>
                        {daily.firstToday ? (
                            <strong>✦ Série : {daily.streak.current} jour{daily.streak.current > 1 ? "s" : ""}</strong>
                        ) : (
                            "Ta première victoire du jour reste celle qui compte pour la série."
                        )}
                    </p>
                )}

                <p className={styles.record}>
                    {isNewBest ? (
                        <strong>✦ Nouveau record</strong>
                    ) : (
                        <>
                            Ton record : <Stars count={bestStars} size="sm" /> en {formatDuration(bestTimeMs)}
                        </>
                    )}
                </p>

                <div className={styles.completionActions}>
                    <ButtonLink ref={primaryRef} href={primary.href} variant="primary">
                        {primary.label}
                    </ButtonLink>
                    {daily && <ShareButton text={daily.share} />}
                    <Button onClick={onReplay}>Rejouer</Button>
                    <Button variant="ghost" onClick={onClose}>
                        Voir le plateau
                    </Button>
                </div>
            </div>
        </div>
    );
}
