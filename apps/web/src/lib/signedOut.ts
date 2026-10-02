/**
 * Mémorise une déconnexion volontaire, pour ne pas rouvrir aussitôt une session invité
 * à la place du joueur qui vient de partir (on lui laisse le choix).
 */
const KEY = "aether:signed-out";

export const signedOut = {
    get(): boolean {
        try {
            return sessionStorage.getItem(KEY) === "1";
        } catch {
            return false;
        }
    },
    set(value: boolean) {
        try {
            if (value) sessionStorage.setItem(KEY, "1");
            else sessionStorage.removeItem(KEY);
        } catch {
            // stockage indisponible : on retombe sur le comportement par défaut (invité automatique)
        }
    },
};
