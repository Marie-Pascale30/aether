-- Hors ligne : toutes les mécaniques se jouent sur l'appareil, qui envoie le résultat une fois la
-- partie résolue. Les parties ouvertes côté serveur (Liens coup par coup) disparaissent.
DELETE FROM "PlaySession" WHERE "completedAt" IS NULL;
ALTER TABLE "PlaySession" DROP COLUMN "foundGroups";

-- Identifiant choisi par l'appareil : rend l'envoi d'un résultat idempotent.
ALTER TABLE "PlaySession" ADD COLUMN "clientResultId" TEXT;
CREATE UNIQUE INDEX "PlaySession_clientResultId_key" ON "PlaySession"("clientResultId");
