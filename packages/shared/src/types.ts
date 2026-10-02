/**
 * Contrat de l'API : formes exactes des réponses échangées entre `apps/api` et `apps/web`.
 * Les dates sont sérialisées en chaînes ISO 8601.
 */

export type Role = "PLAYER" | "ADMIN";

/** Deux indices de cases (dans `symbols`) qui forment un lien. */
export type Pair = [number, number];

export interface Me {
    id: string;
    displayName: string;
    email: string | null;
    role: Role;
    /** Joueur anonyme : sa progression est sauvegardée, mais il n'apparaît pas au classement. */
    isGuest: boolean;
}

// ─── Niveaux ─────────────────────────────────────────────────────────────────

export type LevelStatus = "locked" | "available" | "completed";

export interface LevelSummary {
    id: string;
    /** Position 1-based dans le parcours publié. */
    position: number;
    title: string;
    pairCount: number;
    status: LevelStatus;
    bestStars: number | null;
    bestTimeMs: number | null;
}

/** Énigme telle que vue par le joueur : les paires (les réponses) n'y figurent jamais. */
export interface LevelDetail {
    id: string;
    position: number;
    total: number;
    title: string;
    description: string;
    symbols: string[];
    columns: number;
    pairCount: number;
    hintCount: number;
    previousLevelId: string | null;
    nextLevelId: string | null;
}

// ─── Partie ──────────────────────────────────────────────────────────────────

export interface SessionState {
    sessionId: string;
    levelId: string;
    startedAt: string;
    foundPairs: Pair[];
    mistakes: number;
    /** Indices déjà révélés, dans l'ordre. */
    hints: string[];
    hintCount: number;
    completed: boolean;
}

export interface GardenState {
    stage: number;
    completedLevels: number;
    totalLevels: number;
}

export interface CompletionResult {
    stars: number;
    durationMs: number;
    mistakes: number;
    hintsUsed: number;
    isNewBest: boolean;
    bestStars: number;
    bestTimeMs: number;
    nextLevelId: string | null;
    /** Toutes les énigmes publiées sont résolues. */
    gameCompleted: boolean;
    garden: GardenState;
}

export interface AttemptResult {
    result: "match" | "mismatch";
    pair: Pair;
    foundPairs: Pair[];
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
    garden: GardenState;
    totalStars: number;
    maxStars: number;
    /** Première énigme disponible non résolue (ou `null` si tout est résolu). */
    nextLevelId: string | null;
}

export interface LevelStats {
    levelId: string;
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

export interface AdminLevel {
    id: string;
    order: number;
    title: string;
    description: string;
    hints: string[];
    symbols: string[];
    columns: number;
    pairs: Pair[];
    published: boolean;
    createdAt: string;
    updatedAt: string;
}

// ─── Erreurs ────────────────────────────────────────────────────────────────

export interface ApiErrorBody {
    statusCode: number;
    message: string | string[];
    error?: string;
    /** Erreurs de validation, avec le chemin du champ concerné (ex. `["pairs", 0, 1]`). */
    issues?: { path: (string | number)[]; message: string }[];
}
