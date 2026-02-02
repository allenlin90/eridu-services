-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "studio_id" BIGINT;

-- AlterTable
ALTER TABLE "shows" ADD COLUMN     "studio_id" BIGINT;

-- CreateIndex
CREATE INDEX "schedules_studio_id_idx" ON "schedules"("studio_id");

-- CreateIndex
CREATE INDEX "schedules_studio_id_deleted_at_idx" ON "schedules"("studio_id", "deleted_at");

-- CreateIndex
CREATE INDEX "shows_studio_id_idx" ON "shows"("studio_id");

-- CreateIndex
CREATE INDEX "shows_studio_id_deleted_at_idx" ON "shows"("studio_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "shows" ADD CONSTRAINT "shows_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
