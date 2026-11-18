-- CreateEnum
CREATE TYPE "FincaVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "FincaVerification" (
    "id" UUID NOT NULL,
    "fincaId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "status" "FincaVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceUrl" TEXT NOT NULL,
    "note" TEXT,
    "rejectionReason" TEXT,
    "reviewedById" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FincaVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FincaVerification_fincaId_status_idx" ON "FincaVerification"("fincaId", "status");

-- CreateIndex
CREATE INDEX "FincaVerification_requestedById_idx" ON "FincaVerification"("requestedById");

-- CreateIndex
CREATE INDEX "FincaVerification_reviewedById_idx" ON "FincaVerification"("reviewedById");

-- AddForeignKey
ALTER TABLE "FincaVerification" ADD CONSTRAINT "FincaVerification_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FincaVerification" ADD CONSTRAINT "FincaVerification_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FincaVerification" ADD CONSTRAINT "FincaVerification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
