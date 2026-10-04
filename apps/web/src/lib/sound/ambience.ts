import type { WorldTheme } from "@aether/shared";

export type Instrument = "piano" | "harp";

/** Recette sonore d'une région : un instrument qui joue quelques notes, et la nature autour. */
export interface AmbienceRecipe {
    instrument: Instrument;
    /** Notes possibles (Hz), dans une gamme pentatonique : aucune ne détonne avec une autre. */
    scale: number[];
    /** Silence entre deux phrases, en secondes (minimum, maximum). */
    pause: [number, number];
    /** Niveau de chaque bruit de nature, de 0 (absent) à 1. */
    wind: number;
    water: number;
    birds: number;
}

// Gammes pentatoniques (Hz), du grave à l'aigu.
const C_MAJOR = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const A_MINOR = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
const D_PENTA = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25];
const G_MAJOR = [196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88];
const E_HIGH = [329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0];

export const AMBIENCES: Record<WorldTheme, AmbienceRecipe> = {
    jardin: { instrument: "piano", scale: C_MAJOR, pause: [3, 7], wind: 0.15, water: 0.6, birds: 0.7 },
    bibliotheque: { instrument: "piano", scale: A_MINOR, pause: [4, 9], wind: 0.3, water: 0, birds: 0 },
    atelier: { instrument: "harp", scale: D_PENTA, pause: [3, 7], wind: 0.15, water: 0, birds: 0.1 },
    observatoire: { instrument: "harp", scale: E_HIGH, pause: [5, 10], wind: 0.45, water: 0, birds: 0 },
    conservatoire: { instrument: "piano", scale: G_MAJOR, pause: [2.5, 6], wind: 0.1, water: 0, birds: 0.25 },
    foret: { instrument: "harp", scale: C_MAJOR, pause: [6, 12], wind: 0.4, water: 0.35, birds: 1 },
    sommet: { instrument: "harp", scale: A_MINOR, pause: [6, 12], wind: 0.85, water: 0, birds: 0.1 },
};
