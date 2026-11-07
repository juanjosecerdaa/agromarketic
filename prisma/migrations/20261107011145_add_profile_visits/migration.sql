-- CreateTable
CREATE TABLE "ProfileVisit" (
    "id" UUID NOT NULL,
    "fincaId" UUID NOT NULL,
    "visitorKeyHash" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitDay" DATE NOT NULL,

    CONSTRAINT "ProfileVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileVisit_fincaId_visitedAt_idx" ON "ProfileVisit"("fincaId", "visitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileVisit_fincaId_visitorKeyHash_visitDay_key" ON "ProfileVisit"("fincaId", "visitorKeyHash", "visitDay");

-- AddForeignKey
ALTER TABLE "ProfileVisit" ADD CONSTRAINT "ProfileVisit_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
