/*
  Prisma CLI generated this migration directory.
  Manual SQL is applied only where Prisma cannot express non-destructive table renames.
*/

-- CUSTOM SQL START: non-destructive MC->creator table/index/constraint renames
-- Rationale: preserve existing data and references while aligning naming to creator terminology.
ALTER TABLE "mcs" RENAME TO "creators";
ALTER TABLE "show_mcs" RENAME TO "show_creators";

ALTER TABLE "creators" RENAME CONSTRAINT "mcs_pkey" TO "creators_pkey";
ALTER TABLE "show_creators" RENAME CONSTRAINT "show_mcs_pkey" TO "show_creators_pkey";

ALTER TABLE "creators" RENAME CONSTRAINT "mcs_user_id_fkey" TO "creators_user_id_fkey";
ALTER TABLE "show_creators" RENAME CONSTRAINT "show_mcs_show_id_fkey" TO "show_creators_show_id_fkey";
ALTER TABLE "show_creators" RENAME CONSTRAINT "show_mcs_mc_id_fkey" TO "show_creators_mc_id_fkey";

ALTER INDEX "mcs_uid_key" RENAME TO "creators_uid_key";
ALTER INDEX "mcs_user_id_key" RENAME TO "creators_user_id_key";
ALTER INDEX "mcs_uid_idx" RENAME TO "creators_uid_idx";
ALTER INDEX "mcs_user_id_idx" RENAME TO "creators_user_id_idx";
ALTER INDEX "mcs_name_idx" RENAME TO "creators_name_idx";
ALTER INDEX "mcs_alias_name_idx" RENAME TO "creators_alias_name_idx";
ALTER INDEX "mcs_is_banned_idx" RENAME TO "creators_is_banned_idx";
ALTER INDEX "mcs_deleted_at_idx" RENAME TO "creators_deleted_at_idx";

ALTER INDEX "show_mcs_uid_key" RENAME TO "show_creators_uid_key";
ALTER INDEX "show_mcs_uid_idx" RENAME TO "show_creators_uid_idx";
ALTER INDEX "show_mcs_show_id_idx" RENAME TO "show_creators_show_id_idx";
ALTER INDEX "show_mcs_mc_id_idx" RENAME TO "show_creators_mc_id_idx";
ALTER INDEX "show_mcs_deleted_at_idx" RENAME TO "show_creators_deleted_at_idx";
ALTER INDEX "show_mcs_show_id_deleted_at_idx" RENAME TO "show_creators_show_id_deleted_at_idx";
ALTER INDEX "show_mcs_mc_id_deleted_at_idx" RENAME TO "show_creators_mc_id_deleted_at_idx";
ALTER INDEX "show_mcs_mc_id_show_id_deleted_at_idx" RENAME TO "show_creators_mc_id_show_id_deleted_at_idx";
ALTER INDEX "show_mcs_show_id_mc_id_key" RENAME TO "show_creators_show_id_mc_id_key";
-- CUSTOM SQL END

-- AlterTable
ALTER TABLE "creators"
  ADD COLUMN "default_rate" DECIMAL(10,2),
  ADD COLUMN "default_rate_type" TEXT,
  ADD COLUMN "default_commission_rate" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "show_creators"
  ADD COLUMN "agreed_rate" DECIMAL(10,2),
  ADD COLUMN "compensation_type" TEXT,
  ADD COLUMN "commission_rate" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "studio_creators" (
  "id" BIGSERIAL NOT NULL,
  "uid" TEXT NOT NULL,
  "studio_id" BIGINT NOT NULL,
  "mc_id" BIGINT NOT NULL,
  "default_rate" DECIMAL(10,2),
  "default_rate_type" TEXT,
  "default_commission_rate" DECIMAL(10,2),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "studio_creators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_creators_uid_key" ON "studio_creators"("uid");

-- CreateIndex
CREATE INDEX "studio_creators_studio_id_deleted_at_idx" ON "studio_creators"("studio_id", "deleted_at");

-- CreateIndex
CREATE INDEX "studio_creators_mc_id_deleted_at_idx" ON "studio_creators"("mc_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "studio_creators_studio_id_mc_id_key" ON "studio_creators"("studio_id", "mc_id");

-- AddForeignKey
ALTER TABLE "studio_creators"
  ADD CONSTRAINT "studio_creators_studio_id_fkey"
  FOREIGN KEY ("studio_id") REFERENCES "studios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_creators"
  ADD CONSTRAINT "studio_creators_mc_id_fkey"
  FOREIGN KEY ("mc_id") REFERENCES "creators"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Studio creator roster bootstrap intentionally runs via operational script:
-- `pnpm --filter erify_api db:studio-creator:backfill`
-- Rationale: requires dry-run/operator-controlled execution during rollout.
