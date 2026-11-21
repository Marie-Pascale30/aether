/**
 * Écrit la migration qui ajoute le Carillon au Conservatoire (bases existantes) :
 *   npx tsx scripts/carillon-migration.ts > prisma/migrations/<horodatage>_conservatoire_chimes/migration.sql
 * Les plateaux viennent de `prisma/atlas-content.ts`, comme dans le seed.
 */
import { CONSERVATOIRE_CHIMES } from "../prisma/atlas-content";

const q = (text: string) => `'${text.replace(/'/g, "''")}'`;
const textArray = (items: string[]) => `ARRAY[${items.map(q).join(", ")}]`;
const world = `(SELECT "id" FROM "World" WHERE "slug" = 'conservatoire')`;

const out = [
    "-- Le Conservatoire accueille le Carillon : quatre énigmes s'intercalent entre ses Suites.",
    "-- Écrit par scripts/carillon-migration.ts. Sans effet sur une base vide (le seed les crée).",
    `UPDATE "Level" SET "order" = "order" * 2 WHERE "worldId" = ${world} AND NOT EXISTS (SELECT 1 FROM "Level" WHERE "id" = 'carillon-1');`,
];
CONSERVATOIRE_CHIMES.forEach((level, i) => {
    const id = `carillon-${i + 1}`;
    out.push(
        [
            `INSERT INTO "Level" ("id", "worldId", "order", "title", "description", "hints", "symbols", "columns", "mechanic", "puzzle", "kind", "groups", "published", "updatedAt")`,
            `SELECT ${q(id)}, w."id", ${i * 2 + 1}, ${q(level.title)}, ${q(level.description)}, ${textArray(level.hints)}, ARRAY[]::text[], ${level.columns}, 'CHIMES'::"Mechanic",`,
            `       ${q(JSON.stringify(level.puzzle))}::jsonb, 'PAIRS'::"LevelKind", '[]'::jsonb, true, now()`,
            `FROM "World" w WHERE w."slug" = 'conservatoire' AND NOT EXISTS (SELECT 1 FROM "Level" WHERE "id" = ${q(id)});`,
        ].join("\n"),
    );
});
console.log(out.join("\n"));
