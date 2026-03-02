ALTER TABLE "apikey" ALTER COLUMN "reference_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "apikey" ALTER COLUMN "config_id" SET NOT NULL;
--> statement-breakpoint
DROP INDEX "apikey_userId_idx";
--> statement-breakpoint
ALTER TABLE "apikey" DROP CONSTRAINT "apikey_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "apikey" DROP COLUMN "user_id";
