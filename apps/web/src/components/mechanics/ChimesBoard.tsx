"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { chimesPhrase, chimesPlay, chimesStart, type ChimesPuzzle, type ChimesState } from "@aether/shared";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/glyphs/Glyph";
import type { PuzzleReport } from "@/hooks/useLocalPuzzle";
import { useSound } from "@/lib/sound/SoundProvider";
import { FLOW_STYLES } from "./FlowBoard";
import styles from "./mechanics.module.css";

/** Écart entre deux notes de la phrase entendue, et durée de l'illumination d'une cloche. */
const NOTE_MS = 650;
const LIGHT_MS = 420;

/**
 * Carillon : on écoute la phrase (chaque cloche s'illumine en sonnant), puis on la rejoue. Sans le
 * son, les illuminations, les couleurs et les symboles suffisent à suivre la phrase.
 */
export function ChimesBoard({ puzzle, report }: { puzzle: ChimesPuzzle; report: PuzzleReport }) {
    const { chime } = useSound();
    const [state, setState] = useState<ChimesState>(() => chimesStart(puzzle));
    const [listening, setListening] = useState(true);
    const [lit, setLit] = useState<number | null>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };
    useEffect(() => clearTimers, []);

    const ring = useCallback(
        (bell: number) => {
            chime(bell);
            setLit(bell);
            timers.current.push(setTimeout(() => setLit((current) => (current === bell ? null : current)), LIGHT_MS));
        },
        [chime],
    );

    /** Fait entendre la phrase en cours, puis rend la main au joueur. */
    const listen = useCallback(
        (current: ChimesState, delay = 500) => {
            clearTimers();
            setListening(true);
            const phrase = chimesPhrase(puzzle, current);
            phrase.forEach((bell, i) => timers.current.push(setTimeout(() => ring(bell), delay + i * NOTE_MS)));
            timers.current.push(setTimeout(() => setListening(false), delay + phrase.length * NOTE_MS));
        },
        [puzzle, ring],
    );

    // La première écoute commence d'elle-même (le plateau est remonté à chaque « Recommencer »).
    const started = useRef(false);
    useEffect(() => {
        if (started.current) return;
        started.current = true;
        listen(state, 700);
    }, [listen, state]);

    const play = (bell: number) => {
        if (listening || state.done) return;
        ring(bell);
        const { outcome, state: next } = chimesPlay(puzzle, state, bell);
        setState(next);
        if (outcome === "mistake") {
            report.mistake("Pas tout à fait : écoute encore la phrase.");
            listen(next, 900);
        } else if (outcome === "phrase") {
            report.progress(`Juste. La phrase grandit : ${next.reach} notes.`);
            listen(next, 900);
        } else if (outcome === "solved") {
            report.solved("Le carillon chante à nouveau.");
        } else {
            report.select();
        }
    };

    const step = puzzle.mode === "progressive" ? `Phrase de ${state.reach} note${state.reach > 1 ? "s" : ""} sur ${puzzle.sequence.length}` : `${puzzle.sequence.length} notes à rejouer`;

    return (
        <div className={styles.stack}>
            <p className={styles.prompt} aria-live="polite">
                {state.done ? "La mélodie est complète." : listening ? "Écoute…" : `À toi : ${state.played} / ${state.reach}`}
                <br />
                <small>{step}</small>
            </p>
            <div className={styles.chimes} style={{ "--bells": puzzle.bells } as CSSProperties}>
                {Array.from({ length: puzzle.bells }, (_, bell) => {
                    const look = FLOW_STYLES[bell % FLOW_STYLES.length]!;
                    // Arc doux : les cloches du milieu sont un peu plus hautes.
                    const lift = Math.sin((Math.PI * (bell + 0.5)) / puzzle.bells) * 18;
                    return (
                        <button
                            key={bell}
                            type="button"
                            className={styles.bell}
                            data-lit={lit === bell || undefined}
                            style={{ "--bell": look.color, "--lift": `${-lift}px` } as CSSProperties}
                            aria-label={`Cloche ${bell + 1} (${look.name})`}
                            aria-disabled={listening || state.done || undefined}
                            onClick={() => play(bell)}
                        >
                            <Glyph symbol={look.glyph} />
                        </button>
                    );
                })}
            </div>
            {!state.done && (
                <div className={styles.actions}>
                    <Button variant="ghost" onClick={() => listen(state, 200)} disabled={listening}>
                        ↻ Réécouter
                    </Button>
                </div>
            )}
            <p className={styles.help}>Chaque cloche a sa couleur et son symbole : la phrase se suit aussi sans le son.</p>
        </div>
    );
}
