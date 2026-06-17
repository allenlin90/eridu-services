-- CreateTable
CREATE TABLE "task_template_mechanic_refs" (
    "id" BIGSERIAL NOT NULL,
    "template_id" BIGINT NOT NULL,
    "snapshot_id" BIGINT,
    "mechanic_id" BIGINT NOT NULL,
    "group" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_template_mechanic_refs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_template_mechanic_refs_template_id_idx" ON "task_template_mechanic_refs"("template_id");

-- CreateIndex
CREATE INDEX "task_template_mechanic_refs_snapshot_id_idx" ON "task_template_mechanic_refs"("snapshot_id");

-- CreateIndex
CREATE INDEX "task_template_mechanic_refs_mechanic_id_idx" ON "task_template_mechanic_refs"("mechanic_id");

-- AddForeignKey
ALTER TABLE "task_template_mechanic_refs" ADD CONSTRAINT "task_template_mechanic_refs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_template_mechanic_refs" ADD CONSTRAINT "task_template_mechanic_refs_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "task_template_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_template_mechanic_refs" ADD CONSTRAINT "task_template_mechanic_refs_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "client_mechanics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
