/**
 * Compteur d'essais par clé (une adresse e-mail) sur une fenêtre glissante, en mémoire.
 * Complète la limitation par IP : un attaquant qui change d'adresse IP reste limité sur
 * un même compte. Une seule instance de l'API tourne : la mémoire du processus suffit.
 */
export class AttemptLimiter {
    private readonly hits = new Map<string, number[]>();

    constructor(
        private readonly limit: number,
        private readonly windowMs: number,
        /** Au-delà, les clés sans essai récent sont purgées (borne la mémoire). */
        private readonly maxKeys = 10_000,
    ) {}

    /** Essais encore comptés pour cette clé. */
    private recent(key: string, now: number): number[] {
        return (this.hits.get(key) ?? []).filter((at) => now - at < this.windowMs);
    }

    /** Vrai si la clé a atteint sa limite (sans compter de nouvel essai). */
    isBlocked(key: string, now = Date.now()): boolean {
        return this.recent(key, now).length >= this.limit;
    }

    /** Compte un essai. */
    hit(key: string, now = Date.now()): void {
        const times = [...this.recent(key, now), now];
        // Supprimer puis remettre : la clé passe en fin d'ordre d'insertion (la plus récente).
        this.hits.delete(key);
        if (this.hits.size >= this.maxKeys) this.prune(now);
        this.hits.set(key, times);
    }

    /** Oublie la clé (par exemple après une connexion réussie). */
    reset(key: string): void {
        this.hits.delete(key);
    }

    private prune(now: number): void {
        for (const [key, times] of this.hits) {
            if (times.every((at) => now - at >= this.windowMs)) this.hits.delete(key);
        }
        // Encore plein (attaque sur de très nombreuses adresses) : on oublie les clés les plus anciennes.
        for (const key of this.hits.keys()) {
            if (this.hits.size < this.maxKeys) break;
            this.hits.delete(key);
        }
    }
}
