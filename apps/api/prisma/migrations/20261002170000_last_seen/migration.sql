-- Dernière activité des joueurs (nettoyage des invités inactifs).
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "User_isGuest_lastSeenAt_idx" ON "User"("isGuest", "lastSeenAt");
