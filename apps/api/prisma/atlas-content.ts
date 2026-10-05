import { generatePuzzle, type LevelInput, type LocalMechanic } from "@aether/shared";

/**
 * Contenu procédural partagé par le seed (installation neuve) et par le script qui écrit les
 * migrations de contenu (bases existantes) : une même graine donne le même plateau partout.
 */
export type SeedLevel = Omit<LevelInput, "worldId" | "published">;

/**
 * Énigme d'une mécanique jouée sur l'appareil, générée depuis une graine fixe : le contenu est
 * identique à chaque installation, et la difficulté monte régulièrement dans le monde.
 */
export function generated(mechanic: LocalMechanic, seed: string, difficulty: number, text: { title: string; description: string; hints: string[] }): SeedLevel {
    return {
        ...text,
        mechanic,
        puzzle: generatePuzzle(mechanic, seed, difficulty),
        kind: "PAIRS",
        symbols: [],
        columns: 4,
        groups: [],
    };
}

export const MEMORY_HINTS = ["Associe chaque symbole à sa rangée, puis à sa colonne.", "Raconte-toi une petite histoire qui relie les symboles dans l'ordre."];
export const GEARS_HINTS = ["Pars de la source : chaque conduit doit mener quelque part.", "Les coins et les bords ne laissent que peu d'orientations possibles."];
export const FLOW_HINTS = ["Commence par les tracés dont les étoiles sont proches.", "Le long des bords, il n'y a souvent qu'un seul chemin possible."];
export const ECHOES_HINTS = ["Compare chaque point de départ à ce qu'il devient.", "Une seule transformation explique tous les exemples à la fois."];

/** Le Sommet des Sages réunit les facultés : ces énigmes s'intercalent entre ses Échos. */
export const SUMMIT_LEVELS: SeedLevel[] = [
    generated("MEMORY", "sommet-memoire", 9, {
        title: "La mémoire des sages",
        description: "Tout ce que l'esprit a appris à retenir, réuni sur une seule étagère.",
        hints: MEMORY_HINTS,
    }),
    generated("GEARS", "sommet-rouages", 9, {
        title: "Le mécanisme ancien",
        description: "La plus vieille machine de l'Atlas attend que sa lumière revienne.",
        hints: GEARS_HINTS,
    }),
    generated("FLOW", "sommet-flux", 9, {
        title: "Les chemins du ciel",
        description: "Vu d'en haut, le ciel entier est une carte à relier.",
        hints: FLOW_HINTS,
    }),
];
