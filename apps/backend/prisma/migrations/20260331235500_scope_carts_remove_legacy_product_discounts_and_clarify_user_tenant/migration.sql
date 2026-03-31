-- Clarify User primary tenant semantics
ALTER TABLE "User" RENAME COLUMN "tenantId" TO "primaryTenantId";
ALTER INDEX "User_tenantId_idx" RENAME TO "User_primaryTenantId_idx";
ALTER TABLE "User" RENAME CONSTRAINT "User_tenantId_fkey" TO "User_primaryTenantId_fkey";

-- Remove legacy product discount columns
ALTER TABLE "Product"
DROP COLUMN "discountAll",
DROP COLUMN "discountStaff",
DROP COLUMN "discountDay",
DROP COLUMN "discountWeek",
DROP COLUMN "discountMonth";

-- Scope carts by tenant
DROP INDEX "Cart_userId_key";

ALTER TABLE "Cart"
ADD COLUMN "tenantId" INTEGER NOT NULL;

CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");
CREATE INDEX "Cart_tenantId_idx" ON "Cart"("tenantId");
CREATE UNIQUE INDEX "Cart_userId_tenantId_key" ON "Cart"("userId", "tenantId");

ALTER TABLE "Cart" ADD CONSTRAINT "Cart_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Snapshot modifier name in cart
ALTER TABLE "CartItemModifier"
ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
