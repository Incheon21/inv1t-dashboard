/*
  Warnings:

  - A unique constraint covering the columns `[invitationCode]` on the table `Guest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "invitationCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Guest_invitationCode_key" ON "Guest"("invitationCode");

-- CreateIndex
CREATE INDEX "Guest_invitationCode_idx" ON "Guest"("invitationCode");
