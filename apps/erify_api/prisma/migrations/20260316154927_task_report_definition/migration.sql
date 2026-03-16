-- CreateTable
CREATE TABLE "task_report_definitions" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "studio_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_report_definitions_uid_key" ON "task_report_definitions"("uid");

-- CreateIndex
CREATE INDEX "task_report_definitions_studio_id_created_by_id_deleted_at__idx" ON "task_report_definitions"("studio_id", "created_by_id", "deleted_at", "updated_at");

-- CreateIndex
CREATE INDEX "task_report_definitions_studio_id_deleted_at_updated_at_idx" ON "task_report_definitions"("studio_id", "deleted_at", "updated_at");

-- AddForeignKey
ALTER TABLE "task_report_definitions" ADD CONSTRAINT "task_report_definitions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_report_definitions" ADD CONSTRAINT "task_report_definitions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
