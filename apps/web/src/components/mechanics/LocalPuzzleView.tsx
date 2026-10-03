"use client";

import type { EchoesPuzzle, FlowPuzzle, GearsPuzzle, LevelDetail, LocalMechanic, MemoryPuzzle } from "@aether/shared";
import { CompletionPanel } from "@/components/puzzle/CompletionPanel";
import puzzleStyles from "@/components/puzzle/Puzzle.module.css";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Panel } from "@/components/ui/Panel";
import { useLocalPuzzle, type PuzzleReport } from "@/hooks/useLocalPuzzle";
import { pad2 } from "@/lib/format";
import { MECHANIC_COPY } from "@/lib/kinds";
import { EchoesBoard } from "./EchoesBoard";
import { FlowBoard } from "./FlowBoard";
import { GearsBoard } from "./GearsBoard";
import { MemoryBoard } from "./MemoryBoard";

/** Plateau de la mécanique, remonté à chaque « Recommencer » (via `key`). */
function MechanicBoard({ detail, report }: { detail: LevelDetail; report: PuzzleReport }) {
    switch (detail.mechanic as LocalMechanic) {
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

/** Énigme jouée entièrement sur l'appareil ; le résultat est envoyé à la fin. */
export function LocalPuzzleView({ detail }: { detail: LevelDetail }) {
    const puzzle = useLocalPuzzle(detail);
    const copy = MECHANIC_COPY[detail.mechanic as LocalMechanic];

    return (
        <>
            <Panel>
                <header className={puzzleStyles.head}>
                    <div>
                        <div className={puzzleStyles.level}>
                            {detail.isDaily
                                ? "ÉNIGME DU JOUR"
                                : `${detail.world.title.toUpperCase()} · ${detail.position > 0 ? `ÉNIGME ${pad2(detail.position)} / ${pad2(detail.total)}` : "APERÇU · BROUILLON"}`}
                        </div>
                        <h2>{detail.title}</h2>
                        <span className={puzzleStyles.kind}>
                            <span aria-hidden>{copy.glyph}</span> {copy.label}
                        </span>
                    </div>
                </header>

                <p>{detail.description}</p>

                <section className={puzzleStyles.hints} aria-label="Indices">
                    {puzzle.hints.map((hint, i) => (
                        <Callout key={i} label={`Indice ${i + 1} :`}>
                            {hint}
                        </Callout>
                    ))}
                    {puzzle.hintsRemaining > 0 && !puzzle.completion && (
                        <div className={puzzleStyles.hintAsk}>
                            <Button variant="ghost" onClick={puzzle.revealHint}>
                                ✧ Demander un indice ({puzzle.hintsRemaining})
                            </Button>
                        </div>
                    )}
                </section>

                <MechanicBoard key={puzzle.round} detail={detail} report={puzzle.report} />

                <div className={puzzleStyles.status} data-tone={puzzle.status?.tone} role="status" aria-live="polite">
                    {puzzle.submitting ? "Le monde s'éclaire…" : (puzzle.status?.text ?? "")}
                </div>

                <div className={puzzleStyles.actions}>
                    <Button variant="ghost" onClick={puzzle.restart}>
                        ↺ Recommencer
                    </Button>
                    <ButtonLink href={detail.isDaily ? "/quotidien" : `/mondes/${detail.world.slug}`} variant="ghost">
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
