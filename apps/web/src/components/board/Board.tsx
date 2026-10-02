"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Group } from "@aether/shared";
import styles from "./Board.module.css";

interface BoardProps {
    symbols: string[];
    columns: number;
    /** Cases actuellement choisies, dans l'ordre de sélection. */
    selected: number[];
    linked: Group[];
    /** Cases refusées par le serveur, affichées en erreur un court instant. */
    rejected?: number[] | null;
    /** Suites : numérote les cases choisies et les chemins tracés. */
    ordered?: boolean;
    disabled?: boolean;
    onPick: (index: number) => void;
}

interface Point {
    x: number;
    y: number;
}

export function Board({ symbols, columns, selected, linked, rejected, ordered = false, disabled, onPick }: BoardProps) {
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

    /** Case → [n° du groupe trouvé, rang dans ce groupe]. */
    const linkedAt = new Map<number, [number, number]>();
    linked.forEach((group, g) => group.forEach((cell, rank) => linkedAt.set(cell, [g, rank])));
    const rejectedCells = new Set(rejected ?? []);

    return (
        <div ref={boardRef} className={styles.board} style={{ "--columns": columns } as CSSProperties}>
            {symbols.map((symbol, i) => {
                const link = linkedAt.get(i);
                const rank = selected.indexOf(i);
                const order = ordered ? (link ? link[1] + 1 : rank !== -1 ? rank + 1 : null) : null;
                return (
                    <button
                        key={i}
                        ref={(node) => {
                            nodeRefs.current[i] = node;
                        }}
                        type="button"
                        className={styles.node}
                        data-selected={rank !== -1 || undefined}
                        data-linked={link !== undefined || undefined}
                        data-rejected={rejectedCells.has(i) || undefined}
                        aria-pressed={rank !== -1}
                        aria-disabled={link !== undefined || disabled || undefined}
                        aria-label={`Écho ${i + 1} : ${symbol}${link ? " (relié)" : ""}${order && rank !== -1 ? `, étape ${order}` : ""}`}
                        onClick={() => onPick(i)}
                    >
                        {order !== null && (
                            <span className={styles.order} aria-hidden>
                                {order}
                            </span>
                        )}
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
                {linked.map((group) => {
                    const points = group.map((cell) => centers[cell]).filter((p): p is Point => Boolean(p));
                    if (points.length !== group.length) return null;
                    const length = points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y), 0);
                    return (
                        <polyline
                            key={group.join("-")}
                            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                            style={{ "--length": length } as CSSProperties}
                        />
                    );
                })}
            </svg>
        </div>
    );
}
