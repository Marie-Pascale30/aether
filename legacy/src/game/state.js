import { createStore } from "../core/store.js";
import { LEVELS } from "../data/levels.js";
import { gardenStage } from "./garden.js";

export const store = createStore({
    /** Énigme en cours dans la partie. */
    levelIndex: 0,
    /** Nombre d'énigmes déjà restaurées, toutes parties confondues (ne diminue jamais). */
    restoredCount: 0,
});

export const actions = {
    startRun() {
        store.set({ levelIndex: 0 });
    },

    completeCurrentLevel() {
        const { levelIndex, restoredCount } = store.get();
        store.set({ restoredCount: Math.max(restoredCount, levelIndex + 1) });
    },

    /** Passe à l'énigme suivante. Renvoie `false` s'il n'y en a plus. */
    advance() {
        const next = store.get().levelIndex + 1;
        if (next >= LEVELS.length) return false;
        store.set({ levelIndex: next });
        return true;
    },
};

export const selectors = {
    currentLevel: () => LEVELS[store.get().levelIndex],

    gardenStage: () => gardenStage(store.get().restoredCount, LEVELS.length),

    /** Liens trouvés dans les énigmes précédentes de la partie en cours. */
    linksBeforeCurrentLevel: () =>
        LEVELS.slice(0, store.get().levelIndex).reduce((sum, level) => sum + level.pairs.length, 0),
};
