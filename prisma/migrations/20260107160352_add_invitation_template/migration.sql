-- CreateTable
CREATE TABLE "InvitationTemplate" (
    "id" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weddingId" TEXT NOT NULL,

    CONSTRAINT "InvitationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitationTemplate_weddingId_key" ON "InvitationTemplate"("weddingId");

-- CreateIndex
CREATE INDEX "InvitationTemplate_weddingId_idx" ON "InvitationTemplate"("weddingId");

-- AddForeignKey
ALTER TABLE "InvitationTemplate" ADD CONSTRAINT "InvitationTemplate_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
