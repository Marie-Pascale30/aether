"use client";

import { useEffect, useRef, useState } from "react";
import { findGroupIndex, groupsAt, isOrdered, MISMATCH_FEEDBACK_MS, type LevelDetail } from "@aether/shared";
import { Board } from "@/components/board/Board";
import type { PuzzleReport } from "@/hooks/useLocalPuzzle";
import { KIND_COPY } from "@/lib/kinds";

const STATUS = {
    retry: "Essaie une autre relation.",
    mismatch: "Ce lien ne résonne pas. Observe encore.",
    mismatchOrder: "Ces éléments ne se suivent pas ainsi. Observe encore.",
    complete: "Le lien est juste. Le jardin respire à nouveau.",
} as const;

/** Liens (paires, familles, suites) : chaque groupe choisi est comparé aux réponses, sur l'appareil. */
export function LinksBoard({ detail, report }: { detail: LevelDetail; report: PuzzleReport }) {
    const ordered = isOrdered(detail.kind);
    const size = detail.groupSize;
    const [found, setFound] = useState<number[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [rejected, setRejected] = useState<number[] | null>(null);
    const feedback = useRef<ReturnType<typeof setTimeout>>(undefined);
    const done = found.length === detail.groups.length;

    // Consigne affichée au début de chaque partie (le plateau est remonté à chaque « Recommencer »).
    const { note } = report;
    useEffect(() => note(KIND_COPY[detail.kind].instruction(size)), [note, detail.kind, size]);
    useEffect(() => () => clearTimeout(feedback.current), []);

    const linked = groupsAt(detail.groups, found);
    const linkedCells = new Set(linked.flat());

    const pick = (index: number) => {
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
            symbols={detail.symbols}
            columns={detail.columns}
            selected={rejected ?? selected}
            linked={linked}
            rejected={rejected}
            ordered={ordered}
            disabled={done || Boolean(rejected)}
            onPick={pick}
        />
    );
}
