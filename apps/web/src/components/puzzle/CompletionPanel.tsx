"use client";

import { useEffect, useId, useRef } from "react";
import { hasPetal, PETAL_COPY, PETAL_KEYS, type CompletionResult } from "@aether/shared";
import { ShareButton } from "@/components/daily/ShareButton";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Harmony } from "@/components/ui/Harmony";
import { formatDuration } from "@/lib/format";
import { levelHref, worldHref } from "@/lib/routes";
import { useSettings } from "@/lib/settings";
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
    const { settings } = useSettings();
    const { levelPetals, newPetals, durationMs, bestTimeMs, nextLevelId, gameCompleted, worldCompleted, nextWorld, daily, milestones } = completion;
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
          ? { href: levelHref(nextLevelId), label: "Énigme suivante" }
          : gameCompleted
            ? { href: "/fin", label: "Découvrir la fin" }
            : nextWorld
              ? { href: worldHref(nextWorld.slug), label: `Monde suivant : ${nextWorld.title}` }
              : { href: worldHref(worldSlug), label: "Retour au monde" };

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
                <Harmony petals={levelPetals} size="lg" animate />

                <ul className={styles.petals} aria-label="Pétales d'harmonie">
                    {PETAL_KEYS.map((key) => {
                        const earned = hasPetal(levelPetals, key);
                        return (
                            <li key={key} data-open={!earned || undefined}>
                                <span className={styles.petalGlyph} aria-hidden>
                                    {earned ? "✿" : "○"}
                                </span>
                                <span>
                                    {PETAL_COPY[key].name} <small>· {earned ? PETAL_COPY[key].earned : `${PETAL_COPY[key].open} Il t'attendra.`}</small>
                                </span>
                                {hasPetal(newPetals, key) && <span className={styles.fresh}>Cueilli</span>}
                            </li>
                        );
                    })}
                </ul>

                {settings.showTimer && (
                    <p className={styles.time}>
                        {formatDuration(durationMs)}
                        {bestTimeMs < durationMs && ` · ton meilleur temps : ${formatDuration(bestTimeMs)}`}
                    </p>
                )}

                {milestones.length > 0 && (
                    <ul className={styles.milestones} aria-label="Nouveaux repères">
                        {milestones.map((milestone) => (
                            <li key={milestone.key}>
                                <strong>✦ {milestone.title}</strong> · {milestone.description}
                            </li>
                        ))}
                    </ul>
                )}

                {daily && (
                    <p className={styles.record}>
                        {daily.firstToday ? (
                            <strong>☾ Série : {daily.streak.current} jour{daily.streak.current > 1 ? "s" : ""}</strong>
                        ) : (
                            "Ta première victoire du jour reste celle qui compte pour la série."
                        )}
                    </p>
                )}

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
