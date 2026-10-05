import { Prisma, PrismaClient } from "@prisma/client";
import { generatePuzzle, levelInputSchema, worldInputSchema, type WorldInput } from "@aether/shared";
import { hashPassword } from "../src/auth/password";
import { ECHOES_HINTS, FLOW_HINTS, GEARS_HINTS, generated, MEMORY_HINTS, SUMMIT_LEVELS, type SeedLevel } from "./atlas-content";

const prisma = new PrismaClient();

/** `isDaily` est facultatif à la saisie (faux par défaut). */
type SeedWorld = Omit<WorldInput, "isDaily"> & { isDaily?: boolean; levels: SeedLevel[] };

/**
 * Échos variés : pour chaque niveau, la première graine (dans un ordre fixe) dont la règle
 * n'a pas encore servi dans le monde. Déterministe, donc identique à chaque installation.
 */
function variedEchoes(levels: [string, string, number][]): SeedLevel[] {
    const used = new Set<string>();
    return levels.map(([title, description, difficulty], i) => {
        for (let attempt = 0; ; attempt++) {
            const seed = `echos-${i}-${attempt}`;
            const { explanation } = generatePuzzle("ECHOES", seed, difficulty);
            if (!used.has(explanation) || attempt >= 50) {
                used.add(explanation);
                return generated("ECHOES", seed, difficulty, { title, description, hints: ECHOES_HINTS });
            }
        }
    });
}

/** Entrelace deux listes (a0, b0, a1, b1…), le reste de la plus longue à la fin. */
function interleave<T>(a: T[], b: T[]): T[] {
    return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => [a[i], b[i]]).flat().filter((x): x is T => x !== undefined);
}

/** Régions de l'Atlas consacrées aux mécaniques jouées sur l'appareil. */
const MECHANIC_WORLDS: SeedWorld[] = [
    {
        slug: "bibliotheque-vivante",
        title: "La Bibliothèque Vivante",
        tagline: "Les livres se souviennent de ce qu'on leur confie.",
        description:
            "Dans les allées de la Bibliothèque, chaque rayon garde la trace d'un savoir. Observe les symboles aussi longtemps qu'il te plaît, puis retrouve leur place : la mémoire revient aux étagères.",
        theme: "bibliotheque",
        published: true,
        isDaily: false,
        levels: [
            ["Le premier rayon", "Quelques symboles posés sur une étagère.", 1],
            ["Les registres", "Un peu plus de livres, un peu plus de souvenirs.", 2],
            ["La salle de lecture", "Les symboles s'estompent pendant que tu les regardes.", 4],
            ["Les archives", "Des places restent vides : elles comptent aussi.", 6],
            ["Le scriptorium", "Une grande étagère, de nombreux souvenirs.", 8],
            ["La mémoire du monde", "Tout ce que la Bibliothèque a retenu.", 10],
        ].map(([title, description, d], i) =>
            generated("MEMORY", `memoire-${i}`, d as number, { title: title as string, description: description as string, hints: MEMORY_HINTS }),
        ),
    },
    {
        slug: "atelier-des-inventeurs",
        title: "L'Atelier des Inventeurs",
        tagline: "Chaque rouage attend sa juste place.",
        description:
            "Les machines de l'Atelier se sont arrêtées. Fais pivoter les conduits pour que la lumière parte de la source et atteigne chaque pièce, sans qu'aucune ouverture ne se perde dans le vide.",
        theme: "atelier",
        published: true,
        isDaily: false,
        levels: [
            ["La première manivelle", "Quelques conduits à remettre dans le bon sens.", 1],
            ["L'établi", "Les pièces scellées montrent la voie.", 2],
            ["La forge", "Le réseau s'étend.", 4],
            ["Les engrenages", "Moins de repères, plus de pièces.", 6],
            ["La grande horloge", "Chaque rouage dépend de ses voisins.", 8],
            ["Le cœur de la machine", "Toute la lumière de l'Atelier.", 10],
        ].map(([title, description, d], i) =>
            generated("GEARS", `rouages-${i}`, d as number, { title: title as string, description: description as string, hints: GEARS_HINTS }),
        ),
    },
    {
        slug: "observatoire",
        title: "L'Observatoire",
        tagline: "Chaque étoile cherche sa jumelle.",
        description:
            "Sous la coupole, le ciel s'est éteint. Relie chaque paire d'étoiles de même signe sans croiser les autres tracés, et fais passer la lumière par chaque case : le ciel entier doit briller.",
        theme: "observatoire",
        published: true,
        isDaily: false,
        levels: [
            ["Première lueur", "Deux tracés, un petit coin de ciel.", 1],
            ["Les astres jumeaux", "Les chemins se partagent l'espace.", 2],
            ["La lunette", "Plus de tracés, plus de détours.", 4],
            ["Les orbites", "Un grand ciel à éclairer.", 6],
            ["La voie lactée", "Les tracés s'entrelacent.", 8],
            ["La carte du ciel", "Tout le ciel, d'un seul tenant.", 10],
        ].map(([title, description, d], i) =>
            generated("FLOW", `flux-${i}`, d as number, { title: title as string, description: description as string, hints: FLOW_HINTS }),
        ),
    },
];

/** Formes neutres servant de leurres, sans lien entre elles. */
const DECOYS = ["○", "△", "□", "◇", "✦", "⬡", "☾", "✧"];

/**
 * Contenu initial. Règle de conception : chaque lien doit être la SEULE réponse défendable
 * d'après l'indice — aucun leurre ne doit satisfaire l'indice lui aussi.
 * Indices du plus vague au plus explicite.
 */
const WORLDS: SeedWorld[] = [
    {
        slug: "jardin-des-echos",
        title: "Le Jardin des Échos",
        tagline: "Observer, c'est déjà relier.",
        description:
            "Première page de l'Atlas des Esprits. Ici, les choses ne sont pas seulement posées les unes à côté des autres : elles se répondent. Observe-les, et elles vont par deux.",
        theme: "jardin",
        published: true,
        levels: [
            {
                title: "Le premier lien",
                description: "Deux formes appartiennent à la même famille.",
                hints: ["Observe les formes, pas leur position.", "Relie les deux symboles identiques."],
                symbols: ["○", "✦", "△", "○", "□", "◇", "☾", "✧"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[0, 3]],
            },
            {
                title: "L'ombre et la lumière",
                description: "Cherche ce qui forme un contraste naturel.",
                hints: ["Une même forme, deux intensités.", "Le cercle sombre répond au cercle clair."],
                symbols: ["☀", "○", "●", "☾", "△", "◇", "✦", "□"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[1, 2]],
            },
            {
                title: "La graine",
                description: "Une forme annonce une autre forme.",
                hints: ["Ce qui est petit deviendra grand.", "Trouve le symbole qui représente la croissance."],
                symbols: ["🌱", "🌳", "☁", "💧", "🔥", "🪨", "🌙", "⭐"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[0, 1]],
            },
            {
                title: "Le ciel",
                description: "Deux éléments racontent le même mouvement.",
                hints: ["L'un tire, l'autre monte et descend.", "Le croissant et la marée se répondent."],
                symbols: ["☾", "☁", "☀", "✦", "◇", "≈", "○", "△"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[0, 5]],
            },
            {
                title: "La mémoire",
                description: "Un motif s'est déplacé.",
                hints: ["Un symbole n'est pas unique.", "Retrouve la forme apparue deux fois."],
                symbols: ["✧", "◇", "✦", "◇", "○", "△", "□", "☾"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[1, 3]],
            },
            {
                title: "Les saisons",
                description: "Tout cycle possède un commencement et un retour.",
                hints: ["Ce qui pousse revient chaque printemps.", "Associe les deux symboles végétaux."],
                symbols: ["❄", "🌱", "☀", "🌈", "🌿", "🌧", "🌙", "🔥"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[1, 4]],
            },
            {
                title: "L'écho",
                description: "Une forme répond à sa propre trace.",
                hints: ["Regarde les pointes.", "Même géométrie, orientation différente."],
                symbols: ["△", "▽", "○", "□", "◇", "✦", "✧", "☾"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[0, 1]],
            },
            {
                title: "La constellation",
                description: "Les points dessinent une idée.",
                hints: ["Lève les yeux.", "Associe les deux étoiles jumelles."],
                symbols: ["✦", "○", "☁", "◇", "✦", "△", "□", "☾"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[0, 4]],
            },
            {
                title: "Le passage",
                description: "Deux éléments partagent le même rôle.",
                hints: ["Certains signes montrent où aller.", "Deux signes indiquent un chemin à suivre."],
                symbols: ["◉", "⌂", "➜", "◇", "↗", "○", "△", "□"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[2, 4]],
            },
            {
                title: "Le grand lien",
                description: "Dernière étape : observe avant d'agir.",
                hints: [
                    "Deux liens cette fois : l'un sur la terre, l'autre dans le ciel.",
                    "Ce qui pousse va avec ce qui pousse ; ce qui brille avec ce qui brille.",
                ],
                symbols: ["🌳", "☀", "△", "✦", "□", "🌿", "◇", "○"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[0, 5], [1, 3]],
            },
        ],
    },
    ...MECHANIC_WORLDS,
    {
        slug: "conservatoire",
        title: "Le Conservatoire",
        tagline: "Chaque note appelle la suivante.",
        description:
            "Dans le Conservatoire, tout suit une mesure : les saisons, les heures, les phases de la lune. Retrouve l'ordre juste, du premier temps au dernier, et la musique reprend.",
        theme: "conservatoire",
        published: true,
        levels: [
            {
                title: "La glace et la vapeur",
                description: "L'eau change d'état en se réchauffant.",
                hints: ["Commence par le plus froid.", "La glace fond, puis l'eau s'évapore en nuage."],
                symbols: ["🔥", "💧", "△", "☁", "🪨", "❄", "○", "☀", "✦"],
                columns: 3,
                mechanic: "LINKS",
                puzzle: null,
                kind: "SEQUENCE",
                groups: [[5, 1, 3]],
            },
            {
                title: "La croissance",
                description: "De la graine à l'arbre, il n'y a qu'un chemin.",
                hints: ["Commence par le plus petit.", "Graine, pousse, plante, arbre."],
                symbols: ["🌳", "○", "🌰", "△", "□", "🌿", "◇", "✦", "🌱", "☾", "⬡", "✧"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "SEQUENCE",
                groups: [[2, 8, 5, 0]],
            },
            {
                title: "Compter les points",
                description: "Les dés ne mentent pas.",
                hints: ["Du plus petit au plus grand.", "Un, deux, trois, quatre points."],
                symbols: ["⚂", "○", "△", "⚀", "□", "◇", "⚃", "✦", "☾", "⚁", "⬡", "✧"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "SEQUENCE",
                groups: [[3, 9, 0, 6]],
            },
            {
                title: "La lune qui grandit",
                description: "Nuit après nuit, la lumière revient.",
                hints: ["Pars de la nuit la plus noire.", "De la nouvelle lune à la pleine lune."],
                symbols: ["🌓", "○", "🌑", "☀", "🌕", "✦", "🌒", "△", "✧", "🌔", "□", "◇"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "SEQUENCE",
                groups: [[2, 6, 0, 9, 4]],
            },
            {
                title: "Deux chemins",
                description: "Deux choses grandissent côte à côte.",
                hints: ["L'une monte, l'autre se remplit.", "Les barres du plus bas au plus haut ; le cercle du plus vide au plus plein."],
                symbols: ["▅", "◑", "○", "▁", "△", "◕", "□", "▃", "◇", "◔", "✦", "☾"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "SEQUENCE",
                groups: [[3, 7, 0], [9, 1, 5]],
            },
        ],
    },
    {
        slug: "foret-des-connexions",
        title: "La Forêt des Connexions",
        tagline: "Ici, rien ne va seul : tout va par familles.",
        description:
            "Sous les grands arbres, les liens se font plus larges. Réunis les familles entières : un trio n'est complet que si personne ne manque.",
        theme: "foret",
        published: true,
        levels: [
            {
                title: "Les trois sœurs",
                description: "Trois silhouettes se ressemblent comme des sœurs.",
                hints: ["Cherche ce qui se répète.", "Réunis les trois arbres."],
                symbols: ["🌲", "○", "🌲", "△", "🌲", "□", "◇", "☾", "✦"],
                columns: 3,
                mechanic: "LINKS",
                puzzle: null,
                kind: "GROUPS",
                groups: [[0, 2, 4]],
            },
            {
                title: "Le voyage de l'eau",
                description: "Une même eau, trois visages.",
                hints: ["Elle tombe, elle flotte, elle perle.", "La goutte, le nuage et la pluie."],
                symbols: ["🔥", "💧", "△", "☁", "🪨", "⭐", "🌧", "○", "✦"],
                columns: 3,
                mechanic: "LINKS",
                puzzle: null,
                kind: "GROUPS",
                groups: [[1, 3, 6]],
            },
            {
                title: "Les visages de la lune",
                description: "La nuit change de visage, mais c'est toujours elle.",
                hints: ["Une seule veilleuse, plusieurs formes.", "Réunis les trois phases de la lune."],
                symbols: ["🌑", "☀", "⭐", "🌓", "○", "△", "□", "🌕", "✦"],
                columns: 3,
                mechanic: "LINKS",
                puzzle: null,
                kind: "GROUPS",
                groups: [[0, 3, 7]],
            },
            {
                title: "Deux familles",
                description: "Deux trios partagent la clairière.",
                hints: ["Ceux qui vivent ici, et ce qui tombe du ciel.", "Les habitants de la forêt ; le temps qu'il fait."],
                symbols: ["🦊", "○", "☀", "△", "🦉", "☁", "□", "◇", "🦌", "✦", "❄", "⬡"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "GROUPS",
                groups: [[0, 4, 8], [2, 5, 10]],
            },
            {
                title: "Le quatuor",
                description: "Quatre voix pour une seule année.",
                hints: ["Elles se suivent et reviennent.", "Réunis les quatre saisons."],
                symbols: ["🌱", ...DECOYS.slice(0, 3), "☀", ...DECOYS.slice(3, 6), "🍂", "☾", "❄", "✧"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "GROUPS",
                groups: [[0, 4, 8, 10]],
            },
        ],
    },
    {
        slug: "sommet-des-sages",
        title: "Le Sommet des Sages",
        tagline: "Toutes les facultés se rejoignent.",
        description:
            "Au sommet de l'Atlas, les esprits se rassemblent. Devine la règle cachée des échos, puis retrouve en chemin tout ce que tu as appris : la mémoire, la logique et le regard qui embrasse l'espace.",
        theme: "sommet",
        published: true,
        levels: interleave(
            variedEchoes([
                ["Le premier écho", "Trois exemples pour deviner.", 1],
                ["La résonance", "Une transformation à reconnaître.", 2],
                ["Le chœur", "Moins d'exemples, même logique.", 4],
                ["La voûte", "Une règle plus discrète.", 6],
                ["Le double écho", "Deux transformations se combinent.", 8],
                ["Le silence", "Deux transformations, deux exemples seulement.", 10],
            ]),
            SUMMIT_LEVELS,
        ),
    },
    {
        // Réserve de l'énigme du jour : hors parcours, une énigme tirée chaque jour.
        slug: "quotidien",
        title: "Énigmes du jour",
        tagline: "Une énigme par jour, la même pour tout le monde.",
        description: "Réserve de l'énigme du jour. Ce monde n'apparaît pas dans le parcours.",
        theme: "sommet",
        published: true,
        isDaily: true,
        levels: [
            {
                title: "Les jumeaux",
                description: "Parmi les demi-lunes, deux sont identiques.",
                hints: ["Regarde de quel côté tombe l'ombre.", "Relie les deux cercles à moitié noirs du même côté."],
                symbols: ["◐", "◑", "◒", "◐", "◓", "○", "●", "◇"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[0, 3]],
            },
            {
                title: "Le verger",
                description: "Trois fruits sont tombés dans l'herbe.",
                hints: ["Ce qui se mange.", "Réunis les trois fruits."],
                symbols: ["🍎", "○", "🍐", "△", "□", "🍒", "◇", "✦", "☾"],
                columns: 3,
                mechanic: "LINKS",
                puzzle: null,
                kind: "GROUPS",
                groups: [[0, 2, 5]],
            },
            {
                title: "Une journée",
                description: "Le ciel change au fil des heures.",
                hints: ["Commence au lever du jour.", "L'aube, le plein soleil, puis la nuit."],
                symbols: ["🌙", "○", "🌅", "△", "☀", "□", "◇", "✦", "⬡"],
                columns: 3,
                mechanic: "LINKS",
                puzzle: null,
                kind: "SEQUENCE",
                groups: [[2, 4, 0]],
            },
            {
                title: "Le reflet",
                description: "Une forme se regarde dans le miroir.",
                hints: ["Le miroir inverse la gauche et la droite.", "Relie la flèche et son reflet."],
                symbols: ["◀", "▶", "▲", "○", "□", "◇", "✦", "☾"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[0, 1]],
            },
            {
                title: "Les quatre éléments",
                description: "Ce dont le monde est fait, selon les anciens.",
                hints: ["Ce qui brûle, coule, souffle et porte.", "Le feu, l'eau, l'air et la terre."],
                symbols: ["🔥", "○", "△", "💧", "□", "◇", "🌬", "✦", "☾", "⬡", "🪨", "✧"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "GROUPS",
                groups: [[0, 3, 6, 10]],
            },
            {
                title: "L'horloge",
                description: "Le temps avance, heure après heure.",
                hints: ["Suis les aiguilles.", "Une heure, deux heures, trois heures, quatre heures."],
                symbols: ["🕒", "○", "△", "🕐", "□", "◇", "🕓", "✦", "☾", "🕑", "⬡", "✧"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "SEQUENCE",
                groups: [[3, 9, 0, 6]],
            },
            {
                title: "Les contraires",
                description: "Deux couples que tout oppose.",
                hints: ["Le moment de la journée ; la température.", "Le soleil et la lune ; le feu et la glace."],
                symbols: ["☀", "△", "🔥", "□", "☾", "◇", "❄", "⬡", "⌂", "◉", "✧", "▽"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "PAIRS",
                groups: [[0, 4], [2, 6]],
            },
            {
                title: "Le ciel et la mer",
                description: "Deux mondes se reflètent à l'horizon.",
                hints: ["Ce qui est au-dessus, ce qui est en dessous.", "Nuage, étoile et lune ; poisson, coquillage et vague."],
                symbols: ["☁", "🐟", "△", "⭐", "□", "🐚", "◇", "🌙", "⬡", "🌊", "⌂", "◉"],
                columns: 4,
                mechanic: "LINKS",
                puzzle: null,
                kind: "GROUPS",
                groups: [[0, 3, 7], [1, 5, 9]],
            },
        ],
    },
];

async function seedWorlds() {
    for (const [order, { levels, ...input }] of WORLDS.entries()) {
        const data = worldInputSchema.parse(input);
        // Un monde existant n'est pas modifié : les retouches faites dans l'éditeur sont préservées.
        const world = await prisma.world.upsert({ where: { slug: data.slug }, update: {}, create: { ...data, order } });

        if ((await prisma.level.count({ where: { worldId: world.id } })) > 0) {
            console.log(`« ${world.title} » : énigmes déjà présentes, aucun ajout.`);
            continue;
        }
        for (const [levelOrder, level] of levels.entries()) {
            const parsed = levelInputSchema.parse({ ...level, worldId: world.id, published: true });
            const puzzle = parsed.puzzle === null ? Prisma.JsonNull : (parsed.puzzle as Prisma.InputJsonValue);
            await prisma.level.create({ data: { ...parsed, puzzle, order: levelOrder } });
        }
        console.log(`« ${world.title} » : ${levels.length} énigmes créées.`);
    }
}

/** Mot de passe d'exemple de `.env.example`. */
const EXAMPLE_ADMIN_PASSWORD = "change-moi-vite";
const ADMIN_PASSWORD_MIN = 12;

async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
        console.log("ADMIN_EMAIL / ADMIN_PASSWORD absents : aucun administrateur créé.");
        return;
    }

    const weak = password === EXAMPLE_ADMIN_PASSWORD || password.length < ADMIN_PASSWORD_MIN;
    if (weak && process.env.NODE_ENV === "production") {
        throw new Error(
            `ADMIN_PASSWORD refusé en production : la valeur d'exemple et les mots de passe de moins de ${ADMIN_PASSWORD_MIN} caractères sont interdits.`,
        );
    }
    if (weak) {
        console.warn(`⚠ ADMIN_PASSWORD est faible (exemple ou < ${ADMIN_PASSWORD_MIN} caractères) : à changer avant toute mise en ligne.`);
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
        where: { email },
        update: { role: "ADMIN", passwordHash, isGuest: false, emailVerifiedAt: new Date() },
        create: { email, passwordHash, displayName: "Gardien", role: "ADMIN", isGuest: false, emailVerifiedAt: new Date() },
    });
    console.log(`Administrateur prêt : ${email}`);
}

seedWorlds()
    .then(seedAdmin)
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
