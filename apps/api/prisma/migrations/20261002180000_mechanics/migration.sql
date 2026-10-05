-- Mécaniques jouées sur l'appareil (Mémoires, Rouages, Flux, Échos).
-- CreateEnum
CREATE TYPE "Mechanic" AS ENUM ('LINKS', 'MEMORY', 'GEARS', 'FLOW', 'ECHOES');

-- AlterTable
ALTER TABLE "Level" ADD COLUMN     "mechanic" "Mechanic" NOT NULL DEFAULT 'LINKS',
ADD COLUMN     "puzzle" JSONB;
