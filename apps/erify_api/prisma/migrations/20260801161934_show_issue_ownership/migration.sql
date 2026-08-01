-- AlterTable
ALTER TABLE "audit_targets" ADD COLUMN     "show_issue_id" BIGINT;

-- CreateTable
CREATE TABLE "show_issues" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "show_id" BIGINT NOT NULL,
    "category" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "evidence" TEXT,
    "owner_id" BIGINT,
    "due_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "escalation_level" INTEGER NOT NULL DEFAULT 0,
    "escalated_at" TIMESTAMP(3),
    "escalated_by_id" BIGINT,
    "escalation_note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" BIGINT,
    "resolution_code" TEXT,
    "resolution_note" TEXT,
    "show_creator_id" BIGINT,
    "show_platform_violation_id" BIGINT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "show_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "show_issues_uid_key" ON "show_issues"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "show_issues_show_platform_violation_id_key" ON "show_issues"("show_platform_violation_id");

-- CreateIndex
CREATE INDEX "show_issues_show_id_status_due_at_deleted_at_idx" ON "show_issues"("show_id", "status", "due_at", "deleted_at");

-- CreateIndex
CREATE INDEX "show_issues_owner_id_status_deleted_at_idx" ON "show_issues"("owner_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "show_issues_severity_status_deleted_at_idx" ON "show_issues"("severity", "status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "show_issues_show_creator_id_category_origin_key" ON "show_issues"("show_creator_id", "category", "origin");

-- CreateIndex
CREATE INDEX "audit_targets_show_issue_id_idx" ON "audit_targets"("show_issue_id");

-- AddForeignKey
ALTER TABLE "show_issues" ADD CONSTRAINT "show_issues_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_issues" ADD CONSTRAINT "show_issues_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_issues" ADD CONSTRAINT "show_issues_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_issues" ADD CONSTRAINT "show_issues_escalated_by_id_fkey" FOREIGN KEY ("escalated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_issues" ADD CONSTRAINT "show_issues_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_issues" ADD CONSTRAINT "show_issues_show_creator_id_fkey" FOREIGN KEY ("show_creator_id") REFERENCES "show_creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_issues" ADD CONSTRAINT "show_issues_show_platform_violation_id_fkey" FOREIGN KEY ("show_platform_violation_id") REFERENCES "show_platform_violations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_targets" ADD CONSTRAINT "audit_targets_show_issue_id_fkey" FOREIGN KEY ("show_issue_id") REFERENCES "show_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
