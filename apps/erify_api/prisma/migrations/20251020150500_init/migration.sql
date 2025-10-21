-- CreateTable
CREATE TABLE "public"."users" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "ext_id" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "profile_url" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mcs" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "user_id" BIGINT,
    "name" TEXT NOT NULL,
    "alias_name" TEXT NOT NULL,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."materials" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "client_id" BIGINT,
    "platform_id" BIGINT,
    "material_type_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expiring_at" TIMESTAMP(3),
    "version" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."material_types" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "material_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platforms" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_config" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shows" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "client_id" BIGINT NOT NULL,
    "studio_room_id" BIGINT NOT NULL,
    "schedule_version_id" BIGINT,
    "show_type_id" BIGINT NOT NULL,
    "show_status_id" BIGINT NOT NULL,
    "show_standard_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "shows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."show_mcs" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "show_id" BIGINT NOT NULL,
    "mc_id" BIGINT NOT NULL,
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "show_mcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."show_materials" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "show_id" BIGINT NOT NULL,
    "material_id" BIGINT NOT NULL,
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "show_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."show_platforms" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "show_id" BIGINT NOT NULL,
    "platform_id" BIGINT NOT NULL,
    "live_stream_link" TEXT NOT NULL,
    "platform_show_id" TEXT NOT NULL,
    "viewer_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "show_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studios" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_rooms" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "studio_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "studio_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedules" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "client_id" BIGINT NOT NULL,
    "studio_id" BIGINT NOT NULL,
    "schedule_status_id" BIGINT NOT NULL,
    "active_version_id" BIGINT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_status" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "schedule_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."change_categories" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "change_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."change_types" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "change_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_versions" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "schedule_id" BIGINT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "change_category_id" BIGINT NOT NULL,
    "change_type_id" BIGINT NOT NULL,
    "change_reason" TEXT NOT NULL,
    "requires_client_approval" BOOLEAN NOT NULL DEFAULT false,
    "creator_id" BIGINT NOT NULL,
    "approver_id" BIGINT,
    "approved_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "schedule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."show_types" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "show_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."show_status" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "show_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."show_standards" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "show_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tags" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "studio_id" BIGINT,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."taggables" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "tag_id" BIGINT NOT NULL,
    "taggable_id" BIGINT NOT NULL,
    "taggable_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "taggables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_templates" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "studio_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_template_items" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "task_template_id" BIGINT NOT NULL,
    "task_type_id" BIGINT NOT NULL,
    "input_type_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_types" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_input_types" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_input_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "taskable_id" BIGINT NOT NULL,
    "taskable_type" TEXT NOT NULL,
    "task_template_item_id" BIGINT NOT NULL,
    "task_status_id" BIGINT NOT NULL,
    "assignee_id" BIGINT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_status" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."memberships" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "group_id" BIGINT NOT NULL,
    "group_type" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."comments" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "commentable_id" BIGINT NOT NULL,
    "commentable_type" TEXT NOT NULL,
    "owner_id" BIGINT NOT NULL,
    "parent_id" BIGINT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audits" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "auditable_id" BIGINT NOT NULL,
    "auditable_type" TEXT NOT NULL,
    "old_values" JSONB NOT NULL,
    "new_values" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_uid_key" ON "public"."users"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_ext_id_key" ON "public"."users"("ext_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_uid_idx" ON "public"."users"("uid");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_name_idx" ON "public"."users"("name");

-- CreateIndex
CREATE INDEX "users_ext_id_idx" ON "public"."users"("ext_id");

-- CreateIndex
CREATE INDEX "users_is_banned_idx" ON "public"."users"("is_banned");

-- CreateIndex
CREATE UNIQUE INDEX "mcs_uid_key" ON "public"."mcs"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "mcs_user_id_key" ON "public"."mcs"("user_id");

-- CreateIndex
CREATE INDEX "mcs_uid_idx" ON "public"."mcs"("uid");

-- CreateIndex
CREATE INDEX "mcs_user_id_idx" ON "public"."mcs"("user_id");

-- CreateIndex
CREATE INDEX "mcs_name_idx" ON "public"."mcs"("name");

-- CreateIndex
CREATE INDEX "mcs_alias_name_idx" ON "public"."mcs"("alias_name");

-- CreateIndex
CREATE INDEX "mcs_is_banned_idx" ON "public"."mcs"("is_banned");

-- CreateIndex
CREATE UNIQUE INDEX "clients_uid_key" ON "public"."clients"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "clients_name_key" ON "public"."clients"("name");

-- CreateIndex
CREATE INDEX "clients_uid_idx" ON "public"."clients"("uid");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "public"."clients"("name");

-- CreateIndex
CREATE INDEX "clients_contact_person_idx" ON "public"."clients"("contact_person");

-- CreateIndex
CREATE INDEX "clients_contact_email_idx" ON "public"."clients"("contact_email");

-- CreateIndex
CREATE UNIQUE INDEX "materials_uid_key" ON "public"."materials"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "materials_resource_url_key" ON "public"."materials"("resource_url");

-- CreateIndex
CREATE INDEX "materials_uid_idx" ON "public"."materials"("uid");

-- CreateIndex
CREATE INDEX "materials_client_id_idx" ON "public"."materials"("client_id");

-- CreateIndex
CREATE INDEX "materials_platform_id_idx" ON "public"."materials"("platform_id");

-- CreateIndex
CREATE INDEX "materials_material_type_id_idx" ON "public"."materials"("material_type_id");

-- CreateIndex
CREATE INDEX "materials_name_idx" ON "public"."materials"("name");

-- CreateIndex
CREATE INDEX "materials_is_active_idx" ON "public"."materials"("is_active");

-- CreateIndex
CREATE INDEX "materials_client_id_is_active_idx" ON "public"."materials"("client_id", "is_active");

-- CreateIndex
CREATE INDEX "materials_expiring_at_idx" ON "public"."materials"("expiring_at");

-- CreateIndex
CREATE UNIQUE INDEX "material_types_uid_key" ON "public"."material_types"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "material_types_name_key" ON "public"."material_types"("name");

-- CreateIndex
CREATE INDEX "material_types_uid_idx" ON "public"."material_types"("uid");

-- CreateIndex
CREATE INDEX "material_types_name_idx" ON "public"."material_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_uid_key" ON "public"."platforms"("uid");

-- CreateIndex
CREATE INDEX "platforms_uid_idx" ON "public"."platforms"("uid");

-- CreateIndex
CREATE INDEX "platforms_name_idx" ON "public"."platforms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "shows_uid_key" ON "public"."shows"("uid");

-- CreateIndex
CREATE INDEX "shows_uid_idx" ON "public"."shows"("uid");

-- CreateIndex
CREATE INDEX "shows_name_idx" ON "public"."shows"("name");

-- CreateIndex
CREATE INDEX "shows_client_id_idx" ON "public"."shows"("client_id");

-- CreateIndex
CREATE INDEX "shows_studio_room_id_idx" ON "public"."shows"("studio_room_id");

-- CreateIndex
CREATE INDEX "shows_schedule_version_id_idx" ON "public"."shows"("schedule_version_id");

-- CreateIndex
CREATE INDEX "shows_show_type_id_idx" ON "public"."shows"("show_type_id");

-- CreateIndex
CREATE INDEX "shows_show_status_id_idx" ON "public"."shows"("show_status_id");

-- CreateIndex
CREATE INDEX "shows_show_standard_id_idx" ON "public"."shows"("show_standard_id");

-- CreateIndex
CREATE INDEX "shows_start_time_end_time_idx" ON "public"."shows"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "shows_start_time_idx" ON "public"."shows"("start_time");

-- CreateIndex
CREATE INDEX "shows_end_time_idx" ON "public"."shows"("end_time");

-- CreateIndex
CREATE UNIQUE INDEX "show_mcs_uid_key" ON "public"."show_mcs"("uid");

-- CreateIndex
CREATE INDEX "show_mcs_uid_idx" ON "public"."show_mcs"("uid");

-- CreateIndex
CREATE INDEX "show_mcs_show_id_idx" ON "public"."show_mcs"("show_id");

-- CreateIndex
CREATE INDEX "show_mcs_mc_id_idx" ON "public"."show_mcs"("mc_id");

-- CreateIndex
CREATE UNIQUE INDEX "show_mcs_show_id_mc_id_key" ON "public"."show_mcs"("show_id", "mc_id");

-- CreateIndex
CREATE UNIQUE INDEX "show_materials_uid_key" ON "public"."show_materials"("uid");

-- CreateIndex
CREATE INDEX "show_materials_uid_idx" ON "public"."show_materials"("uid");

-- CreateIndex
CREATE INDEX "show_materials_show_id_idx" ON "public"."show_materials"("show_id");

-- CreateIndex
CREATE INDEX "show_materials_material_id_idx" ON "public"."show_materials"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "show_materials_show_id_material_id_key" ON "public"."show_materials"("show_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX "show_platforms_uid_key" ON "public"."show_platforms"("uid");

-- CreateIndex
CREATE INDEX "show_platforms_uid_idx" ON "public"."show_platforms"("uid");

-- CreateIndex
CREATE INDEX "show_platforms_show_id_idx" ON "public"."show_platforms"("show_id");

-- CreateIndex
CREATE INDEX "show_platforms_platform_id_idx" ON "public"."show_platforms"("platform_id");

-- CreateIndex
CREATE INDEX "show_platforms_platform_show_id_idx" ON "public"."show_platforms"("platform_show_id");

-- CreateIndex
CREATE UNIQUE INDEX "show_platforms_show_id_platform_id_key" ON "public"."show_platforms"("show_id", "platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "studios_uid_key" ON "public"."studios"("uid");

-- CreateIndex
CREATE INDEX "studios_uid_idx" ON "public"."studios"("uid");

-- CreateIndex
CREATE INDEX "studios_name_idx" ON "public"."studios"("name");

-- CreateIndex
CREATE UNIQUE INDEX "studio_rooms_uid_key" ON "public"."studio_rooms"("uid");

-- CreateIndex
CREATE INDEX "studio_rooms_uid_idx" ON "public"."studio_rooms"("uid");

-- CreateIndex
CREATE INDEX "studio_rooms_studio_id_idx" ON "public"."studio_rooms"("studio_id");

-- CreateIndex
CREATE INDEX "studio_rooms_name_idx" ON "public"."studio_rooms"("name");

-- CreateIndex
CREATE INDEX "studio_rooms_studio_id_name_idx" ON "public"."studio_rooms"("studio_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_uid_key" ON "public"."schedules"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_active_version_id_key" ON "public"."schedules"("active_version_id");

-- CreateIndex
CREATE INDEX "schedules_uid_idx" ON "public"."schedules"("uid");

-- CreateIndex
CREATE INDEX "schedules_client_id_idx" ON "public"."schedules"("client_id");

-- CreateIndex
CREATE INDEX "schedules_studio_id_idx" ON "public"."schedules"("studio_id");

-- CreateIndex
CREATE INDEX "schedules_schedule_status_id_idx" ON "public"."schedules"("schedule_status_id");

-- CreateIndex
CREATE INDEX "schedules_active_version_id_idx" ON "public"."schedules"("active_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_status_uid_key" ON "public"."schedule_status"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_status_name_key" ON "public"."schedule_status"("name");

-- CreateIndex
CREATE INDEX "schedule_status_uid_idx" ON "public"."schedule_status"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "change_categories_uid_key" ON "public"."change_categories"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "change_categories_name_key" ON "public"."change_categories"("name");

-- CreateIndex
CREATE INDEX "change_categories_uid_idx" ON "public"."change_categories"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "change_types_uid_key" ON "public"."change_types"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "change_types_name_key" ON "public"."change_types"("name");

-- CreateIndex
CREATE INDEX "change_types_uid_idx" ON "public"."change_types"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_versions_uid_key" ON "public"."schedule_versions"("uid");

-- CreateIndex
CREATE INDEX "schedule_versions_change_category_id_idx" ON "public"."schedule_versions"("change_category_id");

-- CreateIndex
CREATE INDEX "schedule_versions_change_type_id_idx" ON "public"."schedule_versions"("change_type_id");

-- CreateIndex
CREATE INDEX "schedule_versions_schedule_id_change_category_id_idx" ON "public"."schedule_versions"("schedule_id", "change_category_id");

-- CreateIndex
CREATE INDEX "schedule_versions_schedule_id_change_type_id_idx" ON "public"."schedule_versions"("schedule_id", "change_type_id");

-- CreateIndex
CREATE INDEX "schedule_versions_change_category_id_requires_client_approv_idx" ON "public"."schedule_versions"("change_category_id", "requires_client_approval");

-- CreateIndex
CREATE INDEX "schedule_versions_change_type_id_requires_client_approval_idx" ON "public"."schedule_versions"("change_type_id", "requires_client_approval");

-- CreateIndex
CREATE INDEX "schedule_versions_creator_id_change_type_id_idx" ON "public"."schedule_versions"("creator_id", "change_type_id");

-- CreateIndex
CREATE INDEX "schedule_versions_approver_id_change_type_id_idx" ON "public"."schedule_versions"("approver_id", "change_type_id");

-- CreateIndex
CREATE INDEX "schedule_versions_effective_from_effective_to_change_catego_idx" ON "public"."schedule_versions"("effective_from", "effective_to", "change_category_id");

-- CreateIndex
CREATE INDEX "schedule_versions_schedule_id_approved_at_idx" ON "public"."schedule_versions"("schedule_id", "approved_at");

-- CreateIndex
CREATE INDEX "schedule_versions_requires_client_approval_approved_at_idx" ON "public"."schedule_versions"("requires_client_approval", "approved_at");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_versions_schedule_id_version_number_key" ON "public"."schedule_versions"("schedule_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "show_types_uid_key" ON "public"."show_types"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "show_types_name_key" ON "public"."show_types"("name");

-- CreateIndex
CREATE INDEX "show_types_uid_idx" ON "public"."show_types"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "show_status_uid_key" ON "public"."show_status"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "show_status_name_key" ON "public"."show_status"("name");

-- CreateIndex
CREATE INDEX "show_status_uid_idx" ON "public"."show_status"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "show_standards_uid_key" ON "public"."show_standards"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "show_standards_name_key" ON "public"."show_standards"("name");

-- CreateIndex
CREATE INDEX "show_standards_uid_idx" ON "public"."show_standards"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "tags_uid_key" ON "public"."tags"("uid");

-- CreateIndex
CREATE INDEX "tags_uid_idx" ON "public"."tags"("uid");

-- CreateIndex
CREATE INDEX "tags_studio_id_idx" ON "public"."tags"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_studio_id_name_key" ON "public"."tags"("studio_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "taggables_uid_key" ON "public"."taggables"("uid");

-- CreateIndex
CREATE INDEX "taggables_uid_idx" ON "public"."taggables"("uid");

-- CreateIndex
CREATE INDEX "taggables_tag_id_idx" ON "public"."taggables"("tag_id");

-- CreateIndex
CREATE INDEX "taggables_taggable_id_taggable_type_idx" ON "public"."taggables"("taggable_id", "taggable_type");

-- CreateIndex
CREATE UNIQUE INDEX "taggables_tag_id_taggable_id_key" ON "public"."taggables"("tag_id", "taggable_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_templates_uid_key" ON "public"."task_templates"("uid");

-- CreateIndex
CREATE INDEX "task_templates_uid_idx" ON "public"."task_templates"("uid");

-- CreateIndex
CREATE INDEX "task_templates_studio_id_idx" ON "public"."task_templates"("studio_id");

-- CreateIndex
CREATE INDEX "task_templates_is_active_idx" ON "public"."task_templates"("is_active");

-- CreateIndex
CREATE INDEX "task_templates_studio_id_is_active_idx" ON "public"."task_templates"("studio_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "task_templates_studio_id_name_key" ON "public"."task_templates"("studio_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "task_template_items_uid_key" ON "public"."task_template_items"("uid");

-- CreateIndex
CREATE INDEX "task_template_items_uid_idx" ON "public"."task_template_items"("uid");

-- CreateIndex
CREATE INDEX "task_template_items_task_template_id_idx" ON "public"."task_template_items"("task_template_id");

-- CreateIndex
CREATE INDEX "task_template_items_task_type_id_idx" ON "public"."task_template_items"("task_type_id");

-- CreateIndex
CREATE INDEX "task_template_items_input_type_id_idx" ON "public"."task_template_items"("input_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_types_uid_key" ON "public"."task_types"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "task_types_name_key" ON "public"."task_types"("name");

-- CreateIndex
CREATE INDEX "task_types_uid_idx" ON "public"."task_types"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "task_input_types_uid_key" ON "public"."task_input_types"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "task_input_types_name_key" ON "public"."task_input_types"("name");

-- CreateIndex
CREATE INDEX "task_input_types_uid_idx" ON "public"."task_input_types"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_uid_key" ON "public"."tasks"("uid");

-- CreateIndex
CREATE INDEX "tasks_uid_idx" ON "public"."tasks"("uid");

-- CreateIndex
CREATE INDEX "tasks_taskable_id_taskable_type_idx" ON "public"."tasks"("taskable_id", "taskable_type");

-- CreateIndex
CREATE INDEX "tasks_task_template_item_id_idx" ON "public"."tasks"("task_template_item_id");

-- CreateIndex
CREATE INDEX "tasks_task_status_id_idx" ON "public"."tasks"("task_status_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_idx" ON "public"."tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "tasks_due_date_idx" ON "public"."tasks"("due_date");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_due_date_idx" ON "public"."tasks"("assignee_id", "due_date");

-- CreateIndex
CREATE INDEX "tasks_task_status_id_due_date_idx" ON "public"."tasks"("task_status_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_taskable_id_assignee_id_key" ON "public"."tasks"("taskable_id", "assignee_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_status_uid_key" ON "public"."task_status"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "task_status_name_key" ON "public"."task_status"("name");

-- CreateIndex
CREATE INDEX "task_status_uid_idx" ON "public"."task_status"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_uid_key" ON "public"."memberships"("uid");

-- CreateIndex
CREATE INDEX "memberships_uid_idx" ON "public"."memberships"("uid");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "public"."memberships"("user_id");

-- CreateIndex
CREATE INDEX "memberships_group_id_group_type_idx" ON "public"."memberships"("group_id", "group_type");

-- CreateIndex
CREATE INDEX "memberships_group_type_group_id_idx" ON "public"."memberships"("group_type", "group_id");

-- CreateIndex
CREATE INDEX "memberships_user_id_group_type_idx" ON "public"."memberships"("user_id", "group_type");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_group_id_group_type_key" ON "public"."memberships"("user_id", "group_id", "group_type");

-- CreateIndex
CREATE UNIQUE INDEX "comments_uid_key" ON "public"."comments"("uid");

-- CreateIndex
CREATE INDEX "comments_uid_idx" ON "public"."comments"("uid");

-- CreateIndex
CREATE INDEX "comments_commentable_id_commentable_type_idx" ON "public"."comments"("commentable_id", "commentable_type");

-- CreateIndex
CREATE INDEX "comments_owner_id_idx" ON "public"."comments"("owner_id");

-- CreateIndex
CREATE INDEX "comments_parent_id_idx" ON "public"."comments"("parent_id");

-- CreateIndex
CREATE INDEX "comments_commentable_id_commentable_type_created_at_idx" ON "public"."comments"("commentable_id", "commentable_type", "created_at");

-- CreateIndex
CREATE INDEX "comments_owner_id_created_at_idx" ON "public"."comments"("owner_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "audits_uid_key" ON "public"."audits"("uid");

-- CreateIndex
CREATE INDEX "audits_uid_idx" ON "public"."audits"("uid");

-- CreateIndex
CREATE INDEX "audits_user_id_idx" ON "public"."audits"("user_id");

-- CreateIndex
CREATE INDEX "audits_auditable_id_auditable_type_idx" ON "public"."audits"("auditable_id", "auditable_type");

-- CreateIndex
CREATE INDEX "audits_created_at_idx" ON "public"."audits"("created_at");

-- CreateIndex
CREATE INDEX "audits_user_id_created_at_idx" ON "public"."audits"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audits_auditable_type_created_at_idx" ON "public"."audits"("auditable_type", "created_at");

-- CreateIndex
CREATE INDEX "audits_action_created_at_idx" ON "public"."audits"("action", "created_at");

-- AddForeignKey
ALTER TABLE "public"."mcs" ADD CONSTRAINT "mcs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."materials" ADD CONSTRAINT "materials_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."materials" ADD CONSTRAINT "materials_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."materials" ADD CONSTRAINT "materials_material_type_id_fkey" FOREIGN KEY ("material_type_id") REFERENCES "public"."material_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_studio_room_id_fkey" FOREIGN KEY ("studio_room_id") REFERENCES "public"."studio_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_schedule_version_id_fkey" FOREIGN KEY ("schedule_version_id") REFERENCES "public"."schedule_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_show_type_id_fkey" FOREIGN KEY ("show_type_id") REFERENCES "public"."show_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_show_status_id_fkey" FOREIGN KEY ("show_status_id") REFERENCES "public"."show_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_show_standard_id_fkey" FOREIGN KEY ("show_standard_id") REFERENCES "public"."show_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."show_mcs" ADD CONSTRAINT "show_mcs_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."show_mcs" ADD CONSTRAINT "show_mcs_mc_id_fkey" FOREIGN KEY ("mc_id") REFERENCES "public"."mcs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."show_materials" ADD CONSTRAINT "show_materials_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."show_materials" ADD CONSTRAINT "show_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."show_platforms" ADD CONSTRAINT "show_platforms_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."show_platforms" ADD CONSTRAINT "show_platforms_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_rooms" ADD CONSTRAINT "studio_rooms_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_schedule_status_id_fkey" FOREIGN KEY ("schedule_status_id") REFERENCES "public"."schedule_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_active_version_id_fkey" FOREIGN KEY ("active_version_id") REFERENCES "public"."schedule_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_versions" ADD CONSTRAINT "schedule_versions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_versions" ADD CONSTRAINT "schedule_versions_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_versions" ADD CONSTRAINT "schedule_versions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_versions" ADD CONSTRAINT "schedule_versions_change_category_id_fkey" FOREIGN KEY ("change_category_id") REFERENCES "public"."change_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_versions" ADD CONSTRAINT "schedule_versions_change_type_id_fkey" FOREIGN KEY ("change_type_id") REFERENCES "public"."change_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."taggables" ADD CONSTRAINT "taggables_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_templates" ADD CONSTRAINT "task_templates_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_template_items" ADD CONSTRAINT "task_template_items_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "public"."task_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_template_items" ADD CONSTRAINT "task_template_items_task_type_id_fkey" FOREIGN KEY ("task_type_id") REFERENCES "public"."task_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_template_items" ADD CONSTRAINT "task_template_items_input_type_id_fkey" FOREIGN KEY ("input_type_id") REFERENCES "public"."task_input_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_task_template_item_id_fkey" FOREIGN KEY ("task_template_item_id") REFERENCES "public"."task_template_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_task_status_id_fkey" FOREIGN KEY ("task_status_id") REFERENCES "public"."task_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audits" ADD CONSTRAINT "audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
