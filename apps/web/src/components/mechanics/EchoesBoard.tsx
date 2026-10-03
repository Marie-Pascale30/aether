"use client";

import { useState } from "react";
import { echoesCorrect, type EchoesPuzzle } from "@aether/shared";
import type { PuzzleReport } from "@/hooks/useLocalPuzzle";
import styles from "./mechanics.module.css";

export function EchoesBoard({ puzzle, report }: { puzzle: EchoesPuzzle; report: PuzzleReport }) {
    const [ruledOut, setRuledOut] = useState<number[]>([]);
    const [found, setFound] = useState(false);

    const choose = (option: number) => {
        if (found || ruledOut.includes(option)) return;
        if (echoesCorrect(puzzle, option)) {
            setFound(true);
            report.solved(`L'écho est juste. ${puzzle.explanation}`);
        } else {
            setRuledOut((current) => [...current, option]);
            report.mistake("Cet écho ne répond pas à la règle. Observe encore les exemples.");
        }
    };

    return (
        <div className={styles.stack}>
            <ol className={styles.examples} aria-label="Exemples">
                {puzzle.examples.map((example, i) => (
                    <li key={i}>
                        <span className={styles.echo}>{example.from}</span>
                        <span className={styles.arrow} aria-label="devient">
                            ⟹
                        </span>
                        <span className={styles.echo}>{example.to}</span>
                    </li>
                ))}
                <li className={styles.question}>
                    <span className={styles.echo}>{puzzle.question}</span>
                    <span className={styles.arrow} aria-label="devient">
                        ⟹
                    </span>
                    <span className={styles.echo} data-answer={found || undefined}>
                        {found ? puzzle.options[puzzle.answer] : "?"}
                    </span>
                </li>
            </ol>

            {found && <p className={styles.explanation}>{puzzle.explanation}</p>}

            <div className={styles.options} role="group" aria-label="Propositions">
                {puzzle.options.map((option, i) => (
                    <button
                        key={i}
                        type="button"
                        className={styles.option}
                        data-ruled-out={ruledOut.includes(i) || undefined}
                        data-correct={(found && i === puzzle.answer) || undefined}
                        disabled={found || ruledOut.includes(i)}
                        onClick={() => choose(i)}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
}
