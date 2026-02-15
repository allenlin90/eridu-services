-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('SETUP', 'ACTIVE', 'CLOSURE', 'ADMIN', 'ROUTINE', 'OTHER');

-- CreateTable
CREATE TABLE "task_templates" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "studio_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "current_schema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_template_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "template_id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL,
    "schema" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_template_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "type" "TaskType" NOT NULL,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "snapshot_id" BIGINT,
    "template_id" BIGINT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "studio_id" BIGINT,
    "assignee_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_targets" (
    "id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" BIGINT NOT NULL,
    "show_id" BIGINT,
    "studio_id" BIGINT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_templates_uid_key" ON "task_templates"("uid");

-- CreateIndex
CREATE INDEX "task_templates_uid_idx" ON "task_templates"("uid");

-- CreateIndex
CREATE INDEX "task_templates_studio_id_idx" ON "task_templates"("studio_id");

-- CreateIndex
CREATE INDEX "task_templates_is_active_idx" ON "task_templates"("is_active");

-- CreateIndex
CREATE INDEX "task_templates_studio_id_updated_at_idx" ON "task_templates"("studio_id", "updated_at");

-- CreateIndex
CREATE INDEX "task_template_snapshots_template_id_version_idx" ON "task_template_snapshots"("template_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "task_template_snapshots_template_id_version_key" ON "task_template_snapshots"("template_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_uid_key" ON "tasks"("uid");

-- CreateIndex
CREATE INDEX "tasks_uid_idx" ON "tasks"("uid");

-- CreateIndex
CREATE INDEX "tasks_snapshot_id_idx" ON "tasks"("snapshot_id");

-- CreateIndex
CREATE INDEX "tasks_template_id_idx" ON "tasks"("template_id");

-- CreateIndex
CREATE INDEX "tasks_template_id_deleted_at_idx" ON "tasks"("template_id", "deleted_at");

-- CreateIndex
CREATE INDEX "tasks_studio_id_idx" ON "tasks"("studio_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_deleted_at_idx" ON "tasks"("deleted_at");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_status_deleted_at_idx" ON "tasks"("assignee_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_status_due_date_idx" ON "tasks"("assignee_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "tasks_studio_id_status_deleted_at_idx" ON "tasks"("studio_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "tasks_studio_id_assignee_id_deleted_at_idx" ON "tasks"("studio_id", "assignee_id", "deleted_at");

-- CreateIndex
CREATE INDEX "task_targets_task_id_idx" ON "task_targets"("task_id");

-- CreateIndex
CREATE INDEX "task_targets_show_id_idx" ON "task_targets"("show_id");

-- CreateIndex
CREATE INDEX "task_targets_show_id_deleted_at_idx" ON "task_targets"("show_id", "deleted_at");

-- CreateIndex
CREATE INDEX "task_targets_studio_id_idx" ON "task_targets"("studio_id");

-- CreateIndex
CREATE INDEX "task_targets_studio_id_deleted_at_idx" ON "task_targets"("studio_id", "deleted_at");

-- CreateIndex
CREATE INDEX "task_targets_target_type_target_id_idx" ON "task_targets"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "task_targets_deleted_at_idx" ON "task_targets"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "task_targets_task_id_target_type_target_id_key" ON "task_targets"("task_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_template_snapshots" ADD CONSTRAINT "task_template_snapshots_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "task_template_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_targets" ADD CONSTRAINT "task_targets_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_targets" ADD CONSTRAINT "task_targets_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_targets" ADD CONSTRAINT "task_targets_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
