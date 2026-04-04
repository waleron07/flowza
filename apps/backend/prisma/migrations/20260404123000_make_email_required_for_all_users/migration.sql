-- Backfill NULL emails for legacy rows before NOT NULL constraint.
UPDATE "User"
SET "email" = CONCAT('user_', "id", '@flowza.local')
WHERE "email" IS NULL;

-- AlterTable
ALTER TABLE "User"
ALTER COLUMN "email" SET NOT NULL;
