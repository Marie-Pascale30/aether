/**
 * @typedef {Object} Level
 * @property {string}   title
 * @property {string}   description
 * @property {string}   hint
 * @property {string[]} symbols  Symboles affichés sur le plateau.
 * @property {[number, number][]} pairs  Paires d'indices (dans `symbols`) à relier.
 *
 * Règle de conception : chaque paire doit être la SEULE réponse défendable d'après l'indice.
 * Éviter les leurres qui satisfont aussi l'indice (ex. deux symboles de vague, deux étoiles…).
 */

/** @type {Level[]} */
export const LEVELS = [
    {
        title: "Le premier lien",
        description: "Deux formes appartiennent à la même famille.",
        hint: "Relie les deux symboles identiques.",
        symbols: ["○", "✦", "△", "○", "□", "◇", "☾", "✧"],
        pairs: [[0, 3]],
    },
    {
        title: "L'ombre et la lumière",
        description: "Cherche ce qui forme un contraste naturel.",
        hint: "Le cercle sombre répond au cercle clair.",
        symbols: ["☀", "○", "●", "☾", "△", "◇", "✦", "□"],
        pairs: [[1, 2]],
    },
    {
        title: "La graine",
        description: "Une forme annonce une autre forme.",
        hint: "Trouve le symbole qui représente la croissance.",
        symbols: ["🌱", "🌳", "☁", "💧", "🔥", "🪨", "🌙", "⭐"],
        pairs: [[0, 1]],
    },
    {
        title: "Le ciel",
        description: "Deux éléments racontent le même mouvement.",
        hint: "Le croissant et la marée se répondent.",
        symbols: ["☾", "☁", "☀", "✦", "◇", "≈", "○", "△"],
        pairs: [[0, 5]],
    },
    {
        title: "La mémoire",
        description: "Un motif s'est déplacé.",
        hint: "Retrouve la forme apparue deux fois.",
        symbols: ["✧", "◇", "✦", "◇", "○", "△", "□", "☾"],
        pairs: [[1, 3]],
    },
    {
        title: "Les saisons",
        description: "Tout cycle possède un commencement et un retour.",
        hint: "Associe les deux symboles végétaux.",
        symbols: ["❄", "🌱", "☀", "🌈", "🌿", "🌧", "🌙", "🔥"],
        pairs: [[1, 4]],
    },
    {
        title: "L'écho",
        description: "Une forme répond à sa propre trace.",
        hint: "Même géométrie, orientation différente.",
        symbols: ["△", "▽", "○", "□", "◇", "✦", "✧", "☾"],
        pairs: [[0, 1]],
    },
    {
        title: "La constellation",
        description: "Les points dessinent une idée.",
        hint: "Associe les deux étoiles jumelles.",
        symbols: ["✦", "○", "☁", "◇", "✦", "△", "□", "☾"],
        pairs: [[0, 4]],
    },
    {
        title: "Le passage",
        description: "Deux éléments partagent le même rôle.",
        hint: "Deux signes indiquent un chemin à suivre.",
        symbols: ["◉", "⌂", "➜", "◇", "↗", "○", "△", "□"],
        pairs: [[2, 4]],
    },
    {
        title: "Le grand lien",
        description: "Dernière étape : observe avant d'agir.",
        hint: "Deux liens cette fois : l'un sur la terre, l'autre dans le ciel.",
        symbols: ["🌳", "☀", "△", "✦", "□", "🌿", "◇", "○"],
        pairs: [[0, 5], [1, 3]],
    },
];
