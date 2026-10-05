-- Sérénité : les étoiles (qui baissaient à chaque erreur) deviennent des pétales d'harmonie
-- qui s'additionnent. Masque : 1 résolue, 2 sans indice, 4 sans fausse piste.

-- Parties : pétales recalculés à partir des essais et indices enregistrés.
ALTER TABLE "PlaySession" ADD COLUMN "petals" INTEGER;
UPDATE "PlaySession"
SET "petals" = 1 + CASE WHEN "hintsUsed" = 0 THEN 2 ELSE 0 END + CASE WHEN "mistakes" = 0 THEN 4 ELSE 0 END
WHERE "completedAt" IS NOT NULL;
ALTER TABLE "PlaySession" DROP COLUMN "stars";

-- Progression : union des pétales de toutes les parties terminées (au moins « résolue »).
ALTER TABLE "LevelProgress" ADD COLUMN "petals" INTEGER NOT NULL DEFAULT 1;
UPDATE "LevelProgress" p
SET "petals" = 1 | COALESCE((
    SELECT bit_or(s."petals") FROM "PlaySession" s
    WHERE s."userId" = p."userId" AND s."levelId" = p."levelId" AND s."completedAt" IS NOT NULL
), 1);
ALTER TABLE "LevelProgress" ALTER COLUMN "petals" DROP DEFAULT;
ALTER TABLE "LevelProgress" DROP COLUMN "bestStars";

-- Énigme du jour : même conversion ; le motif de coups (carrés rouges et verts) n'est plus partagé.
ALTER TABLE "DailyResult" ADD COLUMN "petals" INTEGER NOT NULL DEFAULT 1;
UPDATE "DailyResult"
SET "petals" = 1 + CASE WHEN "hintsUsed" = 0 THEN 2 ELSE 0 END + CASE WHEN "mistakes" = 0 THEN 4 ELSE 0 END;
ALTER TABLE "DailyResult" ALTER COLUMN "petals" DROP DEFAULT;
ALTER TABLE "DailyResult" DROP COLUMN "stars";
ALTER TABLE "DailyResult" DROP COLUMN "pattern";

-- Repères personnels.
CREATE TABLE "Milestone" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("userId","key")
);

ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
