"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { memoryAnswer, memoryBeginRecall, memoryPrompt, memoryStart, type MemoryPuzzle } from "@aether/shared";
import { Button } from "@/components/ui/Button";
import type { PuzzleReport } from "@/hooks/useLocalPuzzle";
import styles from "./mechanics.module.css";

/** Délai entre deux effacements en variante progressive (le joueur peut passer à la suite avant). */
const FADE_STEP_MS = 1100;

export function MemoryBoard({ puzzle, report }: { puzzle: MemoryPuzzle; report: PuzzleReport }) {
    const [state, setState] = useState(memoryStart);
    const [wrongCell, setWrongCell] = useState<number | null>(null);
    const prompt = memoryPrompt(puzzle, state);
    const observing = state.phase === "observe";

    const beginRecall = () => {
        setState((current) => (current.phase === "observe" ? memoryBeginRecall(current) : current));
        report.progress(`Où se trouvait ${puzzle.cells[puzzle.targets[0]!]} ?`, "select");
    };

    // Variante progressive : une fois tout effacé, la mémoire prend le relais d'elle-même.
    const beginRecallRef = useRef(beginRecall);
    beginRecallRef.current = beginRecall;
    const filled = puzzle.cells.filter(Boolean).length;
    useEffect(() => {
        if (!observing || !puzzle.progressive) return;
        const timer = setTimeout(() => beginRecallRef.current(), FADE_STEP_MS * (filled + 1));
        return () => clearTimeout(timer);
    }, [observing, puzzle.progressive, filled]);

    const pick = (cell: number) => {
        if (state.phase !== "recall") return;
        const result = memoryAnswer(puzzle, state, cell);
        if (!result.correct) {
            if (result.state !== state) {
                setWrongCell(cell);
                setTimeout(() => setWrongCell(null), 600);
                report.mistake("Pas tout à fait : cherche encore.");
                setState(result.state);
            }
            return;
        }
        setState(result.state);
        if (result.state.phase === "done") report.solved("Tout est revenu en mémoire.");
        else report.progress(`Juste. Et maintenant : où se trouvait ${memoryPrompt(puzzle, result.state)} ?`);
    };

    // Ordre d'effacement en variante progressive : celui des cases.
    let fadeIndex = 0;

    return (
        <div className={styles.stack}>
            <div className={styles.prompt} aria-live="polite">
                {observing ? (
                    <span>{puzzle.progressive ? "Observe : les symboles vont s'effacer un à un." : "Observe le plateau aussi longtemps que tu le souhaites."}</span>
                ) : prompt ? (
                    <span>
                        Où se trouvait <span className={styles.promptSymbol}>{prompt}</span> ?
                    </span>
                ) : (
                    <span>Tout est revenu.</span>
                )}
            </div>

            <div className={styles.grid} style={{ "--columns": puzzle.columns } as CSSProperties}>
                {puzzle.cells.map((symbol, i) => {
                    const found = state.found.includes(i);
                    const visible = observing || found;
                    const delay = symbol && puzzle.progressive && observing ? (fadeIndex++ + 1) * FADE_STEP_MS : null;
                    return (
                        <button
                            key={i}
                            type="button"
                            className={styles.cell}
                            data-empty={!symbol || undefined}
                            data-found={found || undefined}
                            data-wrong={wrongCell === i || undefined}
                            disabled={observing || found}
                            onClick={() => pick(i)}
                            aria-label={visible && symbol ? `Case ${i + 1} : ${symbol}` : `Case ${i + 1}`}
                        >
                            <span
                                className={styles.symbol}
                                data-hidden={!visible || undefined}
                                data-fading={delay !== null || undefined}
                                style={delay !== null ? { animationDelay: `${delay}ms` } : undefined}
                            >
                                {visible ? symbol : ""}
                            </span>
                        </button>
                    );
                })}
            </div>

            {observing && (
                <div className={styles.actions}>
                    <Button variant="primary" onClick={beginRecall}>
                        J&apos;ai mémorisé
                    </Button>
                </div>
            )}
        </div>
    );
}
