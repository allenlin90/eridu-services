-- NOTE: `prisma migrate dev` again generated a
-- `DROP INDEX "scene_profiles_active_client_key"` statement here. That
-- partial unique index is invisible to Prisma's introspection, so every
-- future `migrate dev` will propose dropping it again. Deleted intentionally
-- -- see SceneProfile's schema.prisma comment and
-- SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 1.1.5.

-- AlterTable
ALTER TABLE "scene_qc_audit_targets" ADD COLUMN     "scene_qc_daily_confirmation_id" BIGINT;

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

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_scene_qc_daily_confirmation_id_idx" ON "scene_qc_audit_targets"("scene_qc_daily_confirmation_id");

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

-- CUSTOM SQL START: widen the single-target rule for Scene QC confirmation audits
ALTER TABLE "scene_qc_audit_targets"
    DROP CONSTRAINT "scene_qc_audit_targets_single_target_check";

ALTER TABLE "scene_qc_audit_targets"
    ADD CONSTRAINT "scene_qc_audit_targets_single_target_check"
    CHECK (num_nonnulls("scene_profile_id", "scene_qc_review_id", "scene_qc_daily_confirmation_id") = 1);
-- CUSTOM SQL END
