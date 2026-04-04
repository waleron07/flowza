-- Drop optional lastName field from User.
ALTER TABLE "User"
DROP COLUMN IF EXISTS "lastName";
