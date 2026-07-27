-- CreateEnum
CREATE TYPE "SceneType" AS ENUM ('GRAPHIC_BG', 'REAL_BACKDROP');

-- CreateTable
CREATE TABLE "scene_profiles" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "client_id" BIGINT NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "scene_type" "SceneType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "scene_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_audit_targets" (
    "id" BIGSERIAL NOT NULL,
    "audit_id" BIGINT NOT NULL,
    "scene_profile_id" BIGINT,

    CONSTRAINT "scene_qc_audit_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scene_profiles_uid_key" ON "scene_profiles"("uid");

-- CreateIndex
CREATE INDEX "scene_profiles_deleted_at_idx" ON "scene_profiles"("deleted_at");

-- CreateIndex
CREATE INDEX "scene_profiles_client_id_deleted_at_idx" ON "scene_profiles"("client_id", "deleted_at");

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_scene_profile_id_idx" ON "scene_qc_audit_targets"("scene_profile_id");

-- AddForeignKey
ALTER TABLE "scene_profiles" ADD CONSTRAINT "scene_profiles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_scene_profile_id_fkey" FOREIGN KEY ("scene_profile_id") REFERENCES "scene_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CUSTOM SQL START: soft-delete-aware Scene Profile uniqueness and single-target audit rule
-- Rationale: Prisma expresses neither partial unique indexes nor CHECK constraints.
-- One non-deleted Scene Profile per Client. Retire-then-recreate stays legal
-- because a soft-deleted row leaves the index.
CREATE UNIQUE INDEX "scene_profiles_active_client_key"
    ON "scene_profiles" ("client_id")
    WHERE "deleted_at" IS NULL;

-- Exactly one typed target FK per Scene QC audit junction row. When a later
-- child PR adds `scene_qc_review_id` / `scene_qc_daily_confirmation_id`, drop
-- and re-add this constraint with the widened column list in that migration.
ALTER TABLE "scene_qc_audit_targets"
    ADD CONSTRAINT "scene_qc_audit_targets_single_target_check"
    CHECK (num_nonnulls("scene_profile_id") = 1);
-- CUSTOM SQL END
