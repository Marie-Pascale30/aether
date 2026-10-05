import type { WorldTheme } from "@aether/shared";

/** Faculté de l'esprit qu'exerce une région, et ce qui la caractérise à l'écran. */
export interface Region {
    /** Nom de la région dans l'Atlas. */
    name: string;
    faculty: string;
    glyph: string;
    /** Couleur d'accent (cartes, carte de l'Atlas). */
    accent: string;
}

export const REGIONS: Record<WorldTheme, Region> = {
    jardin: { name: "Jardin des Échos", faculty: "Observation", glyph: "❀", accent: "#a6c39a" },
    bibliotheque: { name: "Bibliothèque Vivante", faculty: "Mémoire", glyph: "❖", accent: "#c9a37a" },
    atelier: { name: "Atelier des Inventeurs", faculty: "Logique", glyph: "⚙", accent: "#d39a6a" },
    observatoire: { name: "Observatoire", faculty: "Vision spatiale", glyph: "✦", accent: "#9fb3e0" },
    conservatoire: { name: "Conservatoire", faculty: "Rythme", glyph: "♪", accent: "#ddd6c4" },
    foret: { name: "Forêt des Connexions", faculty: "Associations", glyph: "❦", accent: "#8fbf8a" },
    sommet: { name: "Sommet des Sages", faculty: "Toutes les facultés", glyph: "▲", accent: "#cfae5f" },
};

export const THEME_LABELS: Record<WorldTheme, string> = Object.fromEntries(
    Object.entries(REGIONS).map(([theme, region]) => [theme, `${region.name} (${region.faculty.toLowerCase()})`]),
) as Record<WorldTheme, string>;
