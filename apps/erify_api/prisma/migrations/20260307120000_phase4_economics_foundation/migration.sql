-- Phase 4 rollout: MC compensation + show platform performance metrics

-- AlterTable: add compensation fields to mcs
ALTER TABLE "mcs"
  ADD COLUMN "default_rate" DECIMAL(10,2),
  ADD COLUMN "default_rate_type" VARCHAR,
  ADD COLUMN "default_commission_rate" DECIMAL(10,2);

-- AlterTable: add compensation fields to show_mcs
ALTER TABLE "show_mcs"
  ADD COLUMN "agreed_rate" DECIMAL(10,2),
  ADD COLUMN "compensation_type" VARCHAR,
  ADD COLUMN "commission_rate" DECIMAL(10,2);

-- AlterTable: add performance metrics to show_platforms
ALTER TABLE "show_platforms"
  ADD COLUMN "gmv" DECIMAL(14,2),
  ADD COLUMN "sales" DECIMAL(14,2),
  ADD COLUMN "orders" INTEGER;

-- CreateTable: studio_mcs (studio-scoped talent roster)
CREATE TABLE "studio_mcs" (
  "id" BIGSERIAL NOT NULL,
  "uid" TEXT NOT NULL,
  "studio_id" BIGINT NOT NULL,
  "mc_id" BIGINT NOT NULL,
  "default_rate" DECIMAL(10,2),
  "default_rate_type" TEXT,
  "default_commission_rate" DECIMAL(10,2),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "studio_mcs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_mcs_uid_key" ON "studio_mcs"("uid");
CREATE UNIQUE INDEX "studio_mcs_studio_id_mc_id_key" ON "studio_mcs"("studio_id", "mc_id");
CREATE INDEX "studio_mcs_studio_id_deleted_at_idx" ON "studio_mcs"("studio_id", "deleted_at");
CREATE INDEX "studio_mcs_mc_id_deleted_at_idx" ON "studio_mcs"("mc_id", "deleted_at");

ALTER TABLE "studio_mcs"
  ADD CONSTRAINT "studio_mcs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_mcs"
  ADD CONSTRAINT "studio_mcs_mc_id_fkey" FOREIGN KEY ("mc_id") REFERENCES "mcs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CUSTOM SQL START: Backfill studio_mcs from historical show_mcs assignments
-- Prisma migrate cannot express data backfill in schema DSL.
-- Copy global MC defaults to studio-scoped defaults as initial parity baseline.
INSERT INTO "studio_mcs" (
  "uid",
  "studio_id",
  "mc_id",
  "default_rate",
  "default_rate_type",
  "default_commission_rate",
  "is_active",
  "metadata"
)
SELECT
  'smc_' || lpad(row_number() OVER (ORDER BY pairs.studio_id, pairs.mc_id)::text, 20, '0') AS "uid",
  pairs.studio_id,
  pairs.mc_id,
  mc.default_rate,
  mc.default_rate_type,
  mc.default_commission_rate,
  true AS "is_active",
  '{}'::jsonb AS "metadata"
FROM (
  SELECT DISTINCT
    s.studio_id,
    sm.mc_id
  FROM "show_mcs" sm
  INNER JOIN "shows" s ON s.id = sm.show_id
  WHERE sm.deleted_at IS NULL
    AND s.deleted_at IS NULL
    AND s.studio_id IS NOT NULL
) pairs
INNER JOIN "mcs" mc ON mc.id = pairs.mc_id
ON CONFLICT ("studio_id", "mc_id") DO NOTHING;
-- CUSTOM SQL END
