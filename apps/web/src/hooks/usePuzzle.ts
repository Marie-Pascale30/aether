"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MISMATCH_FEEDBACK_MS, type AttemptResult, type CompletionResult, type Pair, type SessionState } from "@aether/shared";
import { api, ApiError } from "@/lib/api";
import { useInvalidateProgress, useLevel } from "@/lib/queries";
import { useSound } from "@/lib/sound/SoundProvider";

export interface PuzzleStatus {
    text: string;
    tone?: "success" | "fail";
}

const STATUS = {
    idle: "Choisis deux éléments qui vont ensemble.",
    retry: "Essaie une autre relation.",
    mismatch: "Ce lien ne résonne pas. Observe encore.",
    partial: (remaining: number) =>
        remaining > 1 ? `Connexion trouvée. Il reste ${remaining} échos.` : "Connexion trouvée. Il reste un écho.",
    complete: "Le lien est juste. Le jardin respire à nouveau.",
    hint: "Un indice s'est révélé.",
} as const;

/**
 * État d'une partie côté client. Le serveur reste l'arbitre : ce hook ne connaît pas les réponses,
 * il gère la sélection, soumet les paires, puis traduit les réponses en retours visuels et sonores.
 */
export function usePuzzle(levelId: string) {
    const { play } = useSound();
    const invalidateProgress = useInvalidateProgress();
    const level = useLevel(levelId);

    const [session, setSession] = useState<SessionState | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [pending, setPending] = useState<Pair | null>(null);
    const [rejected, setRejected] = useState<Pair | null>(null);
    const [completion, setCompletion] = useState<CompletionResult | null>(null);
    const [status, setStatus] = useState<PuzzleStatus>({ text: STATUS.idle });

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
            setSelected(null);
            setPending(null);
            setCompletion(null);
            setStatus({ text: STATUS.idle });
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
        setSession((current) => current && { ...current, foundPairs: result.foundPairs, mistakes: result.mistakes });

        if (result.result === "mismatch") {
            play("mismatch");
            setRejected(result.pair);
            setStatus({ text: STATUS.mismatch, tone: "fail" });
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
        setStatus({ text: STATUS.partial(result.remaining), tone: "success" });
    };

    const attempt = useMutation({
        mutationFn: ([a, b]: Pair) => api.play.attempt(session!.sessionId, a, b),
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

    const linkedCells = useMemo(() => new Set(session?.foundPairs.flat() ?? []), [session?.foundPairs]);
    const busy = !session || Boolean(completion) || Boolean(pending) || Boolean(rejected) || start.isPending;

    const pick = useCallback(
        (index: number) => {
            if (busy || linkedCells.has(index)) return;

            if (selected === index) {
                setSelected(null);
                play("deselect");
                return;
            }
            if (selected === null) {
                setSelected(index);
                play("select");
                return;
            }

            const pair: Pair = [selected, index];
            setSelected(null);
            setPending(pair);
            attempt.mutate(pair);
        },
        [busy, linkedCells, selected, play, attempt],
    );

    const hintsRemaining = session ? session.hintCount - session.hints.length : 0;

    return {
        level,
        session,
        completion,
        status,
        rejected,
        /** Cases à afficher comme sélectionnées (la paire en vol compte). */
        selected: pending ?? (selected === null ? [] : [selected]),
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
