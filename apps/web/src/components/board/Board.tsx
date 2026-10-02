"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Pair } from "@aether/shared";
import styles from "./Board.module.css";

interface BoardProps {
    symbols: string[];
    columns: number;
    /** Cases actuellement choisies (0, 1 ou 2). */
    selected: number[];
    linked: Pair[];
    /** Paire refusée par le serveur, affichée en erreur un court instant. */
    rejected?: Pair | null;
    disabled?: boolean;
    onPick: (index: number) => void;
}

interface Point {
    x: number;
    y: number;
}

export function Board({ symbols, columns, selected, linked, rejected, disabled, onPick }: BoardProps) {
    const boardRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [centers, setCenters] = useState<Point[]>([]);

    // Les liens relient les centres des cases : on les mesure, et on remesure quand le plateau change de taille.
    useLayoutEffect(() => {
        const board = boardRef.current;
        if (!board) return;

        const measure = () => {
            const origin = board.getBoundingClientRect();
            setCenters(
                nodeRefs.current.map((node) => {
                    const box = node?.getBoundingClientRect();
                    return box
                        ? { x: box.left - origin.left + box.width / 2, y: box.top - origin.top + box.height / 2 }
                        : { x: 0, y: 0 };
                }),
            );
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(board);
        return () => observer.disconnect();
    }, [symbols.length, columns]);

    const linkedCells = new Set(linked.flat());
    const rejectedCells = new Set(rejected ?? []);

    return (
        <div ref={boardRef} className={styles.board} style={{ "--columns": columns } as CSSProperties}>
            {symbols.map((symbol, i) => {
                const isLinked = linkedCells.has(i);
                return (
                    <button
                        key={i}
                        ref={(node) => {
                            nodeRefs.current[i] = node;
                        }}
                        type="button"
                        className={styles.node}
                        data-selected={selected.includes(i) || undefined}
                        data-linked={isLinked || undefined}
                        data-rejected={rejectedCells.has(i) || undefined}
                        aria-pressed={selected.includes(i)}
                        aria-disabled={isLinked || disabled || undefined}
                        aria-label={`Écho ${i + 1} : ${symbol}${isLinked ? " (relié)" : ""}`}
                        onClick={() => onPick(i)}
                    >
                        <span className={styles.shape} aria-hidden>
                            {symbol}
                        </span>
                        <small className={styles.label} aria-hidden>
                            ÉCHO {i + 1}
                        </small>
                    </button>
                );
            })}

            <svg className={styles.links} aria-hidden>
                {linked.map(([a, b]) => {
                    const from = centers[a];
                    const to = centers[b];
                    if (!from || !to) return null;
                    const length = Math.hypot(to.x - from.x, to.y - from.y);
                    return (
                        <line
                            key={`${Math.min(a, b)}-${Math.max(a, b)}`}
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            style={{ "--length": length } as CSSProperties}
                        />
                    );
                })}
            </svg>
        </div>
    );
}
