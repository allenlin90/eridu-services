ALTER TABLE "apikey" ADD COLUMN "reference_id" text;
--> statement-breakpoint
UPDATE "apikey" SET "reference_id" = "user_id";
--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "config_id" text DEFAULT 'default';
