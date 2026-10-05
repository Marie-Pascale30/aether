-- Énigme du jour : réserve (World.isDaily), tirage quotidien et premières victoires.
-- AlterTable
ALTER TABLE "World" ADD COLUMN     "isDaily" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "date" DATE NOT NULL,
    "levelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "DailyResult" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "mistakes" INTEGER NOT NULL,
    "hintsUsed" INTEGER NOT NULL,
    "pattern" BOOLEAN[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyResult_pkey" PRIMARY KEY ("userId","date")
);

-- CreateIndex
CREATE INDEX "DailyChallenge_levelId_date_idx" ON "DailyChallenge"("levelId", "date");

-- CreateIndex
CREATE INDEX "DailyResult_date_idx" ON "DailyResult"("date");

-- AddForeignKey
ALTER TABLE "DailyChallenge" ADD CONSTRAINT "DailyChallenge_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyResult" ADD CONSTRAINT "DailyResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyResult" ADD CONSTRAINT "DailyResult_date_fkey" FOREIGN KEY ("date") REFERENCES "DailyChallenge"("date") ON DELETE CASCADE ON UPDATE CASCADE;
