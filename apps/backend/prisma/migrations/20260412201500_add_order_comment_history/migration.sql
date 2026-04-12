CREATE TABLE "OrderComment" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "authorId" INTEGER,
  "comment" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderComment_orderId_idx" ON "OrderComment"("orderId");
CREATE INDEX "OrderComment_authorId_idx" ON "OrderComment"("authorId");
CREATE INDEX "OrderComment_orderId_createdAt_idx" ON "OrderComment"("orderId", "createdAt");

ALTER TABLE "OrderComment"
ADD CONSTRAINT "OrderComment_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderComment"
ADD CONSTRAINT "OrderComment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;