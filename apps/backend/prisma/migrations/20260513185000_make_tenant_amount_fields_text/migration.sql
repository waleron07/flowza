ALTER TABLE "Tenant"
ALTER COLUMN "deliveryFee" DROP DEFAULT,
ALTER COLUMN "deliveryFee" TYPE TEXT USING "deliveryFee"::text,
ALTER COLUMN "deliveryFee" SET DEFAULT '',
ALTER COLUMN "minOrderAmount" DROP DEFAULT,
ALTER COLUMN "minOrderAmount" TYPE TEXT USING "minOrderAmount"::text,
ALTER COLUMN "minOrderAmount" SET DEFAULT '';
