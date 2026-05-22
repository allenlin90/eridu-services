-- AlterTable
ALTER TABLE "show_creators" ADD COLUMN     "actual_end_time" TIMESTAMP(3),
ADD COLUMN     "actual_start_time" TIMESTAMP(3),
ADD COLUMN     "attendance_missing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "attendance_reason" TEXT;

-- AlterTable
ALTER TABLE "show_platforms" ADD COLUMN     "actual_end_time" TIMESTAMP(3),
ADD COLUMN     "actual_start_time" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "show_platform_violations" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "show_platform_id" BIGINT NOT NULL,
    "violation_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "reason" TEXT NOT NULL,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "source_task_id" BIGINT,
    "source_field_id" TEXT,
    "superseded_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "show_platform_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "show_platform_violations_uid_key" ON "show_platform_violations"("uid");

-- CreateIndex
CREATE INDEX "show_platform_violations_show_platform_id_idx" ON "show_platform_violations"("show_platform_id");

-- CreateIndex
CREATE INDEX "show_platform_violations_violation_type_idx" ON "show_platform_violations"("violation_type");

-- CreateIndex
CREATE INDEX "show_platform_violations_observed_at_idx" ON "show_platform_violations"("observed_at");

-- CreateIndex
CREATE INDEX "show_platform_violations_source_task_id_source_field_id_idx" ON "show_platform_violations"("source_task_id", "source_field_id");

-- CreateIndex
CREATE INDEX "show_platform_violations_show_platform_id_superseded_at_idx" ON "show_platform_violations"("show_platform_id", "superseded_at");

-- CreateIndex
CREATE INDEX "show_creators_actual_start_time_idx" ON "show_creators"("actual_start_time");

-- CreateIndex
CREATE INDEX "show_creators_attendance_missing_idx" ON "show_creators"("attendance_missing");

-- CreateIndex
CREATE INDEX "show_creators_actual_start_time_actual_end_time_idx" ON "show_creators"("actual_start_time", "actual_end_time");

-- CreateIndex
CREATE INDEX "show_platforms_actual_start_time_actual_end_time_idx" ON "show_platforms"("actual_start_time", "actual_end_time");

-- CreateIndex
CREATE INDEX "shows_actual_start_time_actual_end_time_idx" ON "shows"("actual_start_time", "actual_end_time");

-- AddForeignKey
ALTER TABLE "show_platform_violations" ADD CONSTRAINT "show_platform_violations_show_platform_id_fkey" FOREIGN KEY ("show_platform_id") REFERENCES "show_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_platform_violations" ADD CONSTRAINT "show_platform_violations_source_task_id_fkey" FOREIGN KEY ("source_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
