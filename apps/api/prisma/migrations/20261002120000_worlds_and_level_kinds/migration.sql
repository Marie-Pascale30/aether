-- Mondes et genres d'énigmes.
-- Écrite à la main : les colonnes sont RENOMMÉES (pairs → groups, foundPairs → foundGroups)
-- pour conserver les énigmes et les parties existantes, là où Prisma les supprimerait.

-- CreateEnum
CREATE TYPE "LevelKind" AS ENUM ('PAIRS', 'GROUPS', 'SEQUENCE');

-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'origines',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "World_slug_key" ON "World"("slug");
CREATE INDEX "World_published_order_idx" ON "World"("published", "order");

-- Premier monde, qui accueille les énigmes déjà en base (le seed le complète ensuite par son slug).
INSERT INTO "World" ("id", "slug", "order", "title", "tagline", "description", "theme", "published", "updatedAt")
VALUES (
    'world_origines',
    'origines',
    0,
    'Jardin des Origines',
    'Là où naissent les premiers liens.',
    'Dans AETHER, les choses ne sont pas seulement placées les unes à côté des autres. Elles se répondent.',
    'origines',
    true,
    CURRENT_TIMESTAMP
);

-- Level : les paires deviennent des groupes de 2 (même forme JSON), rattachés au premier monde.
DROP INDEX "Level_published_order_idx";
ALTER TABLE "Level" RENAME COLUMN "pairs" TO "groups";
ALTER TABLE "Level" ADD COLUMN "kind" "LevelKind" NOT NULL DEFAULT 'PAIRS';
ALTER TABLE "Level" ADD COLUMN "worldId" TEXT;
UPDATE "Level" SET "worldId" = 'world_origines';
ALTER TABLE "Level" ALTER COLUMN "worldId" SET NOT NULL;

CREATE INDEX "Level_worldId_published_order_idx" ON "Level"("worldId", "published", "order");
ALTER TABLE "Level" ADD CONSTRAINT "Level_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PlaySession : mêmes indices, nouveau nom.
ALTER TABLE "PlaySession" RENAME COLUMN "foundPairs" TO "foundGroups";
