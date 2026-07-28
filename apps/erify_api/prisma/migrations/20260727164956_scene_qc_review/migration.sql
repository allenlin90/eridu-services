-- CreateEnum
CREATE TYPE "SceneQcResult" AS ENUM ('PASS', 'MINOR', 'FAIL');

-- NOTE: `prisma migrate dev` also generated a
-- `DROP INDEX "scene_profiles_active_client_key"` statement here. That
-- partial unique index (`scene_qc_foundation` migration) is invisible to
-- Prisma's introspection, so every future `migrate dev` will propose dropping
-- it again. Deleted intentionally -- see SceneProfile's schema.prisma comment
-- and SCENE_QC_CHILD_PR_3_BREAKDOWN.md section 1.1.5.

-- AlterTable
ALTER TABLE "scene_qc_audit_targets" ADD COLUMN     "scene_qc_review_id" BIGINT;

-- CreateTable
CREATE TABLE "scene_qc_reviews" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "show_id" BIGINT NOT NULL,
    "operational_date" DATE NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "result" "SceneQcResult" NOT NULL,
    "feedback" TEXT,
    "reviewed_by_id" BIGINT NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL,
    "expected_object_key" TEXT,
    "expected_file_url" TEXT,
    "expected_scene_type" "SceneType",
    "version" INTEGER NOT NULL DEFAULT 1,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_qc_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_review_evidence" (
    "id" BIGSERIAL NOT NULL,
    "review_id" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "source_task_id" BIGINT,
    "source_task_uid" TEXT NOT NULL,
    "source_task_version" INTEGER NOT NULL,
    "source_field_key" TEXT NOT NULL,
    "source_label" TEXT NOT NULL,
    "object_key" TEXT,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_qc_review_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_reviews_uid_key" ON "scene_qc_reviews"("uid");

-- CreateIndex
CREATE INDEX "scene_qc_reviews_uid_idx" ON "scene_qc_reviews"("uid");

-- CreateIndex
CREATE INDEX "scene_qc_reviews_operational_date_idx" ON "scene_qc_reviews"("operational_date");

-- CreateIndex
CREATE INDEX "scene_qc_reviews_show_id_idx" ON "scene_qc_reviews"("show_id");

-- CreateIndex
CREATE INDEX "scene_qc_reviews_confirmed_at_idx" ON "scene_qc_reviews"("confirmed_at");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_reviews_show_id_operational_date_key" ON "scene_qc_reviews"("show_id", "operational_date");

-- CreateIndex
CREATE INDEX "scene_qc_review_evidence_review_id_idx" ON "scene_qc_review_evidence"("review_id");

-- CreateIndex
CREATE INDEX "scene_qc_review_evidence_source_task_id_idx" ON "scene_qc_review_evidence"("source_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_review_evidence_review_id_sort_order_key" ON "scene_qc_review_evidence"("review_id", "sort_order");

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_scene_qc_review_id_idx" ON "scene_qc_audit_targets"("scene_qc_review_id");

-- AddForeignKey
ALTER TABLE "scene_qc_reviews" ADD CONSTRAINT "scene_qc_reviews_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_reviews" ADD CONSTRAINT "scene_qc_reviews_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_evidence" ADD CONSTRAINT "scene_qc_review_evidence_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "scene_qc_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_evidence" ADD CONSTRAINT "scene_qc_review_evidence_source_task_id_fkey" FOREIGN KEY ("source_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_scene_qc_review_id_fkey" FOREIGN KEY ("scene_qc_review_id") REFERENCES "scene_qc_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CUSTOM SQL START: widen the single-target rule for Scene QC review audits
ALTER TABLE "scene_qc_audit_targets"
    DROP CONSTRAINT "scene_qc_audit_targets_single_target_check";

ALTER TABLE "scene_qc_audit_targets"
    ADD CONSTRAINT "scene_qc_audit_targets_single_target_check"
    CHECK (num_nonnulls("scene_profile_id", "scene_qc_review_id") = 1);
-- CUSTOM SQL END
