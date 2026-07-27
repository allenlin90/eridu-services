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

-- CreateIndex
CREATE INDEX "task_template_scene_qc_evidence_refs_template_id_idx" ON "task_template_scene_qc_evidence_refs"("template_id");

-- CreateIndex
CREATE INDEX "task_template_scene_qc_evidence_refs_snapshot_id_idx" ON "task_template_scene_qc_evidence_refs"("snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_template_scene_qc_evidence_refs_snapshot_id_field_key_key" ON "task_template_scene_qc_evidence_refs"("snapshot_id", "field_key");

-- AddForeignKey
ALTER TABLE "task_template_scene_qc_evidence_refs" ADD CONSTRAINT "task_template_scene_qc_evidence_refs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_template_scene_qc_evidence_refs" ADD CONSTRAINT "task_template_scene_qc_evidence_refs_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "task_template_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
