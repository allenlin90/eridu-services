-- AlterTable
ALTER TABLE "task_templates" ADD COLUMN     "client_id" BIGINT;

-- CreateIndex
CREATE INDEX "task_templates_client_id_idx" ON "task_templates"("client_id");

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
