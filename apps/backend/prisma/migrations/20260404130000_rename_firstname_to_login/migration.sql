-- Rename column firstName -> login for all users.
ALTER TABLE "User"
RENAME COLUMN "firstName" TO "login";

-- Ensure login is unique across users.
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
