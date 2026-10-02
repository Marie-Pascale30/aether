import { PrismaClient } from "@prisma/client";
import { levelInputSchema, type LevelInput } from "@aether/shared";
import { hashPassword } from "../src/auth/password";

const prisma = new PrismaClient();

/** Parcours « Jardin des Origines ». Indices du plus vague au plus explicite. */
const LEVELS: LevelInput[] = [
    {
        title: "Le premier lien",
        description: "Deux formes appartiennent à la même famille.",
        hints: ["Observe les formes, pas leur position.", "Relie les deux symboles identiques."],
        symbols: ["○", "✦", "△", "○", "□", "◇", "☾", "✧"],
        columns: 4,
        pairs: [[0, 3]],
        published: true,
    },
    {
        title: "L'ombre et la lumière",
        description: "Cherche ce qui forme un contraste naturel.",
        hints: ["Une même forme, deux intensités.", "Le cercle sombre répond au cercle clair."],
        symbols: ["☀", "○", "●", "☾", "△", "◇", "✦", "□"],
        columns: 4,
        pairs: [[1, 2]],
        published: true,
    },
    {
        title: "La graine",
        description: "Une forme annonce une autre forme.",
        hints: ["Ce qui est petit deviendra grand.", "Trouve le symbole qui représente la croissance."],
        symbols: ["🌱", "🌳", "☁", "💧", "🔥", "🪨", "🌙", "⭐"],
        columns: 4,
        pairs: [[0, 1]],
        published: true,
    },
    {
        title: "Le ciel",
        description: "Deux éléments racontent le même mouvement.",
        hints: ["L'un tire, l'autre monte et descend.", "Le croissant et la marée se répondent."],
        symbols: ["☾", "☁", "☀", "✦", "◇", "≈", "○", "△"],
        columns: 4,
        pairs: [[0, 5]],
        published: true,
    },
    {
        title: "La mémoire",
        description: "Un motif s'est déplacé.",
        hints: ["Un symbole n'est pas unique.", "Retrouve la forme apparue deux fois."],
        symbols: ["✧", "◇", "✦", "◇", "○", "△", "□", "☾"],
        columns: 4,
        pairs: [[1, 3]],
        published: true,
    },
    {
        title: "Les saisons",
        description: "Tout cycle possède un commencement et un retour.",
        hints: ["Ce qui pousse revient chaque printemps.", "Associe les deux symboles végétaux."],
        symbols: ["❄", "🌱", "☀", "🌈", "🌿", "🌧", "🌙", "🔥"],
        columns: 4,
        pairs: [[1, 4]],
        published: true,
    },
    {
        title: "L'écho",
        description: "Une forme répond à sa propre trace.",
        hints: ["Regarde les pointes.", "Même géométrie, orientation différente."],
        symbols: ["△", "▽", "○", "□", "◇", "✦", "✧", "☾"],
        columns: 4,
        pairs: [[0, 1]],
        published: true,
    },
    {
        title: "La constellation",
        description: "Les points dessinent une idée.",
        hints: ["Lève les yeux.", "Associe les deux étoiles jumelles."],
        symbols: ["✦", "○", "☁", "◇", "✦", "△", "□", "☾"],
        columns: 4,
        pairs: [[0, 4]],
        published: true,
    },
    {
        title: "Le passage",
        description: "Deux éléments partagent le même rôle.",
        hints: ["Certains signes montrent où aller.", "Deux signes indiquent un chemin à suivre."],
        symbols: ["◉", "⌂", "➜", "◇", "↗", "○", "△", "□"],
        columns: 4,
        pairs: [[2, 4]],
        published: true,
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
        pairs: [[0, 5], [1, 3]],
        published: true,
    },
];

async function seedLevels() {
    if ((await prisma.level.count()) > 0) {
        console.log("Niveaux déjà présents : aucun ajout.");
        return;
    }

    for (const [order, level] of LEVELS.entries()) {
        const parsed = levelInputSchema.parse(level);
        await prisma.level.create({ data: { ...parsed, order } });
    }
    console.log(`${LEVELS.length} niveaux créés.`);
}

async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
        console.log("ADMIN_EMAIL / ADMIN_PASSWORD absents : aucun administrateur créé.");
        return;
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
        where: { email },
        update: { role: "ADMIN", passwordHash, isGuest: false },
        create: { email, passwordHash, displayName: "Gardien", role: "ADMIN", isGuest: false },
    });
    console.log(`Administrateur prêt : ${email}`);
}

seedLevels()
    .then(seedAdmin)
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
