-- CreateEnum
CREATE TYPE "SceneType" AS ENUM ('GRAPHIC_BG', 'REAL_BACKDROP');

-- CreateEnum
CREATE TYPE "SceneQcResult" AS ENUM ('PASS', 'MINOR', 'FAIL');

-- CreateTable
CREATE TABLE "task_template_scene_qc_evidence_refs" (
    "id" BIGSERIAL NOT NULL,
    "template_id" BIGINT NOT NULL,
    "snapshot_id" BIGINT NOT NULL,
    "field_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_template_scene_qc_evidence_refs_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "scene_qc_taxonomy_elements" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "applies_to_graphic_bg" BOOLEAN NOT NULL DEFAULT true,
    "applies_to_real_backdrop" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" BIGINT,
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_qc_taxonomy_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_taxonomy_defects" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "element_id" BIGINT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" BIGINT,
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_qc_taxonomy_defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_review_findings" (
    "id" BIGSERIAL NOT NULL,
    "review_id" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "element_id" BIGINT NOT NULL,
    "element_key" TEXT NOT NULL,
    "element_label" TEXT NOT NULL,
    "defect_id" BIGINT NOT NULL,
    "defect_key" TEXT NOT NULL,
    "defect_label" TEXT NOT NULL,
    "related_element_id" BIGINT,
    "related_element_key" TEXT,
    "related_element_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_qc_review_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_review_amendments" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "review_id" BIGINT NOT NULL,
    "revision" INTEGER NOT NULL,
    "result" "SceneQcResult",
    "note" TEXT NOT NULL,
    "created_by_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_qc_review_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_review_amendment_findings" (
    "id" BIGSERIAL NOT NULL,
    "amendment_id" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "element_id" BIGINT NOT NULL,
    "element_key" TEXT NOT NULL,
    "element_label" TEXT NOT NULL,
    "defect_id" BIGINT NOT NULL,
    "defect_key" TEXT NOT NULL,
    "defect_label" TEXT NOT NULL,
    "related_element_id" BIGINT,
    "related_element_key" TEXT,
    "related_element_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_qc_review_amendment_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_audit_targets" (
    "id" BIGSERIAL NOT NULL,
    "audit_id" BIGINT NOT NULL,
    "scene_profile_id" BIGINT,
    "scene_qc_review_id" BIGINT,
    "scene_qc_daily_confirmation_id" BIGINT,

    CONSTRAINT "scene_qc_audit_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_daily_confirmations" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "studio_id" BIGINT NOT NULL,
    "operational_date" DATE NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "confirmed_by_id" BIGINT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_qc_daily_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_daily_confirmation_items" (
    "id" BIGSERIAL NOT NULL,
    "confirmation_id" BIGINT NOT NULL,
    "show_id" BIGINT NOT NULL,
    "review_id" BIGINT NOT NULL,
    "review_version" INTEGER NOT NULL,
    "show_uid" TEXT NOT NULL,
    "show_name" TEXT NOT NULL,
    "scheduled_start_time" TIMESTAMP(3) NOT NULL,
    "client_id" BIGINT NOT NULL,
    "client_uid" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_qc_daily_confirmation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_daily_confirmation_item_platforms" (
    "id" BIGSERIAL NOT NULL,
    "item_id" BIGINT NOT NULL,
    "platform_id" BIGINT,
    "platform_uid" TEXT NOT NULL,
    "platform_name" TEXT NOT NULL,

    CONSTRAINT "scene_qc_daily_confirmation_item_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_template_scene_qc_evidence_refs_template_id_idx" ON "task_template_scene_qc_evidence_refs"("template_id");

-- CreateIndex
CREATE INDEX "task_template_scene_qc_evidence_refs_snapshot_id_idx" ON "task_template_scene_qc_evidence_refs"("snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_template_scene_qc_evidence_refs_snapshot_id_field_key_key" ON "task_template_scene_qc_evidence_refs"("snapshot_id", "field_key");

-- CreateIndex
CREATE UNIQUE INDEX "scene_profiles_uid_key" ON "scene_profiles"("uid");

-- CreateIndex
CREATE INDEX "scene_profiles_deleted_at_idx" ON "scene_profiles"("deleted_at");

-- CreateIndex
CREATE INDEX "scene_profiles_client_id_deleted_at_idx" ON "scene_profiles"("client_id", "deleted_at");

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
CREATE UNIQUE INDEX "scene_qc_taxonomy_elements_uid_key" ON "scene_qc_taxonomy_elements"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_taxonomy_elements_key_key" ON "scene_qc_taxonomy_elements"("key");

-- CreateIndex
CREATE INDEX "scene_qc_taxonomy_elements_retired_at_idx" ON "scene_qc_taxonomy_elements"("retired_at");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_taxonomy_defects_uid_key" ON "scene_qc_taxonomy_defects"("uid");

-- CreateIndex
CREATE INDEX "scene_qc_taxonomy_defects_element_id_retired_at_idx" ON "scene_qc_taxonomy_defects"("element_id", "retired_at");

-- CreateIndex
CREATE INDEX "scene_qc_taxonomy_defects_retired_at_idx" ON "scene_qc_taxonomy_defects"("retired_at");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_taxonomy_defects_element_id_key_key" ON "scene_qc_taxonomy_defects"("element_id", "key");

-- CreateIndex
CREATE INDEX "scene_qc_review_findings_review_id_idx" ON "scene_qc_review_findings"("review_id");

-- CreateIndex
CREATE INDEX "scene_qc_review_findings_element_id_idx" ON "scene_qc_review_findings"("element_id");

-- CreateIndex
CREATE INDEX "scene_qc_review_findings_defect_id_idx" ON "scene_qc_review_findings"("defect_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_review_findings_review_id_sort_order_key" ON "scene_qc_review_findings"("review_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_review_amendments_uid_key" ON "scene_qc_review_amendments"("uid");

-- CreateIndex
CREATE INDEX "scene_qc_review_amendments_review_id_created_at_idx" ON "scene_qc_review_amendments"("review_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_review_amendments_review_id_revision_key" ON "scene_qc_review_amendments"("review_id", "revision");

-- CreateIndex
CREATE INDEX "scene_qc_review_amendment_findings_amendment_id_idx" ON "scene_qc_review_amendment_findings"("amendment_id");

-- CreateIndex
CREATE INDEX "scene_qc_review_amendment_findings_element_id_idx" ON "scene_qc_review_amendment_findings"("element_id");

-- CreateIndex
CREATE INDEX "scene_qc_review_amendment_findings_defect_id_idx" ON "scene_qc_review_amendment_findings"("defect_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_review_amendment_findings_amendment_id_sort_order_key" ON "scene_qc_review_amendment_findings"("amendment_id", "sort_order");

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_audit_id_idx" ON "scene_qc_audit_targets"("audit_id");

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_scene_profile_id_idx" ON "scene_qc_audit_targets"("scene_profile_id");

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_scene_qc_review_id_idx" ON "scene_qc_audit_targets"("scene_qc_review_id");

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_scene_qc_daily_confirmation_id_idx" ON "scene_qc_audit_targets"("scene_qc_daily_confirmation_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_daily_confirmations_uid_key" ON "scene_qc_daily_confirmations"("uid");

-- CreateIndex
CREATE INDEX "scene_qc_daily_confirmations_uid_idx" ON "scene_qc_daily_confirmations"("uid");

-- CreateIndex
CREATE INDEX "scene_qc_daily_confirmations_studio_id_operational_date_idx" ON "scene_qc_daily_confirmations"("studio_id", "operational_date");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_daily_confirmations_studio_id_operational_date_rev_key" ON "scene_qc_daily_confirmations"("studio_id", "operational_date", "revision");

-- CreateIndex
CREATE INDEX "scene_qc_daily_confirmation_items_confirmation_id_idx" ON "scene_qc_daily_confirmation_items"("confirmation_id");

-- CreateIndex
CREATE INDEX "scene_qc_daily_confirmation_items_show_id_idx" ON "scene_qc_daily_confirmation_items"("show_id");

-- CreateIndex
CREATE INDEX "scene_qc_daily_confirmation_items_review_id_idx" ON "scene_qc_daily_confirmation_items"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_daily_confirmation_items_confirmation_id_show_id_key" ON "scene_qc_daily_confirmation_items"("confirmation_id", "show_id");

-- CreateIndex
CREATE INDEX "scene_qc_daily_confirmation_item_platforms_item_id_idx" ON "scene_qc_daily_confirmation_item_platforms"("item_id");

-- CreateIndex
CREATE INDEX "scene_qc_daily_confirmation_item_platforms_platform_id_idx" ON "scene_qc_daily_confirmation_item_platforms"("platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_qc_daily_confirmation_item_platforms_item_id_platform_key" ON "scene_qc_daily_confirmation_item_platforms"("item_id", "platform_uid");

-- AddForeignKey
ALTER TABLE "task_template_scene_qc_evidence_refs" ADD CONSTRAINT "task_template_scene_qc_evidence_refs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_template_scene_qc_evidence_refs" ADD CONSTRAINT "task_template_scene_qc_evidence_refs_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "task_template_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_profiles" ADD CONSTRAINT "scene_profiles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_reviews" ADD CONSTRAINT "scene_qc_reviews_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_reviews" ADD CONSTRAINT "scene_qc_reviews_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_evidence" ADD CONSTRAINT "scene_qc_review_evidence_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "scene_qc_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_evidence" ADD CONSTRAINT "scene_qc_review_evidence_source_task_id_fkey" FOREIGN KEY ("source_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_taxonomy_elements" ADD CONSTRAINT "scene_qc_taxonomy_elements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_taxonomy_defects" ADD CONSTRAINT "scene_qc_taxonomy_defects_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "scene_qc_taxonomy_elements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_taxonomy_defects" ADD CONSTRAINT "scene_qc_taxonomy_defects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_findings" ADD CONSTRAINT "scene_qc_review_findings_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "scene_qc_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_findings" ADD CONSTRAINT "scene_qc_review_findings_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "scene_qc_taxonomy_elements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_findings" ADD CONSTRAINT "scene_qc_review_findings_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "scene_qc_taxonomy_defects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_findings" ADD CONSTRAINT "scene_qc_review_findings_related_element_id_fkey" FOREIGN KEY ("related_element_id") REFERENCES "scene_qc_taxonomy_elements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_amendments" ADD CONSTRAINT "scene_qc_review_amendments_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "scene_qc_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_amendments" ADD CONSTRAINT "scene_qc_review_amendments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_amendment_findings" ADD CONSTRAINT "scene_qc_review_amendment_findings_amendment_id_fkey" FOREIGN KEY ("amendment_id") REFERENCES "scene_qc_review_amendments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_amendment_findings" ADD CONSTRAINT "scene_qc_review_amendment_findings_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "scene_qc_taxonomy_elements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_amendment_findings" ADD CONSTRAINT "scene_qc_review_amendment_findings_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "scene_qc_taxonomy_defects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_review_amendment_findings" ADD CONSTRAINT "scene_qc_review_amendment_findings_related_element_id_fkey" FOREIGN KEY ("related_element_id") REFERENCES "scene_qc_taxonomy_elements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_scene_profile_id_fkey" FOREIGN KEY ("scene_profile_id") REFERENCES "scene_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_scene_qc_review_id_fkey" FOREIGN KEY ("scene_qc_review_id") REFERENCES "scene_qc_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_scene_qc_daily_confirmation_id_fkey" FOREIGN KEY ("scene_qc_daily_confirmation_id") REFERENCES "scene_qc_daily_confirmations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_daily_confirmations" ADD CONSTRAINT "scene_qc_daily_confirmations_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_daily_confirmations" ADD CONSTRAINT "scene_qc_daily_confirmations_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_daily_confirmation_items" ADD CONSTRAINT "scene_qc_daily_confirmation_items_confirmation_id_fkey" FOREIGN KEY ("confirmation_id") REFERENCES "scene_qc_daily_confirmations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_daily_confirmation_items" ADD CONSTRAINT "scene_qc_daily_confirmation_items_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_daily_confirmation_items" ADD CONSTRAINT "scene_qc_daily_confirmation_items_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "scene_qc_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_daily_confirmation_items" ADD CONSTRAINT "scene_qc_daily_confirmation_items_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_daily_confirmation_item_platforms" ADD CONSTRAINT "scene_qc_daily_confirmation_item_platforms_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "scene_qc_daily_confirmation_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_daily_confirmation_item_platforms" ADD CONSTRAINT "scene_qc_daily_confirmation_item_platforms_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CUSTOM SQL START: soft-delete uniqueness, audit integrity, and built-in taxonomy
-- Prisma cannot express a partial unique index. Retiring a Scene Profile frees
-- the Client to create a replacement while preserving the historical row.
CREATE UNIQUE INDEX "scene_profiles_active_client_key"
    ON "scene_profiles" ("client_id")
    WHERE "deleted_at" IS NULL;

-- Every Scene QC audit envelope must point at exactly one capability target.
ALTER TABLE "scene_qc_audit_targets"
    ADD CONSTRAINT "scene_qc_audit_targets_single_target_check"
    CHECK (
      num_nonnulls(
        "scene_profile_id",
        "scene_qc_review_id",
        "scene_qc_daily_confirmation_id"
      ) = 1
    );

INSERT INTO "scene_qc_taxonomy_elements" (
  "uid",
  "key",
  "label",
  "applies_to_graphic_bg",
  "applies_to_real_backdrop",
  "is_system"
)
VALUES
  ('scqce_system_backdrop', 'backdrop', 'Backdrop (Real Set)', false, true, true),
  ('scqce_system_bg', 'bg', 'Background (Graphic)', true, false, true),
  ('scqce_system_fg_table', 'fg_table', 'Foreground — Product Table', true, true, true),
  ('scqce_system_fg_header', 'fg_header', 'Foreground — Header/Decoration', false, true, true),
  ('scqce_system_sticker', 'sticker', 'Sticker', true, true, true),
  ('scqce_system_mc', 'mc', 'MC Positioning', true, true, true),
  ('scqce_system_camera', 'camera', 'Camera Framing', true, true, true),
  ('scqce_system_lighting', 'lighting', 'Lighting', true, true, true),
  ('scqce_system_tech', 'tech', 'Technical Quality', true, true, true);

WITH built_in_defects ("element_key", "defect_key", "label") AS (
  VALUES
    ('bg', 'wrong_date', 'Wrong Date'),
    ('backdrop', 'wrong_date', 'Wrong Date'),
    ('fg_table', 'wrong_date', 'Wrong Date'),
    ('fg_header', 'wrong_date', 'Wrong Date'),
    ('sticker', 'wrong_date', 'Wrong Date'),
    ('bg', 'missing_incomplete', 'Missing / Incomplete'),
    ('backdrop', 'missing_incomplete', 'Missing / Incomplete'),
    ('fg_table', 'missing_incomplete', 'Missing / Incomplete'),
    ('fg_header', 'missing_incomplete', 'Missing / Incomplete'),
    ('sticker', 'missing_incomplete', 'Missing / Incomplete'),
    ('bg', 'misaligned', 'Misaligned / Crooked'),
    ('backdrop', 'misaligned', 'Misaligned / Crooked'),
    ('fg_table', 'misaligned', 'Misaligned / Crooked'),
    ('fg_header', 'misaligned', 'Misaligned / Crooked'),
    ('sticker', 'misaligned', 'Misaligned / Crooked'),
    ('mc', 'misaligned', 'Misaligned / Crooked'),
    ('camera', 'misaligned', 'Misaligned / Crooked'),
    ('fg_table', 'too_small', 'Too Small'),
    ('fg_header', 'too_small', 'Too Small'),
    ('sticker', 'too_small', 'Too Small'),
    ('mc', 'too_small', 'Too Small'),
    ('fg_table', 'too_big', 'Too Big'),
    ('fg_header', 'too_big', 'Too Big'),
    ('sticker', 'too_big', 'Too Big'),
    ('mc', 'too_big', 'Too Big'),
    ('mc', 'off_center', 'Off Center'),
    ('camera', 'off_center', 'Off Center'),
    ('fg_header', 'off_center', 'Off Center'),
    ('mc', 'tilted_left', 'Tilted Left'),
    ('camera', 'tilted_left', 'Tilted Left'),
    ('fg_header', 'tilted_left', 'Tilted Left'),
    ('mc', 'tilted_right', 'Tilted Right'),
    ('camera', 'tilted_right', 'Tilted Right'),
    ('fg_header', 'tilted_right', 'Tilted Right'),
    ('fg_table', 'overlap', 'Overlaps Another Element'),
    ('fg_header', 'overlap', 'Overlaps Another Element'),
    ('sticker', 'overlap', 'Overlaps Another Element'),
    ('mc', 'overlap', 'Overlaps Another Element'),
    ('bg', 'wrong_content', 'Wrong Content / Logo / Text'),
    ('backdrop', 'wrong_content', 'Wrong Content / Logo / Text'),
    ('fg_table', 'wrong_content', 'Wrong Content / Logo / Text'),
    ('fg_header', 'wrong_content', 'Wrong Content / Logo / Text'),
    ('sticker', 'wrong_content', 'Wrong Content / Logo / Text'),
    ('tech', 'blurry', 'Blurry'),
    ('camera', 'blurry', 'Blurry'),
    ('tech', 'not_focused', 'Not Focused'),
    ('camera', 'not_focused', 'Not Focused'),
    ('tech', 'color_off', 'Color Off'),
    ('lighting', 'color_off', 'Color Off'),
    ('lighting', 'too_bright', 'Too Bright'),
    ('tech', 'too_bright', 'Too Bright'),
    ('lighting', 'too_dark', 'Too Dark'),
    ('tech', 'too_dark', 'Too Dark'),
    ('tech', 'compression_artifact', 'Compression Artifact'),
    ('tech', 'chroma_spill', 'Chroma Spill / Green Edge'),
    ('backdrop', 'chroma_spill', 'Chroma Spill / Green Edge')
)
INSERT INTO "scene_qc_taxonomy_defects" (
  "uid",
  "element_id",
  "key",
  "label",
  "is_system"
)
SELECT
  'scqcd_system_' || built_in_defects."element_key" || '_' || built_in_defects."defect_key",
  elements."id",
  built_in_defects."defect_key",
  built_in_defects."label",
  true
FROM built_in_defects
INNER JOIN "scene_qc_taxonomy_elements" elements
  ON elements."key" = built_in_defects."element_key";
-- CUSTOM SQL END
