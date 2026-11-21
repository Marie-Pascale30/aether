import type { WorldTheme } from "@aether/shared";

/** Un chapitre du Livre de l'Atlas : trois pages qui reviennent à mesure que la région se restaure. */
export interface Chapter {
    title: string;
    pages: [string, string, string];
    /** Dernière ligne, écrite quand la région est entièrement restaurée. */
    seal: string;
}

export const CHAPTERS: Record<WorldTheme, Chapter> = {
    jardin: {
        title: "Où les choses se répondent",
        pages: [
            "Au commencement de l'Atlas, il y avait un jardin. Rien n'y poussait seul : chaque fleur attendait sa sœur, chaque pierre son reflet. Quand la bibliothèque s'est brisée, les paires se sont perdues de vue, et le jardin s'est tu.",
            "Le Gardien est arrivé avec une lanterne et beaucoup de patience. Il ne plantait rien. Il regardait. Et chaque fois que deux choses se reconnaissaient sous son regard, une pousse sortait de terre, comme si elle n'avait jamais cessé d'être là.",
            "On dit qu'un jardin ne grandit pas : il se souvient. Celui-ci se souvient désormais de chaque écho, et les visiteurs qui s'y arrêtent apprennent sans le savoir la première leçon de l'Atlas — regarder avant de comprendre.",
        ],
        seal: "Le Jardin des Échos est restauré. Ses paires ne se perdront plus.",
    },
    bibliotheque: {
        title: "Les pages qui se souvenaient",
        pages: [
            "Plus haut, au-delà du jardin, s'élevait une bibliothèque dont les livres se lisaient eux-mêmes. Chaque page retenait ce qu'on lui confiait. Au moment de la brisure, les pages se sont envolées, et la mémoire avec elles.",
            "Le Gardien a appris à les rappeler une à une. Il suffisait de se souvenir d'où elles venaient : une forme vue un instant, une place sur l'étagère. Les pages, reconnaissantes, revenaient se ranger d'elles-mêmes.",
            "Aujourd'hui les rayonnages bruissent de nouveau. On y entend parfois un livre réciter tout bas ce qu'il a failli oublier — et l'on comprend que se souvenir est une façon de prendre soin.",
        ],
        seal: "La Bibliothèque Vivante est restaurée. Chaque page a retrouvé sa place.",
    },
    atelier: {
        title: "Le cœur des rouages",
        pages: [
            "Dans l'Atelier des Inventeurs, rien n'était décoratif. Chaque roue entraînait une autre roue, chaque engrenage avait sa raison. La brisure a désaccordé les mécanismes : ils tournaient encore, mais pour rien.",
            "Le Gardien ne força jamais un rouage. Il chercha d'abord ce qui devait tourner, puis pourquoi, et seulement ensuite comment. Un quart de tour bien pensé valait cent essais au hasard.",
            "Les machines de l'Atelier se sont remises à chanter leur tic-tac régulier. Elles ne fabriquent rien d'autre que de la clarté : la joie tranquille de voir enfin pourquoi tout s'emboîte.",
        ],
        seal: "L'Atelier des Inventeurs est restauré. Ses rouages tournent juste.",
    },
    observatoire: {
        title: "Les chemins de lumière",
        pages: [
            "Au sommet d'une tour, l'Observatoire reliait les étoiles par des fils de lumière. Les voyageurs s'en servaient pour ne jamais se perdre. Après la brisure, les fils se sont emmêlés, et le ciel est devenu muet.",
            "Le Gardien a passé des nuits à retracer les chemins, sans jamais croiser deux fils. Il lui fallait voir l'ensemble avant de tirer le premier trait — comme on regarde une carte entière avant de choisir sa route.",
            "Les constellations ont retrouvé leurs liens. Les nuits claires, on peut suivre du doigt les chemins restaurés et sentir, un instant, que l'espace entier tient dans un regard.",
        ],
        seal: "L'Observatoire est restauré. Le ciel a retrouvé ses chemins.",
    },
    conservatoire: {
        title: "La phrase des cloches",
        pages: [
            "Le Conservatoire gardait les mélodies de l'Atlas : de petites phrases de cloches que le vent rejouait à la tombée du soir. Quand tout s'est brisé, les cloches se sont tues, et personne ne se souvenait plus de leur ordre.",
            "Le Gardien a écouté le silence longtemps avant de l'entendre chanter. Une note, puis deux, puis une phrase entière, rejouée sans hâte. Le rythme, comprit-il, n'est qu'une mémoire qui respire.",
            "Le carillon sonne de nouveau sur la colline. Ceux qui passent le fredonnent sans y penser, et leurs pas, peu à peu, prennent la cadence douce du Conservatoire.",
        ],
        seal: "Le Conservatoire est restauré. Ses cloches se répondent au soir.",
    },
    foret: {
        title: "Ce qui pousse ensemble",
        pages: [
            "La Forêt des Connexions ne se laissait jamais voir d'un seul coup. Ses arbres se parlaient par les racines ; chaque chose y avait un cousin inattendu. La brisure a coupé ces conversations souterraines.",
            "Le Gardien a appris à deviner les familles cachées : ce qui vole, ce qui brille, ce qui se mange au matin. Chaque lien retrouvé faisait frissonner la canopée, comme un rire très ancien.",
            "La forêt bruisse à nouveau de mille dialogues. On n'y marche plus jamais seul : tout, autour de soi, appartient à quelque chose de plus grand.",
        ],
        seal: "La Forêt des Connexions est restaurée. Ses racines se parlent encore.",
    },
    sommet: {
        title: "Là où tout se rejoint",
        pages: [
            "Au Sommet des Sages, l'air est si clair qu'on y voit toutes les régions à la fois. C'est là que l'Atlas avait été écrit, et c'est là que la brisure avait commencé : un instant d'oubli, et toutes les facultés s'étaient séparées.",
            "Le Gardien y monta en emportant ce que chaque région lui avait appris — regarder, se souvenir, comprendre, voir, écouter, relier. Aucune ne suffisait seule. Ensemble, elles formaient une lumière.",
            "L'Atlas des Esprits est entier de nouveau. Le Gardien a posé sa lanterne au sommet, et elle éclaire tout le chemin parcouru. Il ne reste qu'à revenir, de temps en temps, offrir à son esprit un moment de plaisir.",
        ],
        seal: "Le Sommet des Sages est restauré. L'Atlas se souvient de lui-même.",
    },
};

/** Pages lisibles selon les énigmes résolues : une par tiers du monde, la première dès la première énigme. */
export function readablePages(completed: number, total: number): number {
    if (total <= 0 || completed <= 0) return 0;
    return Math.min(3, Math.ceil((3 * completed) / total));
}

/** Énigmes encore à résoudre pour lire la page suivante. */
export function untilNextPage(completed: number, total: number): number {
    const pages = readablePages(completed, total);
    if (pages >= 3) return 0;
    let needed = completed + 1;
    while (readablePages(needed, total) <= pages) needed++;
    return needed - completed;
}
