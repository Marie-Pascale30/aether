/** Petit store observable : état immuable (gelé) + abonnements. */
export function createStore(initialState) {
    let state = Object.freeze({ ...initialState });
    const listeners = new Set();

    return {
        get: () => state,

        set(patch) {
            const changed = Object.keys(patch).some((key) => !Object.is(state[key], patch[key]));
            if (!changed) return;

            state = Object.freeze({ ...state, ...patch });
            listeners.forEach((listener) => listener(state));
        },

        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
