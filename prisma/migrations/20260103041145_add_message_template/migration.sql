/*
  Warnings:

  - The values [ATTENDING,NOT_ATTENDING] on the enum `RSVPStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[weddingId,phone]` on the table `Guest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RSVPStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');
ALTER TABLE "Guest" ALTER COLUMN "rsvpStatus" DROP DEFAULT;
ALTER TABLE "Guest" ALTER COLUMN "rsvpStatus" TYPE "RSVPStatus_new" USING ("rsvpStatus"::text::"RSVPStatus_new");
ALTER TYPE "RSVPStatus" RENAME TO "RSVPStatus_old";
ALTER TYPE "RSVPStatus_new" RENAME TO "RSVPStatus";
DROP TYPE "RSVPStatus_old";
ALTER TABLE "Guest" ALTER COLUMN "rsvpStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "rsvpAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weddingId" TEXT NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_weddingId_key" ON "MessageTemplate"("weddingId");

-- CreateIndex
CREATE INDEX "MessageTemplate_weddingId_idx" ON "MessageTemplate"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_weddingId_phone_key" ON "Guest"("weddingId", "phone");

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
