import { createRng } from "../rng";
import type { MechanicIssue } from "./issues";

/**
 * CARILLON — écouter une phrase de cloches, puis la rejouer. Chaque cloche a aussi sa couleur et
 * son symbole, et s'illumine quand elle sonne : on peut jouer sans le son.
 *   repeat       on entend toute la phrase, puis on la rejoue en entier ;
 *   progressive  la phrase grandit d'une note à chaque étape (on rejoue chaque fois depuis le début).
 */
export interface ChimesPuzzle {
    /** Nombre de cloches (de la plus grave à la plus aiguë). */
    bells: number;
    /** Cloches à rejouer, dans l'ordre. */
    sequence: number[];
    mode: "repeat" | "progressive";
}

export const CHIMES_LIMITS = { bellsMin: 3, bellsMax: 7, lengthMin: 2, lengthMax: 14 } as const;

export function validateChimes(p: ChimesPuzzle): MechanicIssue[] {
    const issues: MechanicIssue[] = [];
    if (p.bells < CHIMES_LIMITS.bellsMin || p.bells > CHIMES_LIMITS.bellsMax) {
        issues.push({ path: ["bells"], message: `Entre ${CHIMES_LIMITS.bellsMin} et ${CHIMES_LIMITS.bellsMax} cloches.` });
    }
    if (p.sequence.length < CHIMES_LIMITS.lengthMin || p.sequence.length > CHIMES_LIMITS.lengthMax) {
        issues.push({ path: ["sequence"], message: `Une phrase de ${CHIMES_LIMITS.lengthMin} à ${CHIMES_LIMITS.lengthMax} notes.` });
    }
    p.sequence.forEach((bell, i) => {
        if (bell >= p.bells) issues.push({ path: ["sequence", i], message: `La note ${i + 1} désigne une cloche qui n'existe pas.` });
    });
    return issues;
}

export interface ChimesState {
    /** Longueur de la phrase à rejouer maintenant (toute la phrase en mode « repeat »). */
    reach: number;
    /** Notes déjà rejouées dans la phrase en cours. */
    played: number;
    mistakes: number;
    done: boolean;
}

export const chimesStart = (p: ChimesPuzzle): ChimesState => ({
    reach: p.mode === "progressive" ? 1 : p.sequence.length,
    played: 0,
    mistakes: 0,
    done: false,
});

/** Phrase à faire entendre maintenant. */
export const chimesPhrase = (p: ChimesPuzzle, state: ChimesState) => p.sequence.slice(0, state.reach);

export type ChimesOutcome = "note" | "phrase" | "solved" | "mistake";

/**
 * Le joueur sonne une cloche. Une erreur reprend la phrase en cours depuis le début (sans rien
 * perdre de ce qui était acquis) ; une phrase complète fait grandir la suivante, ou résout l'énigme.
 */
export function chimesPlay(p: ChimesPuzzle, state: ChimesState, bell: number): { outcome: ChimesOutcome; state: ChimesState } {
    if (state.done) return { outcome: "solved", state };
    if (p.sequence[state.played] !== bell) {
        return { outcome: "mistake", state: { ...state, played: 0, mistakes: state.mistakes + 1 } };
    }
    const played = state.played + 1;
    if (played < state.reach) return { outcome: "note", state: { ...state, played } };
    if (state.reach >= p.sequence.length) return { outcome: "solved", state: { ...state, played, done: true } };
    return { outcome: "phrase", state: { ...state, reach: state.reach + 1, played: 0 } };
}

export function generateChimes(seed: number | string, difficulty: number): ChimesPuzzle {
    const rng = createRng(`chimes:${seed}`);
    const d = Math.max(1, Math.min(10, Math.round(difficulty)));
    const bells = Math.min(CHIMES_LIMITS.bellsMax, 3 + Math.floor(d / 3));
    const length = Math.min(CHIMES_LIMITS.lengthMax, d <= 3 ? 2 + d : 3 + d);
    // Une phrase chantante : pas trois fois la même cloche d'affilée.
    const sequence: number[] = [];
    while (sequence.length < length) {
        const bell = rng.int(0, bells - 1);
        if (sequence.length >= 2 && sequence.at(-1) === bell && sequence.at(-2) === bell) continue;
        sequence.push(bell);
    }
    return { bells, sequence, mode: d >= 4 ? "progressive" : "repeat" };
}
