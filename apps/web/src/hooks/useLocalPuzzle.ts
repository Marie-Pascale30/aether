"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import type { CompletionResult, LevelDetail } from "@aether/shared";
import { api } from "@/lib/api";
import { useInvalidateProgress } from "@/lib/queries";
import { useSound } from "@/lib/sound/SoundProvider";

export interface LocalStatus {
    text: string;
    tone?: "success" | "fail";
}

/**
 * Cycle de vie commun aux mécaniques jouées sur l'appareil : la partie se déroule ici, sans
 * aller-retour serveur ; seul le résultat (durée, essais, indices) est envoyé à la fin.
 * Chaque plateau garde son propre état de jeu et signale ses évènements via les rappels.
 */
export function useLocalPuzzle(detail: LevelDetail) {
    const { play } = useSound();
    const invalidateProgress = useInvalidateProgress();

    const startedAt = useRef(Date.now());
    const [round, setRound] = useState(0); // change à chaque « Recommencer » : remonte le plateau
    const [mistakes, setMistakes] = useState(0);
    /** Avancées de la partie (signal de l'Équilibre Mental : on n'est pas bloqué). */
    const [advances, setAdvances] = useState(0);
    const [hintsShown, setHintsShown] = useState(0);
    const [status, setStatus] = useState<LocalStatus | null>(null);
    const [completion, setCompletion] = useState<CompletionResult | null>(null);

    const submit = useMutation({
        mutationFn: (input: { mistakes: number; hintsUsed: number }) =>
            api.play.result(detail.id, { ...input, durationMs: Date.now() - startedAt.current }),
        onSuccess: (result) => {
            setCompletion(result);
            void invalidateProgress();
        },
        onError: (error) => setStatus({ text: error.message, tone: "fail" }),
    });

    const mistake = useCallback(
        (text: string) => {
            play("mismatch");
            setMistakes((n) => n + 1);
            setStatus({ text, tone: "fail" });
        },
        [play],
    );

    const progress = useCallback(
        (text: string, cue: "select" | "match" = "match") => {
            play(cue);
            setStatus({ text, tone: cue === "match" ? "success" : undefined });
            if (cue === "match") setAdvances((n) => n + 1);
        },
        [play],
    );

    const solved = useCallback(
        (text = "Le monde s'éclaire à nouveau.") => {
            play("complete");
            setStatus({ text, tone: "success" });
            submit.mutate({ mistakes, hintsUsed: hintsShown });
        },
        [play, submit, mistakes, hintsShown],
    );

    const restart = () => {
        startedAt.current = Date.now();
        setRound((n) => n + 1);
        setMistakes(0);
        setAdvances(0);
        setStatus(null);
        setCompletion(null);
        submit.reset();
    };

    return {
        round,
        mistakes,
        advances,
        status,
        completion,
        submitting: submit.isPending,
        hints: detail.hints.slice(0, hintsShown),
        hintsRemaining: detail.hints.length - hintsShown,
        revealHint: () => {
            if (hintsShown >= detail.hints.length) return;
            play("hint");
            setHintsShown((n) => n + 1);
        },
        report: {
            mistake,
            progress,
            solved,
            select: () => play("select"),
            /** Avancée silencieuse (ex. une pièce de plus éclairée). */
            advance: () => setAdvances((n) => n + 1),
        },
        restart,
        dismissCompletion: () => setCompletion(null),
    };
}

export type PuzzleReport = ReturnType<typeof useLocalPuzzle>["report"];
