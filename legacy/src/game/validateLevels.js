/**
 * Vérifie la cohérence des données de niveaux et renvoie la liste des erreurs trouvées.
 * Attrape les fautes de saisie dès l'ajout d'une énigme plutôt qu'en jouant.
 */
export function validateLevels(levels) {
    const errors = [];

    levels.forEach((level, n) => {
        const where = `Niveau ${n + 1} (« ${level.title} »)`;
        const used = new Set();

        if (!level.pairs?.length) errors.push(`${where} : aucune paire à trouver.`);

        for (const pair of level.pairs ?? []) {
            for (const i of pair) {
                if (!Number.isInteger(i) || i < 0 || i >= level.symbols.length) {
                    errors.push(`${where} : l'indice ${i} est hors du plateau.`);
                } else if (used.has(i)) {
                    errors.push(`${where} : le symbole ${i} (« ${level.symbols[i]} ») appartient à plusieurs paires.`);
                }
                used.add(i);
            }
        }
    });

    return errors;
}
