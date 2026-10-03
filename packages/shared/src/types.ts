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

/** Palette du jardin d'un monde. */
export type WorldTheme = "origines" | "foret" | "ocean" | "cosmos";

export interface Me {
    id: string;
    displayName: string;
    email: string | null;
    /** Adresse confirmée par le lien reçu par e-mail. */
    emailVerified: boolean;
    role: Role;
    /** Joueur anonyme : sa progression est sauvegardée, mais il n'apparaît pas au classement. */
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
    stars: number;
    maxStars: number;
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
    bestStars: number | null;
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

/** Énigme telle que vue par le joueur : les groupes (les réponses) n'y figurent jamais. */
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
    /**
     * Plateau complet des mécaniques jouées sur l'appareil (Mémoires, Rouages, Flux, Échos),
     * solution comprise ; `null` pour les Liens, validés par le serveur.
     */
    puzzle: LocalPuzzle | null;
    /** Indices des mécaniques jouées sur l'appareil ; vide pour les Liens (révélés par le serveur). */
    hints: string[];
    kind: LevelKind;
    /** Nombre de cases à choisir pour former un lien. */
    groupSize: number;
    groupCount: number;
    hintCount: number;
    previousLevelId: string | null;
    nextLevelId: string | null;
    /** Énigme du jour (hors parcours). */
    isDaily: boolean;
}

// ─── Partie ──────────────────────────────────────────────────────────────────

export interface SessionState {
    sessionId: string;
    levelId: string;
    startedAt: string;
    foundGroups: Group[];
    mistakes: number;
    /** Indices déjà révélés, dans l'ordre. */
    hints: string[];
    hintCount: number;
    completed: boolean;
}

export interface CompletionResult {
    stars: number;
    durationMs: number;
    mistakes: number;
    hintsUsed: number;
    isNewBest: boolean;
    bestStars: number;
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
    level: { id: string; title: string; kind: LevelKind; groupCount: number };
    result: { stars: number; durationMs: number; mistakes: number; hintsUsed: number } | null;
    streak: StreakSummary;
    share: string | null;
    /** Joueurs ayant déjà résolu l'énigme du jour. */
    solvedToday: number;
    timeZone: string;
}

export interface AttemptResult {
    result: "match" | "mismatch";
    cells: number[];
    foundGroups: Group[];
    remaining: number;
    mistakes: number;
    completion: CompletionResult | null;
}

export interface HintResult {
    hint: string;
    hints: string[];
    hintsRemaining: number;
}

// ─── Progression & statistiques ─────────────────────────────────────────────

export interface ProgressSummary {
    worlds: WorldSummary[];
    totalStars: number;
    maxStars: number;
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
    bestStars: number | null;
    bestTimeMs: number | null;
    completions: number;
    sessions: number;
    mistakes: number;
    hintsUsed: number;
}

export interface PlayerStats {
    levels: LevelStats[];
    totals: {
        sessions: number;
        completions: number;
        mistakes: number;
        hintsUsed: number;
        totalStars: number;
        /** Somme des durées des parties terminées. */
        playTimeMs: number;
    };
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    totalStars: number;
    completedLevels: number;
    /** Somme des meilleurs temps, départage à égalité d'étoiles. */
    totalTimeMs: number;
}

export interface Leaderboard {
    entries: LeaderboardEntry[];
    /** Rang du joueur connecté, même s'il est hors du top affiché. */
    me: LeaderboardEntry | null;
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
    /** Répartition des étoiles des parties terminées. */
    stars: { stars: number; count: number }[];
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
