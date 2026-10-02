import { MAX_STARS_PER_LEVEL } from "../constants";
import { formatDuration } from "../format";
import type { StreakSummary } from "../types";

/** Date du jour « AAAA-MM-JJ » dans un fuseau donné (minuit local, pas minuit UTC). */
export function dateKey(date: Date, timeZone: string): string {
    // en-CA formate déjà en AAAA-MM-JJ.
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function previousDateKey(key: string): string {
    const date = new Date(`${key}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

/**
 * Série à partir des jours réussis (clés « AAAA-MM-JJ », dans n'importe quel ordre).
 * La série en cours compte jusqu'à aujourd'hui, ou jusqu'à hier si l'énigme du jour reste à faire.
 */
export function computeStreak(days: readonly string[], today: string): StreakSummary {
    const played = new Set(days);
    const playedToday = played.has(today);

    let current = 0;
    for (let cursor = playedToday ? today : previousDateKey(today); played.has(cursor); cursor = previousDateKey(cursor)) {
        current += 1;
    }

    let best = 0;
    let run = 0;
    let previous: string | null = null;
    for (const day of [...played].sort()) {
        run = previous !== null && previousDateKey(day) === previous ? run + 1 : 1;
        best = Math.max(best, run);
        previous = day;
    }

    return { current, best, playedToday };
}

export interface ShareInput {
    date: string;
    stars: number;
    durationMs: number;
    mistakes: number;
    hintsUsed: number;
    /** Coups dans l'ordre : true = juste. */
    pattern: readonly boolean[];
    streak: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Résumé à partager, sans rien révéler de la solution (façon Wordle). */
export function buildShareText({ date, stars, durationMs, mistakes, hintsUsed, pattern, streak }: ShareInput): string {
    const day = new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
    return [
        `AETHER · Énigme du jour · ${day}`,
        `${"★".repeat(stars)}${"☆".repeat(MAX_STARS_PER_LEVEL - stars)} · ${formatDuration(durationMs)} · ${plural(mistakes, "erreur")} · ${plural(hintsUsed, "indice")}`,
        pattern.map((correct) => (correct ? "🟩" : "🟥")).join(""),
        `Série : ${plural(streak, "jour")}`,
    ].join("\n");
}
