"use client";

import { useEffect, useState, type CSSProperties } from "react";
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
import { Notebook } from "./Notebook";
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
    const { settings, update } = useSettings();
    const [notebookOpen, setNotebookOpen] = useState(false);
    const { applyTool } = puzzle;

    // Ctrl/Cmd + Z : revenir sur le dernier geste (sauf en écrivant dans le carnet).
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const typing = event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement;
            if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
                event.preventDefault();
                applyTool("undo");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [applyTool]);
    const elapsed = useElapsed(puzzle.startedAt, settings.showTimer && !puzzle.finished);
    const label = levelLabel(detail.mechanic, detail.kind);
    const equilibrium = useEquilibrium({ active: !puzzle.finished, progress: puzzle.advances, mistakes: puzzle.mistakes });
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

                <section className={styles.hints} aria-label="Inspirations">
                    {puzzle.hints.map((hint, i) => (
                        <Callout key={i} label={`Inspiration ${i + 1} :`}>
                            {hint}
                        </Callout>
                    ))}
                </section>

                {!puzzle.finished && (
                    <div className={styles.tools} role="toolbar" aria-label="Aides">
                        {puzzle.hintsRemaining > 0 && (
                            <Button variant="ghost" onClick={puzzle.revealHint}>
                                ✧ Inspiration ({puzzle.hintsRemaining})
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => update({ loupe: !settings.loupe })} aria-pressed={settings.loupe}>
                            ⌕ Loupe
                        </Button>
                        {puzzle.tools.undo && (
                            <Button variant="ghost" onClick={() => applyTool("undo")} title="Ctrl + Z">
                                ↶ Retour
                            </Button>
                        )}
                        {puzzle.tools.shuffle && (
                            <Button variant="ghost" onClick={() => applyTool("shuffle")}>
                                ⤨ Mélanger
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => setNotebookOpen((open) => !open)} aria-pressed={notebookOpen}>
                            ✎ Carnet
                        </Button>
                    </div>
                )}
                {!puzzle.finished && puzzle.hints.length === 0 && puzzle.hintsRemaining > 0 && (
                    <p className={styles.toolsNote}>
                        Les aides sont libres ; sans inspiration, le pétale Autonomie s&apos;ouvre. Il pourra toujours être cueilli une autre fois.
                    </p>
                )}
                {notebookOpen && <Notebook levelId={detail.id} />}

                <div className={styles.boardFrame} style={{ "--loupe": settings.loupe ? 1.35 : 1 } as CSSProperties}>
                    <MechanicBoard key={puzzle.round} detail={detail} report={puzzle.report} />
                </div>

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
                        onClarify={
                            puzzle.tools.clarify
                                ? () => {
                                      equilibrium.accept();
                                      applyTool("clarify");
                                  }
                                : undefined
                        }
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
