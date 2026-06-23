-- CreateTable
CREATE TABLE "show_cancellation_resolutions" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "show_id" BIGINT NOT NULL,
    "reason_category" TEXT NOT NULL,
    "reason_note" TEXT,
    "resolution_owner_membership_id" BIGINT,
    "follow_up_due_at" TIMESTAMP(3),
    "follow_up_notes" TEXT,
    "final_disposition" TEXT,
    "resolution_notes" TEXT,
    "created_by_id" BIGINT,
    "resolved_by_id" BIGINT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "show_cancellation_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "show_cancellation_resolutions_uid_key" ON "show_cancellation_resolutions"("uid");

-- CreateIndex
CREATE INDEX "show_cancellation_resolutions_uid_idx" ON "show_cancellation_resolutions"("uid");

-- CreateIndex
CREATE INDEX "show_cancellation_resolutions_show_id_idx" ON "show_cancellation_resolutions"("show_id");

-- CreateIndex
CREATE INDEX "show_cancellation_resolutions_resolution_owner_membership_i_idx" ON "show_cancellation_resolutions"("resolution_owner_membership_id");

-- CreateIndex
CREATE INDEX "show_cancellation_resolutions_created_by_id_idx" ON "show_cancellation_resolutions"("created_by_id");

-- CreateIndex
CREATE INDEX "show_cancellation_resolutions_resolved_by_id_idx" ON "show_cancellation_resolutions"("resolved_by_id");

-- CreateIndex
CREATE INDEX "show_cancellation_resolutions_final_disposition_idx" ON "show_cancellation_resolutions"("final_disposition");

-- CreateIndex
CREATE INDEX "show_cancellation_resolutions_resolved_at_idx" ON "show_cancellation_resolutions"("resolved_at");

-- CreateIndex
CREATE INDEX "show_cancellation_resolutions_deleted_at_idx" ON "show_cancellation_resolutions"("deleted_at");

-- CreateIndex
CREATE INDEX "show_cancellation_resolutions_show_id_resolved_at_deleted_a_idx" ON "show_cancellation_resolutions"("show_id", "resolved_at", "deleted_at");

-- AddForeignKey
ALTER TABLE "show_cancellation_resolutions" ADD CONSTRAINT "show_cancellation_resolutions_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_cancellation_resolutions" ADD CONSTRAINT "show_cancellation_resolutions_resolution_owner_membership__fkey" FOREIGN KEY ("resolution_owner_membership_id") REFERENCES "studio_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_cancellation_resolutions" ADD CONSTRAINT "show_cancellation_resolutions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_cancellation_resolutions" ADD CONSTRAINT "show_cancellation_resolutions_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
