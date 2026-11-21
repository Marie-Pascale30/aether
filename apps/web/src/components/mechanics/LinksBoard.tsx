"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { findGroupIndex, groupsAt, isOrdered, MISMATCH_FEEDBACK_MS, type LevelDetail } from "@aether/shared";
import { Board } from "@/components/board/Board";
import { useBoardTool, type PuzzleReport } from "@/hooks/useLocalPuzzle";
import { KIND_COPY } from "@/lib/kinds";

const STATUS = {
    retry: "Essaie une autre relation.",
    mismatch: "Ce lien ne résonne pas. Observe encore.",
    mismatchOrder: "Ces éléments ne se suivent pas ainsi. Observe encore.",
    complete: "Le lien est juste. Le jardin respire à nouveau.",
    undo: "Le dernier lien s'est dénoué.",
    shuffle: "Les éléments ont changé de place : regarde-les autrement.",
    clarify: "Quelques éléments s'estompent : ils ne font partie d'aucun lien.",
} as const;

/** Mélange de Fisher-Yates (au moment du geste : le hasard n'a pas à être reproductible). */
function shuffled(items: number[]): number[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
}

/**
 * Liens (paires, familles, suites) : chaque groupe choisi est comparé aux réponses, sur l'appareil.
 * Aides : revenir sur le dernier lien, mélanger le plateau, et (Équilibre) éclaircir quelques leurres.
 * Le plateau affiché peut être mélangé : `order[case affichée]` donne la case d'origine.
 */
export function LinksBoard({ detail, report }: { detail: LevelDetail; report: PuzzleReport }) {
    const ordered = isOrdered(detail.kind);
    const size = detail.groupSize;
    const [found, setFound] = useState<number[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [rejected, setRejected] = useState<number[] | null>(null);
    const [order, setOrder] = useState(() => detail.symbols.map((_, i) => i));
    const [faded, setFaded] = useState<number[]>([]);
    const feedback = useRef<ReturnType<typeof setTimeout>>(undefined);
    const done = found.length === detail.groups.length;

    // Consigne affichée au début de chaque partie (le plateau est remonté à chaque « Recommencer »).
    const { note } = report;
    useEffect(() => note(KIND_COPY[detail.kind].instruction(size)), [note, detail.kind, size]);
    useEffect(() => () => clearTimeout(feedback.current), []);

    const position = useMemo(() => {
        const inverse: number[] = [];
        order.forEach((cell, display) => (inverse[cell] = display));
        return inverse;
    }, [order]);
    const toDisplay = (cells: readonly number[]) => cells.map((cell) => position[cell]!);

    const linked = groupsAt(detail.groups, found);
    const linkedCells = new Set(linked.flat());
    const decoys = detail.symbols.map((_, i) => i).filter((cell) => !detail.groups.some((group) => group.includes(cell)));

    useBoardTool(
        report,
        "undo",
        () => {
            setFound((current) => current.slice(0, -1));
            setSelected([]);
            report.note(STATUS.undo);
        },
        found.length > 0 && !done,
    );
    useBoardTool(
        report,
        "shuffle",
        () => {
            setOrder((current) => shuffled(current));
            setSelected([]);
            report.note(STATUS.shuffle);
        },
        !done,
    );
    useBoardTool(
        report,
        "clarify",
        () => {
            // La moitié des leurres (au moins un) s'estompe, sans rien dire des bonnes réponses.
            setFaded(shuffled(decoys).slice(0, Math.max(1, Math.ceil(decoys.length / 2))));
            report.note(STATUS.clarify);
        },
        !done && decoys.length > 0 && faded.length === 0,
    );

    const pick = (display: number) => {
        const index = order[display]!;
        if (done || rejected || linkedCells.has(index)) return;

        const rank = selected.indexOf(index);
        if (rank !== -1) {
            // Suite : re-choisir une étape la retire avec toutes les suivantes (on reprend le chemin là).
            setSelected(ordered ? selected.slice(0, rank) : selected.filter((cell) => cell !== index));
            report.select();
            return;
        }

        const next = [...selected, index];
        if (next.length < size) {
            setSelected(next);
            report.select();
            return;
        }

        setSelected([]);
        const group = findGroupIndex(detail.groups, found, next, ordered);
        report.attempt(next, group !== -1);

        if (group === -1) {
            setRejected(next);
            report.mistake(ordered ? STATUS.mismatchOrder : STATUS.mismatch);
            feedback.current = setTimeout(() => {
                setRejected(null);
                report.note(STATUS.retry);
            }, MISMATCH_FEEDBACK_MS);
            return;
        }

        const nextFound = [...found, group];
        setFound(nextFound);
        const remaining = detail.groups.length - nextFound.length;
        if (remaining === 0) report.solved(STATUS.complete);
        else report.progress(KIND_COPY[detail.kind].found(remaining));
    };

    return (
        <Board
            symbols={order.map((cell) => detail.symbols[cell]!)}
            columns={detail.columns}
            selected={toDisplay(rejected ?? selected)}
            linked={linked.map(toDisplay)}
            rejected={rejected && toDisplay(rejected)}
            faded={toDisplay(faded)}
            ordered={ordered}
            disabled={done || Boolean(rejected)}
            onPick={pick}
        />
    );
}
