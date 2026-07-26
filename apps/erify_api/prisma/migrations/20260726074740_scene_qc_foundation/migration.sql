-- CreateEnum
CREATE TYPE "SceneQcStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "SceneType" AS ENUM ('GRAPHIC_BG', 'REAL_BACKDROP');

-- CreateTable
CREATE TABLE "scene_materials" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "client_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SceneQcStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "scene_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_material_revisions" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "material_id" BIGINT NOT NULL,
    "revision" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_material_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_profiles" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "client_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SceneQcStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "scene_type" "SceneType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "scene_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_profile_revisions" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "revision" INTEGER NOT NULL,
    "profile_name" TEXT NOT NULL,
    "profile_description" TEXT,
    "scene_type" "SceneType" NOT NULL,
    "created_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_profile_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_profile_revision_materials" (
    "id" BIGSERIAL NOT NULL,
    "profile_revision_id" BIGINT NOT NULL,
    "material_revision_id" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "studio_id" BIGINT,
    "platform_id" BIGINT,
    "label" TEXT NOT NULL,

    CONSTRAINT "scene_profile_revision_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_profile_assignments" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "show_id" BIGINT NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "scene_profile_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_qc_audit_targets" (
    "id" BIGSERIAL NOT NULL,
    "audit_id" BIGINT NOT NULL,
    "scene_material_id" BIGINT,
    "scene_profile_id" BIGINT,
    "scene_profile_assignment_id" BIGINT,

    CONSTRAINT "scene_qc_audit_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scene_materials_uid_key" ON "scene_materials"("uid");

-- CreateIndex
CREATE INDEX "scene_materials_deleted_at_idx" ON "scene_materials"("deleted_at");

-- CreateIndex
CREATE INDEX "scene_materials_client_id_deleted_at_idx" ON "scene_materials"("client_id", "deleted_at");

-- CreateIndex
CREATE INDEX "scene_materials_client_id_status_deleted_at_idx" ON "scene_materials"("client_id", "status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "scene_material_revisions_uid_key" ON "scene_material_revisions"("uid");

-- CreateIndex
CREATE INDEX "scene_material_revisions_material_id_revision_idx" ON "scene_material_revisions"("material_id", "revision");

-- CreateIndex
CREATE INDEX "scene_material_revisions_created_by_id_idx" ON "scene_material_revisions"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_material_revisions_material_id_revision_key" ON "scene_material_revisions"("material_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "scene_profiles_uid_key" ON "scene_profiles"("uid");

-- CreateIndex
CREATE INDEX "scene_profiles_deleted_at_idx" ON "scene_profiles"("deleted_at");

-- CreateIndex
CREATE INDEX "scene_profiles_client_id_deleted_at_idx" ON "scene_profiles"("client_id", "deleted_at");

-- CreateIndex
CREATE INDEX "scene_profiles_client_id_status_deleted_at_idx" ON "scene_profiles"("client_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "scene_profiles_client_id_status_is_default_deleted_at_idx" ON "scene_profiles"("client_id", "status", "is_default", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "scene_profile_revisions_uid_key" ON "scene_profile_revisions"("uid");

-- CreateIndex
CREATE INDEX "scene_profile_revisions_profile_id_revision_idx" ON "scene_profile_revisions"("profile_id", "revision");

-- CreateIndex
CREATE INDEX "scene_profile_revisions_created_by_id_idx" ON "scene_profile_revisions"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_profile_revisions_profile_id_revision_key" ON "scene_profile_revisions"("profile_id", "revision");

-- CreateIndex
CREATE INDEX "scene_profile_revision_materials_profile_revision_id_idx" ON "scene_profile_revision_materials"("profile_revision_id");

-- CreateIndex
CREATE INDEX "scene_profile_revision_materials_material_revision_id_idx" ON "scene_profile_revision_materials"("material_revision_id");

-- CreateIndex
CREATE INDEX "scene_profile_revision_materials_studio_id_idx" ON "scene_profile_revision_materials"("studio_id");

-- CreateIndex
CREATE INDEX "scene_profile_revision_materials_platform_id_idx" ON "scene_profile_revision_materials"("platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_profile_revision_materials_profile_revision_id_sort_o_key" ON "scene_profile_revision_materials"("profile_revision_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "scene_profile_assignments_uid_key" ON "scene_profile_assignments"("uid");

-- CreateIndex
CREATE INDEX "scene_profile_assignments_deleted_at_idx" ON "scene_profile_assignments"("deleted_at");

-- CreateIndex
CREATE INDEX "scene_profile_assignments_show_id_deleted_at_idx" ON "scene_profile_assignments"("show_id", "deleted_at");

-- CreateIndex
CREATE INDEX "scene_profile_assignments_profile_id_deleted_at_idx" ON "scene_profile_assignments"("profile_id", "deleted_at");

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_audit_id_idx" ON "scene_qc_audit_targets"("audit_id");

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_scene_material_id_idx" ON "scene_qc_audit_targets"("scene_material_id");

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_scene_profile_id_idx" ON "scene_qc_audit_targets"("scene_profile_id");

-- CreateIndex
CREATE INDEX "scene_qc_audit_targets_scene_profile_assignment_id_idx" ON "scene_qc_audit_targets"("scene_profile_assignment_id");

-- AddForeignKey
ALTER TABLE "scene_materials" ADD CONSTRAINT "scene_materials_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_material_revisions" ADD CONSTRAINT "scene_material_revisions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "scene_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_material_revisions" ADD CONSTRAINT "scene_material_revisions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_profiles" ADD CONSTRAINT "scene_profiles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_profile_revisions" ADD CONSTRAINT "scene_profile_revisions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "scene_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_profile_revisions" ADD CONSTRAINT "scene_profile_revisions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_profile_revision_materials" ADD CONSTRAINT "scene_profile_revision_materials_profile_revision_id_fkey" FOREIGN KEY ("profile_revision_id") REFERENCES "scene_profile_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_profile_revision_materials" ADD CONSTRAINT "scene_profile_revision_materials_material_revision_id_fkey" FOREIGN KEY ("material_revision_id") REFERENCES "scene_material_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_profile_revision_materials" ADD CONSTRAINT "scene_profile_revision_materials_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_profile_revision_materials" ADD CONSTRAINT "scene_profile_revision_materials_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_profile_assignments" ADD CONSTRAINT "scene_profile_assignments_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_profile_assignments" ADD CONSTRAINT "scene_profile_assignments_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "scene_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_scene_material_id_fkey" FOREIGN KEY ("scene_material_id") REFERENCES "scene_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_scene_profile_id_fkey" FOREIGN KEY ("scene_profile_id") REFERENCES "scene_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_qc_audit_targets" ADD CONSTRAINT "scene_qc_audit_targets_scene_profile_assignment_id_fkey" FOREIGN KEY ("scene_profile_assignment_id") REFERENCES "scene_profile_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CUSTOM SQL START: soft-delete-aware partial unique indexes and the
-- capability-owned audit-target exclusive arc (SCENE_QC_IMPLEMENTATION_PLAN §5.2/§5.6).
-- Prisma cannot express WHERE-scoped uniqueness or CHECK constraints.

CREATE UNIQUE INDEX "scene_materials_client_id_name_active_key"
  ON "scene_materials" ("client_id", lower("name"))
  WHERE "deleted_at" IS NULL AND "status" = 'ACTIVE';

CREATE UNIQUE INDEX "scene_profiles_client_id_default_active_key"
  ON "scene_profiles" ("client_id")
  WHERE "deleted_at" IS NULL AND "status" = 'ACTIVE' AND "is_default" = true;

CREATE UNIQUE INDEX "scene_profile_assignments_show_id_active_key"
  ON "scene_profile_assignments" ("show_id")
  WHERE "deleted_at" IS NULL;

-- Exactly one typed target per Scene QC audit junction row. Child PR 3 and
-- Child PR 4 must DROP and re-ADD this constraint with their added FK columns.
ALTER TABLE "scene_qc_audit_targets"
  ADD CONSTRAINT "scene_qc_audit_targets_exactly_one_target"
  CHECK (num_nonnulls(
    "scene_material_id",
    "scene_profile_id",
    "scene_profile_assignment_id"
  ) = 1);
-- CUSTOM SQL END

