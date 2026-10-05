import { MECHANICS } from "../mechanics";

/** Les quatre valeurs d'AETHER : chaque repère en illustre une. */
export type MilestoneValue = "serenite" | "satisfaction" | "curiosite" | "progression";

export const MILESTONE_VALUES: Record<MilestoneValue, { label: string; glyph: string }> = {
    progression: { label: "Progression", glyph: "↟" },
    satisfaction: { label: "Satisfaction", glyph: "✿" },
    curiosite: { label: "Curiosité", glyph: "◎" },
    serenite: { label: "Sérénité", glyph: "☾" },
};

/** Ce que l'on sait du chemin d'un joueur ; jamais comparé à celui des autres. */
export interface MilestoneFacts {
    solvedLevels: number;
    restoredWorlds: number;
    /** Mécaniques différentes déjà résolues au moins une fois. */
    mechanicsExplored: number;
    autonomousLevels: number;
    clearLevels: number;
    fullHarmonyLevels: number;
    dailyDays: number;
    bestStreak: number;
    /** Jours différents où au moins une énigme a été résolue. */
    playDays: number;
}

export interface MilestoneDefinition {
    key: string;
    value: MilestoneValue;
    title: string;
    description: string;
    target: number;
    measure: (facts: MilestoneFacts) => number;
}

/** L'ordre est celui de l'affichage ; une clé ne change jamais (elle est enregistrée). */
export const MILESTONES: readonly MilestoneDefinition[] = [
    { key: "premiers-pas", value: "progression", title: "Premiers pas", description: "Résoudre une première énigme.", target: 1, measure: (f) => f.solvedLevels },
    { key: "premier-monde", value: "progression", title: "Un monde se souvient", description: "Restaurer un monde entier.", target: 1, measure: (f) => f.restoredWorlds },
    { key: "dix-enigmes", value: "progression", title: "Dix lumières", description: "Résoudre 10 énigmes.", target: 10, measure: (f) => f.solvedLevels },
    { key: "trois-mondes", value: "progression", title: "Cartographe", description: "Restaurer 3 mondes.", target: 3, measure: (f) => f.restoredWorlds },
    { key: "trente-enigmes", value: "progression", title: "Chemin parcouru", description: "Résoudre 30 énigmes.", target: 30, measure: (f) => f.solvedLevels },

    { key: "autonomie", value: "satisfaction", title: "Par soi-même", description: "Résoudre 5 énigmes sans indice.", target: 5, measure: (f) => f.autonomousLevels },
    { key: "clarte", value: "satisfaction", title: "Esprit clair", description: "Résoudre 5 énigmes sans fausse piste.", target: 5, measure: (f) => f.clearLevels },
    { key: "pleine-harmonie", value: "satisfaction", title: "Pleine harmonie", description: "Cueillir les trois pétales de 10 énigmes.", target: 10, measure: (f) => f.fullHarmonyLevels },

    { key: "explorateur", value: "curiosite", title: "Explorateur", description: "Résoudre 3 mécaniques différentes.", target: 3, measure: (f) => f.mechanicsExplored },
    { key: "toutes-mecaniques", value: "curiosite", title: "Esprit curieux", description: "Résoudre chaque mécanique au moins une fois.", target: MECHANICS.length, measure: (f) => f.mechanicsExplored },
    { key: "rendez-vous", value: "curiosite", title: "Rendez-vous", description: "Résoudre une énigme du jour.", target: 1, measure: (f) => f.dailyDays },

    { key: "retour", value: "serenite", title: "Retour au calme", description: "Revenir jouer 3 jours différents.", target: 3, measure: (f) => f.playDays },
    { key: "rituel", value: "serenite", title: "Petit rituel", description: "Résoudre l'énigme du jour 7 jours de suite.", target: 7, measure: (f) => f.bestStreak },
    { key: "compagnon", value: "serenite", title: "Compagnon de route", description: "Revenir jouer 20 jours différents.", target: 20, measure: (f) => f.playDays },
];

export interface MilestoneProgress {
    definition: MilestoneDefinition;
    /** Avancée plafonnée à la cible. */
    current: number;
    reached: boolean;
}

export function evaluateMilestones(facts: MilestoneFacts): MilestoneProgress[] {
    return MILESTONES.map((definition) => {
        const current = Math.min(definition.target, Math.max(0, definition.measure(facts)));
        return { definition, current, reached: current >= definition.target };
    });
}
