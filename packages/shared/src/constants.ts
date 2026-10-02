/** Durée (ms) pendant laquelle une mauvaise paire reste affichée avant d'être effacée. */
export const MISMATCH_FEEDBACK_MS = 650;

/** Nombre de stades visuels du jardin (0 = graine, dernier = jardin entièrement restauré). */
export const GARDEN_STAGE_COUNT = 6;

export const MAX_STARS_PER_LEVEL = 3;

/** Bornes d'une énigme, appliquées à l'identique par l'éditeur et par l'API. */
export const LEVEL_LIMITS = {
    titleMax: 80,
    descriptionMax: 300,
    hintsMin: 1,
    hintsMax: 5,
    hintMax: 200,
    symbolsMin: 4,
    symbolsMax: 16,
    symbolMax: 8,
    columnsMin: 2,
    columnsMax: 6,
} as const;

export const ACCOUNT_LIMITS = {
    displayNameMin: 2,
    displayNameMax: 24,
    passwordMin: 8,
    passwordMax: 128,
} as const;
