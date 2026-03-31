-- AlterTable Tenant
ALTER TABLE "Tenant"
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- AlterTable Address
ALTER TABLE "Address"
ADD COLUMN "label" TEXT;

-- AlterTable Modifier
ALTER TABLE "Modifier"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable ModifierGroup
ALTER TABLE "ModifierGroup"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Discount
ALTER TABLE "Discount"
ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

-- AlterTable PromoCode / Order relation
ALTER TABLE "Order"
ADD COLUMN "promoCodeId" INTEGER,
ADD COLUMN "orderNumber" TEXT NOT NULL;

CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_promoCodeId_idx" ON "Order"("promoCodeId");
CREATE INDEX "Order_tenantId_createdAt_idx" ON "Order"("tenantId", "createdAt");

ALTER TABLE "Order" ADD CONSTRAINT "Order_promoCodeId_fkey"
FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
