"use client";

import { useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { gearsSolved, litTiles, type GearsPuzzle } from "@aether/shared";
import type { PuzzleReport } from "@/hooks/useLocalPuzzle";
import styles from "./mechanics.module.css";

/** Extrémité de chaque ouverture (N, E, S, O) dans une pièce de 100 × 100. */
const ENDS: [number, number, number][] = [
    [1, 50, 0],
    [2, 100, 50],
    [4, 50, 100],
    [8, 0, 50],
];

const bitCount = (mask: number) => ENDS.filter(([bit]) => mask & bit).length;

export function GearsBoard({ puzzle, report }: { puzzle: GearsPuzzle; report: PuzzleReport }) {
    // Quarts de tour cumulés (pas de modulo) : l'animation continue toujours dans le même sens.
    const [turns, setTurns] = useState(() => puzzle.tiles.map((tile) => tile.rotation));
    const [done, setDone] = useState(false);
    const rotations = useMemo(() => turns.map((t) => ((t % 4) + 4) % 4), [turns]);
    const lit = useMemo(() => litTiles(puzzle, rotations), [puzzle, rotations]);
    const playable = puzzle.tiles.filter((tile) => tile.mask !== 0).length;
    const mostLit = useRef(lit.size);

    const rotate = (index: number, delta: 1 | -1) => {
        if (done || puzzle.tiles[index]!.fixed) return;
        const next = turns.map((t, i) => (i === index ? t + delta : t));
        setTurns(next);
        const nextRotations = next.map((t) => ((t % 4) + 4) % 4);
        if (gearsSolved(puzzle, nextRotations)) {
            setDone(true);
            report.solved("La lumière parcourt toute la machine.");
        } else {
            report.select();
            const nextLit = litTiles(puzzle, nextRotations).size;
            if (nextLit > mostLit.current) {
                mostLit.current = nextLit;
                report.advance();
            }
        }
    };

    const onContextMenu = (event: MouseEvent, index: number) => {
        event.preventDefault();
        rotate(index, -1);
    };

    return (
        <div className={styles.stack}>
            <p className={styles.prompt} aria-live="polite">
                {done ? "Tout est relié." : `${lit.size} / ${playable} pièces éclairées`}
            </p>
            <div className={styles.grid} data-tight style={{ "--columns": puzzle.columns } as CSSProperties}>
                {puzzle.tiles.map((tile, i) => {
                    const isLit = lit.has(i);
                    const isSource = i === puzzle.source;
                    const isLamp = !isSource && bitCount(tile.mask) === 1;
                    return (
                        <button
                            key={i}
                            type="button"
                            className={styles.tile}
                            data-lit={isLit || undefined}
                            data-fixed={tile.fixed || undefined}
                            aria-disabled={tile.fixed || done || undefined}
                            aria-label={`Pièce ${i + 1}${isSource ? ", source" : ""}${tile.fixed ? ", scellée" : ""}${isLit ? ", éclairée" : ""}`}
                            onClick={(event) => rotate(i, event.shiftKey ? -1 : 1)}
                            onContextMenu={(event) => onContextMenu(event, i)}
                        >
                            {tile.mask !== 0 && (
                                <svg viewBox="0 0 100 100" aria-hidden>
                                    <g className={styles.pipes} style={{ transform: `rotate(${turns[i]! * 90}deg)` }}>
                                        {ENDS.filter(([bit]) => tile.mask & bit).map(([bit, x, y]) => (
                                            <line key={bit} x1="50" y1="50" x2={x} y2={y} />
                                        ))}
                                        <circle cx="50" cy="50" r={isSource ? 16 : isLamp ? 13 : 7} className={isSource ? styles.source : isLamp ? styles.lamp : undefined} />
                                    </g>
                                </svg>
                            )}
                        </button>
                    );
                })}
            </div>
            <p className={styles.help}>Clic pour tourner · clic droit ou Maj + clic dans l&apos;autre sens · les pièces bordées d&apos;or sont scellées.</p>
        </div>
    );
}
