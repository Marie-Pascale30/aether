"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dailyOutcome, describeWin, petalsFor, type CompletionResult, type LevelDetail } from "@aether/shared";
import { outbox } from "@/lib/offline/outbox";
import { dailyDateOf, usePlayer, type PlayerState } from "@/lib/offline/player";
import { onResultSynced } from "@/lib/offline/sync";
import { useMe } from "@/lib/queries";
import { useSound } from "@/lib/sound/SoundProvider";

export interface LocalStatus {
    text: string;
    tone?: "success" | "fail";
}

interface Win {
    petals: number;
    durationMs: number;
    hintsUsed: number;
    playedAt: Date;
}

/** Fin de partie calculée sur l'appareil : le panneau s'affiche tout de suite, réseau ou pas. */
function localCompletion(detail: LevelDetail, player: PlayerState | null, win: Win): CompletionResult {
    const inBundle = player?.journey.level(detail.id);
    if (!player || !inBundle) {
        // Brouillon d'administrateur : hors parcours, rien d'autre à annoncer.
        return {
            ...win,
            levelPetals: win.petals,
            newPetals: win.petals,
            bestTimeMs: win.durationMs,
            nextLevelId: detail.nextLevelId,
            worldCompleted: false,
            nextWorld: null,
            gameCompleted: false,
            garden: { stage: 0, completedLevels: 0, totalLevels: 0 },
            daily: null,
            milestones: [],
        };
    }
    const date = detail.isDaily ? dailyDateOf(player.bundle, detail.id, win.playedAt) : null;
    return {
        ...describeWin(player.bundle, player.records, { levelId: detail.id, ...win }),
        daily: date ? dailyOutcome(player.dailyResults, date, player.today, win.petals) : null,
        milestones: [],
    };
}

/**
 * Cycle de vie commun à toutes les mécaniques : la partie se déroule sur l'appareil. À la
 * victoire, le résultat rejoint la file d'envoi (il partira dès que le réseau le permet) et le
 * panneau de fin est calculé localement ; les repères atteints s'y ajoutent quand le serveur répond.
 */
export function useLocalPuzzle(detail: LevelDetail) {
    const { play } = useSound();
    const { data: me } = useMe();
    const { data: player } = usePlayer();
    const playerRef = useRef(player);
    playerRef.current = player;

    const startedAt = useRef(Date.now());
    const mistakesRef = useRef(0);
    const hintsRef = useRef(0);
    const attempts = useRef<{ cells: number[]; correct: boolean }[]>([]);
    const unsubscribe = useRef<() => void>(undefined);

    const [round, setRound] = useState(0); // change à chaque « Recommencer » : remonte le plateau
    const [mistakes, setMistakes] = useState(0);
    /** Avancées de la partie (signal de l'Équilibre Mental : on n'est pas bloqué). */
    const [advances, setAdvances] = useState(0);
    const [hintsShown, setHintsShown] = useState(0);
    const [status, setStatus] = useState<LocalStatus | null>(null);
    const [completion, setCompletion] = useState<CompletionResult | null>(null);

    useEffect(() => () => unsubscribe.current?.(), []);

    const mistake = useCallback(
        (text: string) => {
            play("mismatch");
            mistakesRef.current += 1;
            setMistakes(mistakesRef.current);
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

    const note = useCallback((text: string) => setStatus({ text }), []);

    const solved = useCallback(
        (text = "Le monde s'éclaire à nouveau.") => {
            play("complete");
            setStatus({ text, tone: "success" });
            if (!me) return;

            const playedAt = new Date();
            const win = {
                petals: petalsFor({ mistakes: mistakesRef.current, hintsUsed: hintsRef.current }),
                durationMs: Math.min(playedAt.getTime() - startedAt.current, 6 * 60 * 60 * 1000),
                hintsUsed: hintsRef.current,
                playedAt,
            };
            // Calculé avant l'ajout à la file : « avant » cette victoire.
            setCompletion(localCompletion(detail, playerRef.current, win));

            const resultId = crypto.randomUUID();
            unsubscribe.current?.();
            unsubscribe.current = onResultSynced(resultId, (server) =>
                setCompletion((current) => current && { ...current, milestones: server.milestones }),
            );
            outbox.add({
                resultId,
                levelId: detail.id,
                userId: me.id,
                playedAt: playedAt.toISOString(),
                durationMs: win.durationMs,
                mistakes: mistakesRef.current,
                hintsUsed: hintsRef.current,
                attempts: attempts.current,
            });
        },
        [play, me, detail],
    );

    const restart = () => {
        startedAt.current = Date.now();
        mistakesRef.current = 0;
        attempts.current = [];
        setRound((n) => n + 1);
        setMistakes(0);
        setAdvances(0);
        setStatus(null);
        setCompletion(null);
    };

    return {
        round,
        mistakes,
        advances,
        status,
        completion,
        startedAt: startedAt.current,
        hints: detail.hints.slice(0, hintsShown),
        hintsRemaining: detail.hints.length - hintsShown,
        revealHint: () => {
            if (hintsRef.current >= detail.hints.length) return;
            play("hint");
            hintsRef.current += 1;
            setHintsShown(hintsRef.current);
        },
        report: {
            mistake,
            progress,
            solved,
            select: () => play("select"),
            /** Avancée silencieuse (ex. une pièce de plus éclairée). */
            advance: () => setAdvances((n) => n + 1),
            /** Message neutre (consigne, invitation à réessayer). */
            note,
            /** Liens : chaque coup, pour les statistiques de conception. */
            attempt: (cells: number[], correct: boolean) => {
                attempts.current.push({ cells, correct });
            },
        },
        restart,
        dismissCompletion: () => setCompletion(null),
    };
}

export type PuzzleReport = ReturnType<typeof useLocalPuzzle>["report"];
