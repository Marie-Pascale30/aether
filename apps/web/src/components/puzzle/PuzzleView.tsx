"use client";

import type { EchoesPuzzle, FlowPuzzle, GearsPuzzle, LevelDetail, MemoryPuzzle } from "@aether/shared";
import { EchoesBoard } from "@/components/mechanics/EchoesBoard";
import { FlowBoard } from "@/components/mechanics/FlowBoard";
import { GearsBoard } from "@/components/mechanics/GearsBoard";
import { LinksBoard } from "@/components/mechanics/LinksBoard";
import { MemoryBoard } from "@/components/mechanics/MemoryBoard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Panel } from "@/components/ui/Panel";
import { useElapsed } from "@/hooks/useElapsed";
import { useEquilibrium } from "@/hooks/useEquilibrium";
import { useLocalPuzzle, type PuzzleReport } from "@/hooks/useLocalPuzzle";
import { formatDuration, pad2 } from "@/lib/format";
import { levelLabel } from "@/lib/kinds";
import { worldHref } from "@/lib/routes";
import { useSettings } from "@/lib/settings";
import { useAmbience } from "@/lib/sound/SoundProvider";
import { CompletionPanel } from "./CompletionPanel";
import { EquilibriumNudge } from "./EquilibriumNudge";
import styles from "./Puzzle.module.css";

/** Plateau de la mécanique, remonté à chaque « Recommencer » (via `key`). */
function MechanicBoard({ detail, report }: { detail: LevelDetail; report: PuzzleReport }) {
    switch (detail.mechanic) {
        case "LINKS":
            return <LinksBoard detail={detail} report={report} />;
        case "MEMORY":
            return <MemoryBoard puzzle={detail.puzzle as MemoryPuzzle} report={report} />;
        case "GEARS":
            return <GearsBoard puzzle={detail.puzzle as GearsPuzzle} report={report} />;
        case "FLOW":
            return <FlowBoard puzzle={detail.puzzle as FlowPuzzle} report={report} />;
        case "ECHOES":
            return <EchoesBoard puzzle={detail.puzzle as EchoesPuzzle} report={report} />;
    }
}

/** Une énigme, quelle que soit sa mécanique : jouée sur l'appareil, réseau ou pas. */
export function PuzzleView({ detail }: { detail: LevelDetail }) {
    const puzzle = useLocalPuzzle(detail);
    const { settings } = useSettings();
    const elapsed = useElapsed(puzzle.startedAt, settings.showTimer && !puzzle.completion);
    const label = levelLabel(detail.mechanic, detail.kind);
    const equilibrium = useEquilibrium({ active: !puzzle.completion, progress: puzzle.advances, mistakes: puzzle.mistakes });
    const pauseHref = detail.isDaily ? "/quotidien" : worldHref(detail.world.slug);
    useAmbience(detail.world.theme);

    return (
        <>
            <Panel>
                <header className={styles.head}>
                    <div>
                        <div className={styles.level}>
                            {detail.isDaily
                                ? "ÉNIGME DU JOUR"
                                : `${detail.world.title.toUpperCase()} · ${detail.position > 0 ? `ÉNIGME ${pad2(detail.position)} / ${pad2(detail.total)}` : "APERÇU · BROUILLON"}`}
                        </div>
                        <h2>{detail.title}</h2>
                        <span className={styles.kind}>
                            <span aria-hidden>{label.glyph}</span> {label.label}
                            {detail.mechanic === "LINKS" && detail.kind !== "PAIRS" && ` · ${detail.groupSize} éléments`}
                        </span>
                    </div>
                    {settings.showTimer && (
                        <dl className={styles.meters}>
                            <div>
                                <dt>Temps</dt>
                                <dd>{formatDuration(puzzle.completion?.durationMs ?? elapsed)}</dd>
                            </div>
                        </dl>
                    )}
                </header>

                <p>{detail.description}</p>

                <section className={styles.hints} aria-label="Indices">
                    {puzzle.hints.map((hint, i) => (
                        <Callout key={i} label={`Indice ${i + 1} :`}>
                            {hint}
                        </Callout>
                    ))}
                    {puzzle.hintsRemaining > 0 && !puzzle.completion && (
                        <div className={styles.hintAsk}>
                            <Button variant="ghost" onClick={puzzle.revealHint}>
                                ✧ Demander un indice ({puzzle.hintsRemaining})
                            </Button>
                            {puzzle.hints.length === 0 && (
                                <small>Sans indice, le pétale Autonomie s&apos;ouvre ; il pourra toujours être cueilli une autre fois.</small>
                            )}
                        </div>
                    )}
                </section>

                <MechanicBoard key={puzzle.round} detail={detail} report={puzzle.report} />

                <div className={styles.status} data-tone={puzzle.status?.tone} role="status" aria-live="polite">
                    {puzzle.status?.text ?? ""}
                </div>

                {equilibrium.nudge && (
                    <EquilibriumNudge
                        reason={equilibrium.nudge}
                        hintsRemaining={puzzle.hintsRemaining}
                        onHint={() => {
                            equilibrium.accept();
                            puzzle.revealHint();
                        }}
                        onDismiss={equilibrium.dismiss}
                        pauseHref={pauseHref}
                    />
                )}

                <div className={styles.actions}>
                    <Button variant="ghost" onClick={puzzle.restart}>
                        ↺ Recommencer
                    </Button>
                    <ButtonLink href={pauseHref} variant="ghost">
                        {detail.isDaily ? "Énigme du jour" : detail.world.title}
                    </ButtonLink>
                </div>
            </Panel>

            {puzzle.completion && (
                <CompletionPanel
                    completion={puzzle.completion}
                    worldSlug={detail.world.slug}
                    onReplay={puzzle.restart}
                    onClose={puzzle.dismissCompletion}
                />
            )}
        </>
    );
}
