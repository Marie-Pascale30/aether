import type { LevelKind } from "@aether/shared";

interface KindCopy {
    /** Nom court affiché sur les cartes et dans l'éditeur. */
    label: string;
    /** Nom d'un lien de ce genre, au singulier et au pluriel. */
    noun: [string, string];
    /** Consigne affichée sous le plateau avant la première sélection. */
    instruction: (size: number) => string;
    /** Message quand un lien est trouvé et qu'il en reste. */
    found: (remaining: number) => string;
    /** Glyphe d'illustration du genre. */
    glyph: string;
}

/** « Il reste 2 échos. » / « Il reste un écho. » (noms masculins uniquement). */
const remainingText = (remaining: number, [one, many]: [string, string]) =>
    remaining > 1 ? `Il reste ${remaining} ${many}.` : `Il reste un ${one}.`;

export const KIND_COPY: Record<LevelKind, KindCopy> = {
    PAIRS: {
        label: "Paires",
        noun: ["écho", "échos"],
        instruction: () => "Choisis deux éléments qui vont ensemble.",
        found: (remaining) => `Connexion trouvée. ${remainingText(remaining, ["écho", "échos"])}`,
        glyph: "◇◇",
    },
    GROUPS: {
        label: "Familles",
        noun: ["famille", "familles"],
        instruction: (size) => `Réunis les ${size} éléments d'une même famille.`,
        found: (remaining) => `Famille réunie. ${remaining > 1 ? `Il en reste ${remaining}.` : "Il en reste une."}`,
        glyph: "△",
    },
    SEQUENCE: {
        label: "Suites",
        noun: ["chemin", "chemins"],
        instruction: (size) => `Relie ${size} éléments dans le bon ordre, du premier au dernier.`,
        found: (remaining) => `Chemin tracé. ${remainingText(remaining, ["chemin", "chemins"])}`,
        glyph: "→",
    },
};

export const countLabel = (kind: LevelKind, count: number) => {
    const [one, many] = KIND_COPY[kind].noun;
    return `${count} ${count > 1 ? many : one}`;
};
