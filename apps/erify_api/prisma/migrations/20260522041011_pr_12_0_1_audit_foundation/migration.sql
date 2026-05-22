-- CreateTable
CREATE TABLE "audits" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" BIGINT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_targets" (
    "id" BIGSERIAL NOT NULL,
    "audit_id" BIGINT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" BIGINT NOT NULL,
    "show_id" BIGINT,
    "show_creator_id" BIGINT,
    "show_platform_id" BIGINT,
    "studio_shift_id" BIGINT,

    CONSTRAINT "audit_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audits_uid_key" ON "audits"("uid");

-- CreateIndex
CREATE INDEX "audits_action_idx" ON "audits"("action");

-- CreateIndex
CREATE INDEX "audits_actor_id_idx" ON "audits"("actor_id");

-- CreateIndex
CREATE INDEX "audits_created_at_idx" ON "audits"("created_at");

-- CreateIndex
CREATE INDEX "audit_targets_target_type_target_id_idx" ON "audit_targets"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_targets_show_id_idx" ON "audit_targets"("show_id");

-- CreateIndex
CREATE INDEX "audit_targets_show_creator_id_idx" ON "audit_targets"("show_creator_id");

-- CreateIndex
CREATE INDEX "audit_targets_show_platform_id_idx" ON "audit_targets"("show_platform_id");

-- CreateIndex
CREATE INDEX "audit_targets_studio_shift_id_idx" ON "audit_targets"("studio_shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_targets_audit_id_target_type_target_id_key" ON "audit_targets"("audit_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_targets" ADD CONSTRAINT "audit_targets_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_targets" ADD CONSTRAINT "audit_targets_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_targets" ADD CONSTRAINT "audit_targets_show_creator_id_fkey" FOREIGN KEY ("show_creator_id") REFERENCES "show_creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_targets" ADD CONSTRAINT "audit_targets_show_platform_id_fkey" FOREIGN KEY ("show_platform_id") REFERENCES "show_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_targets" ADD CONSTRAINT "audit_targets_studio_shift_id_fkey" FOREIGN KEY ("studio_shift_id") REFERENCES "studio_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
