import { PrismaClient } from "@prisma/client";
import { levelInputSchema, worldInputSchema, type LevelInput, type WorldInput } from "@aether/shared";
import { hashPassword } from "../src/auth/password";

const prisma = new PrismaClient();

type SeedLevel = Omit<LevelInput, "worldId" | "published">;
type SeedWorld = WorldInput & { levels: SeedLevel[] };

/** Formes neutres servant de leurres, sans lien entre elles. */
const DECOYS = ["○", "△", "□", "◇", "✦", "⬡", "☾", "✧"];

/**
 * Contenu initial. Règle de conception : chaque lien doit être la SEULE réponse défendable
 * d'après l'indice — aucun leurre ne doit satisfaire l'indice lui aussi.
 * Indices du plus vague au plus explicite.
 */
const WORLDS: SeedWorld[] = [
    {
        slug: "origines",
        title: "Jardin des Origines",
        tagline: "Là où naissent les premiers liens.",
        description:
            "Dans AETHER, les choses ne sont pas seulement placées les unes à côté des autres. Elles se répondent. Ici, elles vont par deux.",
        theme: "origines",
        published: true,
        levels: [
            {
                title: "Le premier lien",
                description: "Deux formes appartiennent à la même famille.",
                hints: ["Observe les formes, pas leur position.", "Relie les deux symboles identiques."],
                symbols: ["○", "✦", "△", "○", "□", "◇", "☾", "✧"],
                columns: 4,
                kind: "PAIRS",
                groups: [[0, 3]],
            },
            {
                title: "L'ombre et la lumière",
                description: "Cherche ce qui forme un contraste naturel.",
                hints: ["Une même forme, deux intensités.", "Le cercle sombre répond au cercle clair."],
                symbols: ["☀", "○", "●", "☾", "△", "◇", "✦", "□"],
                columns: 4,
                kind: "PAIRS",
                groups: [[1, 2]],
            },
            {
                title: "La graine",
                description: "Une forme annonce une autre forme.",
                hints: ["Ce qui est petit deviendra grand.", "Trouve le symbole qui représente la croissance."],
                symbols: ["🌱", "🌳", "☁", "💧", "🔥", "🪨", "🌙", "⭐"],
                columns: 4,
                kind: "PAIRS",
                groups: [[0, 1]],
            },
            {
                title: "Le ciel",
                description: "Deux éléments racontent le même mouvement.",
                hints: ["L'un tire, l'autre monte et descend.", "Le croissant et la marée se répondent."],
                symbols: ["☾", "☁", "☀", "✦", "◇", "≈", "○", "△"],
                columns: 4,
                kind: "PAIRS",
                groups: [[0, 5]],
            },
            {
                title: "La mémoire",
                description: "Un motif s'est déplacé.",
                hints: ["Un symbole n'est pas unique.", "Retrouve la forme apparue deux fois."],
                symbols: ["✧", "◇", "✦", "◇", "○", "△", "□", "☾"],
                columns: 4,
                kind: "PAIRS",
                groups: [[1, 3]],
            },
            {
                title: "Les saisons",
                description: "Tout cycle possède un commencement et un retour.",
                hints: ["Ce qui pousse revient chaque printemps.", "Associe les deux symboles végétaux."],
                symbols: ["❄", "🌱", "☀", "🌈", "🌿", "🌧", "🌙", "🔥"],
                columns: 4,
                kind: "PAIRS",
                groups: [[1, 4]],
            },
            {
                title: "L'écho",
                description: "Une forme répond à sa propre trace.",
                hints: ["Regarde les pointes.", "Même géométrie, orientation différente."],
                symbols: ["△", "▽", "○", "□", "◇", "✦", "✧", "☾"],
                columns: 4,
                kind: "PAIRS",
                groups: [[0, 1]],
            },
            {
                title: "La constellation",
                description: "Les points dessinent une idée.",
                hints: ["Lève les yeux.", "Associe les deux étoiles jumelles."],
                symbols: ["✦", "○", "☁", "◇", "✦", "△", "□", "☾"],
                columns: 4,
                kind: "PAIRS",
                groups: [[0, 4]],
            },
            {
                title: "Le passage",
                description: "Deux éléments partagent le même rôle.",
                hints: ["Certains signes montrent où aller.", "Deux signes indiquent un chemin à suivre."],
                symbols: ["◉", "⌂", "➜", "◇", "↗", "○", "△", "□"],
                columns: 4,
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
                kind: "PAIRS",
                groups: [[0, 5], [1, 3]],
            },
        ],
    },
    {
        slug: "foret-des-echos",
        title: "Forêt des Échos",
        tagline: "Ici, rien ne va seul : tout va par trois.",
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
                kind: "GROUPS",
                groups: [[0, 2, 4]],
            },
            {
                title: "Le voyage de l'eau",
                description: "Une même eau, trois visages.",
                hints: ["Elle tombe, elle flotte, elle perle.", "La goutte, le nuage et la pluie."],
                symbols: ["🔥", "💧", "△", "☁", "🪨", "⭐", "🌧", "○", "✦"],
                columns: 3,
                kind: "GROUPS",
                groups: [[1, 3, 6]],
            },
            {
                title: "Les visages de la lune",
                description: "La nuit change de visage, mais c'est toujours elle.",
                hints: ["Une seule veilleuse, plusieurs formes.", "Réunis les trois phases de la lune."],
                symbols: ["🌑", "☀", "⭐", "🌓", "○", "△", "□", "🌕", "✦"],
                columns: 3,
                kind: "GROUPS",
                groups: [[0, 3, 7]],
            },
            {
                title: "Deux familles",
                description: "Deux trios partagent la clairière.",
                hints: ["Ceux qui vivent ici, et ce qui tombe du ciel.", "Les habitants de la forêt ; le temps qu'il fait."],
                symbols: ["🦊", "○", "☀", "△", "🦉", "☁", "□", "◇", "🦌", "✦", "❄", "⬡"],
                columns: 4,
                kind: "GROUPS",
                groups: [[0, 4, 8], [2, 5, 10]],
            },
            {
                title: "Le quatuor",
                description: "Quatre voix pour une seule année.",
                hints: ["Elles se suivent et reviennent.", "Réunis les quatre saisons."],
                symbols: ["🌱", ...DECOYS.slice(0, 3), "☀", ...DECOYS.slice(3, 6), "🍂", "☾", "❄", "✧"],
                columns: 4,
                kind: "GROUPS",
                groups: [[0, 4, 8, 10]],
            },
        ],
    },
    {
        slug: "rivage-des-suites",
        title: "Rivage des Suites",
        tagline: "Chaque pas mène au suivant.",
        description:
            "Au bord de l'eau, les choses ont un sens de lecture. Relie-les dans l'ordre : un chemin pris à l'envers ne mène nulle part.",
        theme: "ocean",
        published: true,
        levels: [
            {
                title: "La glace et la vapeur",
                description: "L'eau change d'état en se réchauffant.",
                hints: ["Commence par le plus froid.", "La glace fond, puis l'eau s'évapore en nuage."],
                symbols: ["🔥", "💧", "△", "☁", "🪨", "❄", "○", "☀", "✦"],
                columns: 3,
                kind: "SEQUENCE",
                groups: [[5, 1, 3]],
            },
            {
                title: "La croissance",
                description: "De la graine à l'arbre, il n'y a qu'un chemin.",
                hints: ["Commence par le plus petit.", "Graine, pousse, plante, arbre."],
                symbols: ["🌳", "○", "🌰", "△", "□", "🌿", "◇", "✦", "🌱", "☾", "⬡", "✧"],
                columns: 4,
                kind: "SEQUENCE",
                groups: [[2, 8, 5, 0]],
            },
            {
                title: "Compter les points",
                description: "Les dés ne mentent pas.",
                hints: ["Du plus petit au plus grand.", "Un, deux, trois, quatre points."],
                symbols: ["⚂", "○", "△", "⚀", "□", "◇", "⚃", "✦", "☾", "⚁", "⬡", "✧"],
                columns: 4,
                kind: "SEQUENCE",
                groups: [[3, 9, 0, 6]],
            },
            {
                title: "La lune qui grandit",
                description: "Nuit après nuit, la lumière revient.",
                hints: ["Pars de la nuit la plus noire.", "De la nouvelle lune à la pleine lune."],
                symbols: ["🌓", "○", "🌑", "☀", "🌕", "✦", "🌒", "△", "✧", "🌔", "□", "◇"],
                columns: 4,
                kind: "SEQUENCE",
                groups: [[2, 6, 0, 9, 4]],
            },
            {
                title: "Deux chemins",
                description: "Deux choses grandissent côte à côte.",
                hints: ["L'une monte, l'autre se remplit.", "Les barres du plus bas au plus haut ; le cercle du plus vide au plus plein."],
                symbols: ["▅", "◑", "○", "▁", "△", "◕", "□", "▃", "◇", "◔", "✦", "☾"],
                columns: 4,
                kind: "SEQUENCE",
                groups: [[3, 7, 0], [9, 1, 5]],
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
            await prisma.level.create({ data: { ...parsed, order: levelOrder } });
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
        update: { role: "ADMIN", passwordHash, isGuest: false },
        create: { email, passwordHash, displayName: "Gardien", role: "ADMIN", isGuest: false },
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
