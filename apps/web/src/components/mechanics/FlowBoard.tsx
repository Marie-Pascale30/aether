"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { flowConnected, flowExtend, flowOwners, flowSolved, type FlowPaths, type FlowPuzzle } from "@aether/shared";
import type { PuzzleReport } from "@/hooks/useLocalPuzzle";
import styles from "./mechanics.module.css";

/**
 * Un symbole et une couleur par flux. Seules les trois premières couleurs restent distinctes
 * pour tous les types de daltonisme : le symbole porte toujours l'identité du flux.
 */
export const FLOW_STYLES = [
    { color: "#3987e5", glyph: "●", name: "rond" },
    { color: "#d95926", glyph: "▲", name: "triangle" },
    { color: "#199e70", glyph: "■", name: "carré" },
    { color: "#c98500", glyph: "◆", name: "losange" },
    { color: "#d55181", glyph: "★", name: "étoile" },
    { color: "#9085e9", glyph: "✚", name: "croix" },
];

export function FlowBoard({ puzzle, report }: { puzzle: FlowPuzzle; report: PuzzleReport }) {
    const [paths, setPaths] = useState<FlowPaths>(() => puzzle.endpoints.map(() => []));
    const [active, setActive] = useState<number | null>(null);
    const [cursor, setCursor] = useState(puzzle.endpoints[0]?.a ?? 0);
    const [done, setDone] = useState(false);
    const boardRef = useRef<HTMLDivElement>(null);
    const lastCell = useRef<number | null>(null);

    const size = puzzle.columns * puzzle.rows;
    const owners = flowOwners(puzzle, paths);
    const filled = owners.filter((owner) => owner !== -1).length;
    const sourceOf = (cell: number) => puzzle.endpoints.findIndex(({ a, b }) => a === cell || b === cell);

    const apply = (next: FlowPaths, flow: number) => {
        const before = flowConnected(puzzle, paths);
        setPaths(next);
        if (flowSolved(puzzle, next)) {
            setDone(true);
            setActive(null);
            report.solved("Chaque flux a trouvé son chemin.");
        } else if (flowConnected(puzzle, next) > before) {
            report.progress(`Flux ${FLOW_STYLES[flow]!.name} relié.`);
        }
    };

    /** Commence ou reprend un tracé depuis cette case (source, ou case d'un flux existant). */
    const grab = (cell: number): number | null => {
        const source = sourceOf(cell);
        const flow = source !== -1 ? source : owners[cell]!;
        if (flow === -1 || flow === undefined) return null;
        const next = flowExtend(puzzle, paths, flow, cell);
        if (next) apply(next, flow);
        return flow;
    };

    const extend = (flow: number, cell: number) => {
        const next = flowExtend(puzzle, paths, flow, cell);
        if (next) apply(next, flow);
        return Boolean(next);
    };

    // ─── Souris et tactile ────────────────────────────────────────────────

    const cellAt = (event: PointerEvent) => {
        const box = boardRef.current!.getBoundingClientRect();
        const x = Math.floor(((event.clientX - box.left) / box.width) * puzzle.columns);
        const y = Math.floor(((event.clientY - box.top) / box.height) * puzzle.rows);
        return x < 0 || y < 0 || x >= puzzle.columns || y >= puzzle.rows ? null : y * puzzle.columns + x;
    };

    const onPointerDown = (event: PointerEvent) => {
        if (done) return;
        const cell = cellAt(event);
        if (cell === null) return;
        const flow = grab(cell);
        if (flow === null) return;
        boardRef.current!.setPointerCapture(event.pointerId);
        setActive(flow);
        setCursor(cell);
        lastCell.current = cell;
    };

    const onPointerMove = (event: PointerEvent) => {
        if (active === null || done) return;
        const cell = cellAt(event);
        if (cell === null || cell === lastCell.current) return;
        lastCell.current = cell;
        if (extend(active, cell)) setCursor(cell);
    };

    const release = () => {
        setActive(null);
        lastCell.current = null;
    };

    // ─── Clavier : flèches pour se déplacer, Entrée pour saisir / lâcher un flux ──

    const onKeyDown = (event: KeyboardEvent) => {
        if (done) return;
        const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: puzzle.columns, ArrowUp: -puzzle.columns };
        if (event.key in moves) {
            event.preventDefault();
            const target = cursor + moves[event.key]!;
            const sameRow = Math.abs(moves[event.key]!) !== 1 || Math.floor(target / puzzle.columns) === Math.floor(cursor / puzzle.columns);
            if (target < 0 || target >= size || !sameRow) return;
            if (active === null || extend(active, target)) setCursor(target);
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (active !== null) setActive(null);
            else setActive(grab(cursor));
        } else if (event.key === "Escape") {
            setActive(null);
        }
    };

    const center = (cell: number) => ({ x: (cell % puzzle.columns) + 0.5, y: Math.floor(cell / puzzle.columns) + 0.5 });

    return (
        <div className={styles.stack}>
            <p className={styles.prompt} aria-live="polite">
                {done
                    ? "Tout le réseau est irrigué."
                    : `${flowConnected(puzzle, paths)} / ${puzzle.endpoints.length} flux reliés${puzzle.fill ? ` · ${filled} / ${size} cases` : ""}`}
            </p>
            <div
                ref={boardRef}
                className={styles.flow}
                style={{ "--columns": puzzle.columns, "--rows": puzzle.rows } as CSSProperties}
                tabIndex={0}
                role="application"
                aria-label={`Réseau de ${puzzle.columns} sur ${puzzle.rows}. Flèches pour se déplacer, Entrée pour saisir ou lâcher un flux.`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={release}
                onPointerCancel={release}
                onKeyDown={onKeyDown}
            >
                <svg viewBox={`0 0 ${puzzle.columns} ${puzzle.rows}`} aria-hidden>
                    {Array.from({ length: size }, (_, cell) => (
                        <rect
                            key={cell}
                            x={(cell % puzzle.columns) + 0.04}
                            y={Math.floor(cell / puzzle.columns) + 0.04}
                            width="0.92"
                            height="0.92"
                            rx="0.12"
                            className={styles.flowCell}
                            data-cursor={cell === cursor || undefined}
                        />
                    ))}
                    {paths.map((path, flow) =>
                        path.length > 1 ? (
                            <polyline
                                key={flow}
                                points={path.map((cell) => `${center(cell).x},${center(cell).y}`).join(" ")}
                                className={styles.flowPath}
                                style={{ stroke: FLOW_STYLES[flow]!.color }}
                                data-active={active === flow || undefined}
                            />
                        ) : null,
                    )}
                    {puzzle.endpoints.flatMap(({ a, b }, flow) =>
                        [a, b].map((cell) => (
                            <g key={`${flow}-${cell}`}>
                                <circle cx={center(cell).x} cy={center(cell).y} r="0.34" style={{ fill: FLOW_STYLES[flow]!.color }} />
                                <text x={center(cell).x} y={center(cell).y} className={styles.flowGlyph}>
                                    {FLOW_STYLES[flow]!.glyph}
                                </text>
                            </g>
                        )),
                    )}
                </svg>
            </div>
            <p className={styles.help}>
                Glisse depuis une source vers sa jumelle (même symbole). Repasser sur un flux le coupe. Au clavier : flèches, puis Entrée pour
                saisir ou lâcher.
            </p>
        </div>
    );
}
