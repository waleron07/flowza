-- CreateTable
CREATE TABLE "UserTenantAccess" (
    "userId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTenantAccess_pkey" PRIMARY KEY ("userId","tenantId")
);

-- CreateIndex
CREATE INDEX "UserTenantAccess_tenantId_idx" ON "UserTenantAccess"("tenantId");

-- AddForeignKey
ALTER TABLE "UserTenantAccess" ADD CONSTRAINT "UserTenantAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenantAccess" ADD CONSTRAINT "UserTenantAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing single-tenant staff links into the new join table
INSERT INTO "UserTenantAccess" ("userId", "tenantId")
SELECT "id", "tenantId"
FROM "User"
WHERE "tenantId" IS NOT NULL
ON CONFLICT ("userId", "tenantId") DO NOTHING;
