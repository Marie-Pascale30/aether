/**
 * Écrit la migration de contenu de l'Atlas des Esprits (bases existantes) :
 *   npx tsx scripts/atlas-migration.ts > prisma/migrations/<horodatage>_atlas/migration.sql
 * Les énigmes ajoutées au Sommet viennent de `prisma/atlas-content.ts`, comme dans le seed :
 * une base migrée et une installation neuve ont exactement les mêmes plateaux.
 */
import { SUMMIT_LEVELS } from "../prisma/atlas-content";

const q = (text: string) => `'${text.replace(/'/g, "''")}'`;
const textArray = (items: string[]) => (items.length ? `ARRAY[${items.map(q).join(", ")}]` : "ARRAY[]::text[]");

interface Region {
    from: string;
    slug: string;
    title: string;
    tagline: string;
    description: string;
    theme: string;
    order: number;
}

/** Mêmes textes que dans `prisma/seed.ts`. */
const REGIONS: Region[] = [
    {
        from: "origines",
        slug: "jardin-des-echos",
        title: "Le Jardin des Échos",
        tagline: "Observer, c'est déjà relier.",
        description:
            "Première page de l'Atlas des Esprits. Ici, les choses ne sont pas seulement posées les unes à côté des autres : elles se répondent. Observe-les, et elles vont par deux.",
        theme: "jardin",
        order: 0,
    },
    { from: "bibliotheque-vivante", slug: "bibliotheque-vivante", title: "La Bibliothèque Vivante", tagline: "Les livres se souviennent de ce qu'on leur confie.", description: "", theme: "bibliotheque", order: 1 },
    { from: "atelier-des-inventeurs", slug: "atelier-des-inventeurs", title: "L'Atelier des Inventeurs", tagline: "Chaque rouage attend sa juste place.", description: "", theme: "atelier", order: 2 },
    {
        from: "canaux-d-ether",
        slug: "observatoire",
        title: "L'Observatoire",
        tagline: "Chaque étoile cherche sa jumelle.",
        description:
            "Sous la coupole, le ciel s'est éteint. Relie chaque paire d'étoiles de même signe sans croiser les autres tracés, et fais passer la lumière par chaque case : le ciel entier doit briller.",
        theme: "observatoire",
        order: 3,
    },
    {
        from: "rivage-des-suites",
        slug: "conservatoire",
        title: "Le Conservatoire",
        tagline: "Chaque note appelle la suivante.",
        description:
            "Dans le Conservatoire, tout suit une mesure : les saisons, les heures, les phases de la lune. Retrouve l'ordre juste, du premier temps au dernier, et la musique reprend.",
        theme: "conservatoire",
        order: 4,
    },
    {
        from: "foret-des-echos",
        slug: "foret-des-connexions",
        title: "La Forêt des Connexions",
        tagline: "Ici, rien ne va seul : tout va par familles.",
        description: "",
        theme: "foret",
        order: 5,
    },
    {
        from: "salle-des-echos",
        slug: "sommet-des-sages",
        title: "Le Sommet des Sages",
        tagline: "Toutes les facultés se rejoignent.",
        description:
            "Au sommet de l'Atlas, les esprits se rassemblent. Devine la règle cachée des échos, puis retrouve en chemin tout ce que tu as appris : la mémoire, la logique et le regard qui embrasse l'espace.",
        theme: "sommet",
        order: 6,
    },
    { from: "quotidien", slug: "quotidien", title: "Énigmes du jour", tagline: "Une énigme par jour, la même pour tout le monde.", description: "", theme: "sommet", order: 7 },
];

const SKY_TITLES: [string, string, string][] = [
    ["La source", "Première lueur", "Deux tracés, un petit coin de ciel."],
    ["Les rigoles", "Les astres jumeaux", "Les chemins se partagent l'espace."],
    ["Le lavoir", "La lunette", "Plus de tracés, plus de détours."],
    ["Les aqueducs", "Les orbites", "Un grand ciel à éclairer."],
    ["Le delta", "La voie lactée", "Les tracés s'entrelacent."],
    ["La mer d'éther", "La carte du ciel", "Tout le ciel, d'un seul tenant."],
];

const out: string[] = [
    "-- L'Atlas des Esprits : les mondes deviennent les sept régions de la vision, chacune avec son",
    "-- paysage (thème), dans l'ordre Jardin, Bibliothèque, Atelier, Observatoire, Conservatoire,",
    "-- Forêt, Sommet. Écrit par scripts/atlas-migration.ts. Sans effet sur une base vide : le seed",
    "-- crée alors directement les régions.",
    "",
    "-- Anciennes palettes vers les régions (mondes créés dans l'éditeur compris).",
    `UPDATE "World" SET "theme" = CASE "theme" WHEN 'origines' THEN 'jardin' WHEN 'ocean' THEN 'observatoire' WHEN 'cosmos' THEN 'sommet' ELSE "theme" END;`,
    "",
];

for (const region of REGIONS) {
    const set = [
        `"slug" = ${q(region.slug)}`,
        `"title" = ${q(region.title)}`,
        `"tagline" = ${q(region.tagline)}`,
        ...(region.description ? [`"description" = ${q(region.description)}`] : []),
        `"theme" = ${q(region.theme)}`,
        `"order" = ${region.order}`,
        `"updatedAt" = now()`,
    ];
    out.push(`UPDATE "World" SET ${set.join(", ")} WHERE "slug" = ${q(region.from)};`);
}

out.push("", "-- L'Observatoire : les énigmes de Flux prennent des noms d'astres.");
for (const [from, title, description] of SKY_TITLES) {
    out.push(
        `UPDATE "Level" SET "title" = ${q(title)}, "description" = ${q(description)}, "updatedAt" = now() WHERE "title" = ${q(from)} AND "worldId" = (SELECT "id" FROM "World" WHERE "slug" = 'observatoire');`,
    );
}

out.push(
    "",
    "-- Le Sommet des Sages réunit les facultés : trois énigmes s'intercalent entre ses Échos.",
    `UPDATE "Level" SET "order" = "order" * 2 WHERE "worldId" = (SELECT "id" FROM "World" WHERE "slug" = 'sommet-des-sages');`,
);
SUMMIT_LEVELS.forEach((level, i) => {
    const id = `atlas-sommet-${i + 1}`;
    out.push(
        [
            `INSERT INTO "Level" ("id", "worldId", "order", "title", "description", "hints", "symbols", "columns", "mechanic", "puzzle", "kind", "groups", "published", "updatedAt")`,
            `SELECT ${q(id)}, w."id", ${i * 2 + 1}, ${q(level.title)}, ${q(level.description)}, ${textArray(level.hints)}, ARRAY[]::text[], ${level.columns}, ${q(level.mechanic)}::"Mechanic",`,
            `       ${q(JSON.stringify(level.puzzle))}::jsonb, 'PAIRS'::"LevelKind", '[]'::jsonb, true, now()`,
            `FROM "World" w WHERE w."slug" = 'sommet-des-sages' AND NOT EXISTS (SELECT 1 FROM "Level" WHERE "id" = ${q(id)});`,
        ].join("\n"),
    );
});

console.log(out.join("\n"));
