/*
  Warnings:

  - You are about to drop the `MessageTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MessageTemplate" DROP CONSTRAINT "MessageTemplate_weddingId_fkey";

-- DropTable
DROP TABLE "MessageTemplate";
