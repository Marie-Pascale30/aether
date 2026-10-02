"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MISMATCH_FEEDBACK_MS, type AttemptResult, type CompletionResult, type SessionState } from "@aether/shared";
import { api, ApiError } from "@/lib/api";
import { KIND_COPY } from "@/lib/kinds";
import { useInvalidateProgress, useLevel } from "@/lib/queries";
import { useSound } from "@/lib/sound/SoundProvider";

export interface PuzzleStatus {
    text: string;
    tone?: "success" | "fail";
}

const STATUS = {
    retry: "Essaie une autre relation.",
    mismatch: "Ce lien ne résonne pas. Observe encore.",
    mismatchOrder: "Ces éléments ne se suivent pas ainsi. Observe encore.",
    complete: "Le lien est juste. Le jardin respire à nouveau.",
    hint: "Un indice s'est révélé.",
} as const;

/**
 * État d'une partie côté client. Le serveur reste l'arbitre : ce hook ne connaît pas les réponses,
 * il gère la sélection, soumet les groupes, puis traduit les réponses en retours visuels et sonores.
 */
export function usePuzzle(levelId: string) {
    const { play } = useSound();
    const invalidateProgress = useInvalidateProgress();
    const level = useLevel(levelId);
    const kind = level.data?.kind ?? "PAIRS";
    const groupSize = level.data?.groupSize ?? 2;
    const ordered = kind === "SEQUENCE";
    const idle = KIND_COPY[kind].instruction(groupSize);

    const [session, setSession] = useState<SessionState | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [pending, setPending] = useState<number[] | null>(null);
    const [rejected, setRejected] = useState<number[] | null>(null);
    const [completion, setCompletion] = useState<CompletionResult | null>(null);
    const [status, setStatus] = useState<PuzzleStatus | null>(null);

    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const startRequested = useRef(false);

    const clearFeedback = () => {
        clearTimeout(feedbackTimer.current);
        setRejected(null);
    };

    useEffect(() => () => clearTimeout(feedbackTimer.current), []);

    // ─── Démarrage / reprise ──────────────────────────────────────────────

    const start = useMutation({
        mutationFn: (restart: boolean) => api.play.start(levelId, restart),
        onSuccess: (state) => {
            clearFeedback();
            setSession(state);
            setSelected([]);
            setPending(null);
            setCompletion(null);
            setStatus(null);
        },
    });

    useEffect(() => {
        // Ref : évite une double partie quand React rejoue l'effet en mode strict.
        if (!level.data || startRequested.current) return;
        startRequested.current = true;
        start.mutate(false);
    }, [level.data, start]);

    // ─── Coups ────────────────────────────────────────────────────────────

    const handleResult = (result: AttemptResult) => {
        setPending(null);
        setSession((current) => current && { ...current, foundGroups: result.foundGroups, mistakes: result.mistakes });

        if (result.result === "mismatch") {
            play("mismatch");
            setRejected(result.cells);
            setStatus({ text: ordered ? STATUS.mismatchOrder : STATUS.mismatch, tone: "fail" });
            feedbackTimer.current = setTimeout(() => {
                setRejected(null);
                setStatus({ text: STATUS.retry });
            }, MISMATCH_FEEDBACK_MS);
            return;
        }

        if (result.completion) {
            play("complete");
            setCompletion(result.completion);
            setSession((current) => current && { ...current, completed: true });
            setStatus({ text: STATUS.complete, tone: "success" });
            void invalidateProgress();
            return;
        }

        play("match");
        setStatus({ text: KIND_COPY[kind].found(result.remaining), tone: "success" });
    };

    const attempt = useMutation({
        mutationFn: (cells: number[]) => api.play.attempt(session!.sessionId, cells),
        onSuccess: handleResult,
        onError: (error) => {
            setPending(null);
            setStatus({ text: error.message, tone: "fail" });
            // Partie modifiée ailleurs (autre onglet) : on se resynchronise avec le serveur.
            if (error instanceof ApiError && error.status === 409) start.mutate(false);
        },
    });

    const hint = useMutation({
        mutationFn: () => api.play.hint(session!.sessionId),
        onSuccess: (result) => {
            play("hint");
            setSession((current) => current && { ...current, hints: result.hints });
            setStatus({ text: STATUS.hint });
        },
        onError: (error) => setStatus({ text: error.message, tone: "fail" }),
    });

    const linkedCells = useMemo(() => new Set(session?.foundGroups.flat() ?? []), [session?.foundGroups]);
    const busy = !session || Boolean(completion) || Boolean(pending) || Boolean(rejected) || start.isPending;

    const pick = useCallback(
        (index: number) => {
            if (busy || linkedCells.has(index)) return;

            const rank = selected.indexOf(index);
            if (rank !== -1) {
                // Suite : re-cliquer une étape la retire avec toutes les suivantes (on reprend le chemin à cet endroit).
                setSelected(ordered ? selected.slice(0, rank) : selected.filter((cell) => cell !== index));
                play("deselect");
                return;
            }

            const next = [...selected, index];
            if (next.length < groupSize) {
                setSelected(next);
                play("select");
                return;
            }

            setSelected([]);
            setPending(next);
            attempt.mutate(next);
        },
        [busy, linkedCells, selected, ordered, groupSize, play, attempt],
    );

    const hintsRemaining = session ? session.hintCount - session.hints.length : 0;

    return {
        level,
        session,
        completion,
        status: status ?? { text: idle },
        rejected,
        ordered,
        /** Cases à afficher comme sélectionnées (le groupe en vol compte). */
        selected: pending ?? selected,
        busy,
        pick,
        requestHint: () => {
            if (session && hintsRemaining > 0 && !completion && !hint.isPending) hint.mutate();
        },
        hintsRemaining,
        hintPending: hint.isPending,
        restart: () => start.mutate(true),
        restarting: start.isPending,
        startError: start.error,
        dismissCompletion: () => setCompletion(null),
    };
}
