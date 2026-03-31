-- AlterTable
ALTER TABLE "User"
ADD COLUMN "avatarId" INTEGER;

-- CreateIndex
CREATE INDEX "User_avatarId_idx" ON "User"("avatarId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
