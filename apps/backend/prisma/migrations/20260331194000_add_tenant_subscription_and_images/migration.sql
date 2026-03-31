-- AlterTable
ALTER TABLE "Tenant"
ADD COLUMN "subscription" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tenantMainId" INTEGER,
    "tenantAdditionalId" INTEGER,
    "categoryMainId" INTEGER,
    "categoryAdditionalId" INTEGER,
    "productMainId" INTEGER,
    "productAdditionalId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Image_tenantMainId_idx" ON "Image"("tenantMainId");
CREATE INDEX "Image_tenantAdditionalId_idx" ON "Image"("tenantAdditionalId");
CREATE INDEX "Image_categoryMainId_idx" ON "Image"("categoryMainId");
CREATE INDEX "Image_categoryAdditionalId_idx" ON "Image"("categoryAdditionalId");
CREATE INDEX "Image_productMainId_idx" ON "Image"("productMainId");
CREATE INDEX "Image_productAdditionalId_idx" ON "Image"("productAdditionalId");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_tenantMainId_fkey" FOREIGN KEY ("tenantMainId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Image" ADD CONSTRAINT "Image_tenantAdditionalId_fkey" FOREIGN KEY ("tenantAdditionalId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Image" ADD CONSTRAINT "Image_categoryMainId_fkey" FOREIGN KEY ("categoryMainId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Image" ADD CONSTRAINT "Image_categoryAdditionalId_fkey" FOREIGN KEY ("categoryAdditionalId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Image" ADD CONSTRAINT "Image_productMainId_fkey" FOREIGN KEY ("productMainId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Image" ADD CONSTRAINT "Image_productAdditionalId_fkey" FOREIGN KEY ("productAdditionalId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
