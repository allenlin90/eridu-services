-- AlterTable
ALTER TABLE "audits" ADD COLUMN     "publish_run_id" BIGINT;

-- CreateTable
CREATE TABLE "publish_runs" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "schedule_id" BIGINT NOT NULL,
    "studio_id" BIGINT,
    "triggered_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publish_runs_uid_key" ON "publish_runs"("uid");

-- CreateIndex
CREATE INDEX "publish_runs_studio_id_created_at_idx" ON "publish_runs"("studio_id", "created_at");

-- CreateIndex
CREATE INDEX "publish_runs_schedule_id_idx" ON "publish_runs"("schedule_id");

-- CreateIndex
CREATE INDEX "publish_runs_triggered_by_id_idx" ON "publish_runs"("triggered_by_id");

-- CreateIndex
CREATE INDEX "audits_publish_run_id_idx" ON "audits"("publish_run_id");

-- AddForeignKey
ALTER TABLE "publish_runs" ADD CONSTRAINT "publish_runs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_runs" ADD CONSTRAINT "publish_runs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_runs" ADD CONSTRAINT "publish_runs_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_publish_run_id_fkey" FOREIGN KEY ("publish_run_id") REFERENCES "publish_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
