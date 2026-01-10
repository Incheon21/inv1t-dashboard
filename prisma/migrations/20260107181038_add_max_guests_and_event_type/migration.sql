-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "eventType" TEXT,
ADD COLUMN     "isOnlyPemberkatan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxGuests" INTEGER NOT NULL DEFAULT 1;
