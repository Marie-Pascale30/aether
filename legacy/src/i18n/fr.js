const pad = (n) => String(n).padStart(2, "0");
const plural = (n, word) => `${word}${n > 1 ? "s" : ""}`;

export const fr = {
    app: {
        name: "AETHER",
        version: "PROTOTYPE 0.1",
    },

    home: {
        tagline: "Un monde attend ses connexions",
        pitch: "Une expérience contemplative de puzzles où chaque connexion restaure une partie du monde.",
        start: "Commencer",
        footer: "Jardin des Origines",
    },

    intro: {
        tag: "Jardin des Origines",
        title: "Les Liens",
        text: "Dans AETHER, les choses ne sont pas seulement placées les unes à côté des autres. Elles se répondent.",
        ruleLabel: "Principe :",
        rule: "trouve les deux symboles qui partagent la même relation, puis relie-les.",
        enter: "Entrer dans le jardin",
    },

    puzzle: {
        level: (index, total) => `ÉNIGME ${pad(index)} / ${pad(total)}`,
        restored: (n) => `${n} ${plural(n, "lien")} ${plural(n, "restauré")}`,
        hintLabel: "Indice :",
        nodeLabel: (index) => `ÉCHO ${index}`,
        reset: "Réinitialiser",
        next: "Continuer",
        status: {
            idle: "Choisis deux éléments qui vont ensemble.",
            retry: "Essaie une autre relation.",
            mismatch: "Ce lien ne résonne pas. Observe encore.",
            partial: (remaining) =>
                remaining > 1 ? `Connexion trouvée. Il reste ${remaining} échos.` : "Connexion trouvée. Il reste un écho.",
            complete: "Le lien est juste. Le jardin respire à nouveau.",
        },
    },

    end: {
        tag: "Première restauration",
        quote: ["« Le jardin ne s'est pas agrandi.", "Il s'est souvenu de lui-même. »"],
        text: "Tu viens de terminer la première boucle d'AETHER : observer, comprendre, relier, restaurer.",
        back: "Revenir au jardin",
    },
};
