/**
 * Contrat de l'API : formes exactes des réponses échangées entre `apps/api` et `apps/web`.
 * Les dates sont sérialisées en chaînes ISO 8601.
 */

export type Role = "PLAYER" | "ADMIN";

/**
 * Genre d'énigme :
 *   PAIRS     relier des paires (2 cases, ordre indifférent)
 *   GROUPS    réunir des groupes de 3 ou 4 cases (ordre indifférent)
 *   SEQUENCE  suivre des chemins de 3 à 5 cases, dans l'ordre
 */
export type LevelKind = "PAIRS" | "GROUPS" | "SEQUENCE";

/** Indices de cases (dans `symbols`) qui forment ensemble un lien. Pour une suite, l'ordre compte. */
export type Group = number[];

import type { LocalPuzzle, Mechanic } from "./mechanics";
import type { MilestoneFacts, MilestoneValue } from "./rules/milestones";

/** Palette du jardin d'un monde. */
export type WorldTheme = "origines" | "foret" | "ocean" | "cosmos";

export interface Me {
    id: string;
    displayName: string;
    email: string | null;
    /** Adresse confirmée par le lien reçu par e-mail. */
    emailVerified: boolean;
    role: Role;
    /** Joueur anonyme : sa progression est sauvegardée sur cet appareil jusqu'à la création d'un compte. */
    isGuest: boolean;
}

// ─── Mondes et niveaux ──────────────────────────────────────────────────────

export type LevelStatus = "locked" | "available" | "completed";

export interface GardenState {
    stage: number;
    completedLevels: number;
    totalLevels: number;
}

export interface WorldSummary {
    id: string;
    slug: string;
    /** Position 1-based dans le parcours publié. */
    position: number;
    title: string;
    tagline: string;
    theme: WorldTheme;
    status: LevelStatus;
    /** Pétales d'harmonie cueillis dans ce monde, sur `maxHarmony`. */
    harmony: number;
    maxHarmony: number;
    garden: GardenState;
}

export interface LevelSummary {
    id: string;
    /** Position 1-based dans son monde. */
    position: number;
    title: string;
    mechanic: Mechanic;
    /** Genre de Liens (ignoré pour les autres mécaniques). */
    kind: LevelKind;
    groupCount: number;
    status: LevelStatus;
    /** Pétales cueillis (masque `PETALS`), 0 si l'énigme n'est pas encore résolue. */
    petals: number;
    bestTimeMs: number | null;
}

export interface WorldDetail extends WorldSummary {
    description: string;
    levels: LevelSummary[];
    /** Première énigme ouverte et non résolue du monde. */
    nextLevelId: string | null;
}

export interface WorldRef {
    slug: string;
    title: string;
    theme: WorldTheme;
}

/**
 * Énigme prête à jouer sur l'appareil, réponses comprises : sans classement, il n'y a rien à
 * protéger, et c'est ce qui permet de jouer hors ligne.
 */
export interface LevelDetail {
    id: string;
    world: WorldRef;
    /** Position dans le monde (0 pour un brouillon vu par un administrateur). */
    position: number;
    total: number;
    title: string;
    description: string;
    symbols: string[];
    columns: number;
    mechanic: Mechanic;
    /** Plateau des mécaniques Mémoires, Rouages, Flux et Échos (solution comprise) ; `null` pour les Liens. */
    puzzle: LocalPuzzle | null;
    /** Indices, révélés un par un à la demande. */
    hints: string[];
    kind: LevelKind;
    /** Liens à trouver (vide pour les autres mécaniques). */
    groups: Group[];
    /** Nombre de cases à choisir pour former un lien. */
    groupSize: number;
    groupCount: number;
    previousLevelId: string | null;
    nextLevelId: string | null;
    /** Énigme du jour (hors parcours). */
    isDaily: boolean;
}

// ─── Partie ──────────────────────────────────────────────────────────────────

export interface CompletionResult {
    /** Pétales cueillis par cette partie (masque `PETALS`). */
    petals: number;
    /** Pétales de l'énigme, toutes parties confondues. */
    levelPetals: number;
    /** Pétales cueillis pour la première fois par cette partie. */
    newPetals: number;
    durationMs: number;
    hintsUsed: number;
    /** Meilleur temps (affiché seulement si le joueur a choisi de voir le temps). */
    bestTimeMs: number;
    /** Énigme suivante dans le même monde. */
    nextLevelId: string | null;
    /** Ce monde vient d'être (ou est) entièrement restauré. */
    worldCompleted: boolean;
    /** Monde suivant, s'il existe et qu'il est désormais ouvert. */
    nextWorld: WorldRef | null;
    /** Tous les mondes publiés sont restaurés. */
    gameCompleted: boolean;
    /** Jardin du monde de l'énigme. */
    garden: GardenState;
    /** Renseigné quand l'énigme résolue est celle du jour. */
    daily: DailyOutcome | null;
    /** Repères atteints grâce à cette partie. */
    milestones: MilestoneState[];
}

// ─── Énigme du jour ─────────────────────────────────────────────────────────

export interface StreakSummary {
    current: number;
    best: number;
    playedToday: boolean;
}

export interface DailyOutcome {
    date: string;
    /** Première victoire du jour : c'est elle qui compte pour la série. */
    firstToday: boolean;
    streak: StreakSummary;
    share: string;
}

export interface DailyState {
    /** Jour « AAAA-MM-JJ » dans le fuseau du jeu. */
    date: string;
    level: { id: string; title: string; mechanic: Mechanic; kind: LevelKind; groupCount: number };
    result: { petals: number; durationMs: number; hintsUsed: number } | null;
    streak: StreakSummary;
    share: string | null;
    /** Joueurs ayant déjà résolu l'énigme du jour. */
    solvedToday: number;
    timeZone: string;
}

// ─── Progression & statistiques ─────────────────────────────────────────────

export interface ProgressSummary {
    worlds: WorldSummary[];
    harmony: number;
    maxHarmony: number;
    completedLevels: number;
    totalLevels: number;
    /** Où reprendre : premier monde ouvert non terminé et son énigme suivante. */
    resume: { world: WorldRef; levelId: string | null } | null;
}

export interface LevelStats {
    levelId: string;
    worldTitle: string;
    position: number;
    title: string;
    /** Pétales cueillis (masque `PETALS`), 0 si l'énigme n'est pas encore résolue. */
    petals: number;
    bestTimeMs: number | null;
    completions: number;
    sessions: number;
    hintsUsed: number;
}

export interface PlayerStats {
    levels: LevelStats[];
    totals: {
        sessions: number;
        completions: number;
        hintsUsed: number;
        harmony: number;
        /** Somme des durées des parties terminées. */
        playTimeMs: number;
    };
}

/** Un repère personnel : on ne se mesure qu'à son propre chemin. */
export interface MilestoneState {
    key: string;
    value: MilestoneValue;
    title: string;
    description: string;
    current: number;
    target: number;
    /** Date à laquelle le repère a été atteint, `null` s'il reste à venir. */
    reachedAt: string | null;
}

export interface MilestonesView {
    milestones: MilestoneState[];
    facts: MilestoneFacts;
    /** Série de l'énigme du jour en cours. */
    currentStreak: number;
}

// ─── Contenu embarqué et synchronisation ────────────────────────────────────

/** Énigme telle que l'appareil la garde pour jouer hors ligne. */
export interface ContentLevel {
    id: string;
    title: string;
    description: string;
    mechanic: Mechanic;
    kind: LevelKind;
    symbols: string[];
    columns: number;
    groups: Group[];
    puzzle: LocalPuzzle | null;
    hints: string[];
}

export interface ContentWorld {
    id: string;
    slug: string;
    title: string;
    tagline: string;
    description: string;
    theme: WorldTheme;
    /** Énigmes publiées, dans l'ordre. */
    levels: ContentLevel[];
}

export interface DailyEntry {
    /** Jour « AAAA-MM-JJ » dans le fuseau du jeu. */
    date: string;
    world: WorldRef;
    level: ContentLevel;
}

/**
 * Tout le contenu publié, téléchargé une fois et gardé sur l'appareil : le parcours se calcule
 * ensuite localement, avec les mêmes règles que le serveur.
 */
export interface ContentBundle {
    /** Change dès qu'un monde ou une énigme publiés changent. */
    version: string;
    worlds: ContentWorld[];
    daily: {
        timeZone: string;
        /** Énigmes du jour déjà tirées : aujourd'hui et les jours suivants (jouables hors ligne). */
        days: DailyEntry[];
    };
}

/** Ce que le joueur a accompli sur une énigme. */
export interface LevelRecord {
    petals: number;
    bestTimeMs: number;
}

export interface DailyRecord {
    date: string;
    petals: number;
    durationMs: number;
    hintsUsed: number;
}

/** Progression du joueur, telle que le serveur la connaît (sans les victoires encore en attente). */
export interface SyncState {
    levels: Record<string, LevelRecord>;
    daily: DailyRecord[];
}

// ─── Administration ─────────────────────────────────────────────────────────

export interface AdminWorld {
    id: string;
    slug: string;
    order: number;
    title: string;
    tagline: string;
    description: string;
    theme: WorldTheme;
    published: boolean;
    isDaily: boolean;
    levelCount: number;
}

export interface AdminLevel {
    id: string;
    worldId: string;
    order: number;
    title: string;
    description: string;
    hints: string[];
    symbols: string[];
    columns: number;
    mechanic: Mechanic;
    puzzle: LocalPuzzle | null;
    kind: LevelKind;
    groups: Group[];
    published: boolean;
    createdAt: string;
    updatedAt: string;
}

/** Mauvaise réponse souvent proposée : révèle une ambiguïté possible de l'énigme. */
export interface FalseLead {
    /** Cases choisies (triées, sauf pour une suite où l'ordre compte). */
    cells: number[];
    symbols: string[];
    /** Nombre de fois où cette combinaison a été tentée. */
    count: number;
    /** Nombre de parties distinctes où elle l'a été. */
    sessions: number;
}

/** Statistiques de conception d'une énigme (parties des administrateurs exclues). */
export interface LevelDesignStats {
    /** Premier coup enregistré, ou `null` si personne n'a encore joué. */
    since: string | null;
    players: number;
    sessions: number;
    completions: number;
    /** Part des parties menées à leur terme (0–1). */
    completionRate: number | null;
    medianDurationMs: number | null;
    /** Moyenne sur les parties terminées. */
    averageMistakes: number | null;
    averageHints: number | null;
    /** Répartition de l'harmonie (nombre de pétales) des parties terminées. */
    harmony: { petals: number; count: number }[];
    /** Pour chaque indice (1, 2…), nombre de parties qui l'ont révélé. */
    hints: { hint: number; sessions: number }[];
    attempts: number;
    falseLeads: FalseLead[];
}

// ─── Erreurs ────────────────────────────────────────────────────────────────

export interface ApiErrorBody {
    statusCode: number;
    message: string | string[];
    error?: string;
    requestId?: string;
    /** Erreurs de validation, avec le chemin du champ concerné (ex. `["groups", 0, 1]`). */
    issues?: { path: (string | number)[]; message: string }[];
}
