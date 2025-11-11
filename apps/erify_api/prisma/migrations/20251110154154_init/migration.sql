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
    "name" TEXT NOT NULL,
    "alias_name" TEXT NOT NULL,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "user_id" BIGINT,
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
    "name" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "client_id" BIGINT NOT NULL,
    "studio_room_id" BIGINT,
    "show_type_id" BIGINT NOT NULL,
    "show_status_id" BIGINT NOT NULL,
    "show_standard_id" BIGINT NOT NULL,
    "schedule_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "shows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."show_mcs" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "show_id" BIGINT NOT NULL,
    "mc_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "show_mcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."show_platforms" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "live_stream_link" TEXT NOT NULL,
    "platform_show_id" TEXT NOT NULL,
    "viewer_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "show_id" BIGINT NOT NULL,
    "platform_id" BIGINT NOT NULL,
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
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "studio_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "studio_rooms_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."studio_memberships" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "user_id" BIGINT NOT NULL,
    "studio_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "studio_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedules" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "plan_document" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "client_id" BIGINT,
    "created_by" BIGINT,
    "published_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "plan_document" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "snapshot_reason" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" BIGINT,
    "schedule_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_snapshots_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "users_deleted_at_idx" ON "public"."users"("deleted_at");

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
CREATE INDEX "mcs_deleted_at_idx" ON "public"."mcs"("deleted_at");

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
CREATE INDEX "clients_deleted_at_idx" ON "public"."clients"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_uid_key" ON "public"."platforms"("uid");

-- CreateIndex
CREATE INDEX "platforms_uid_idx" ON "public"."platforms"("uid");

-- CreateIndex
CREATE INDEX "platforms_name_idx" ON "public"."platforms"("name");

-- CreateIndex
CREATE INDEX "platforms_deleted_at_idx" ON "public"."platforms"("deleted_at");

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
CREATE INDEX "shows_show_type_id_idx" ON "public"."shows"("show_type_id");

-- CreateIndex
CREATE INDEX "shows_show_status_id_idx" ON "public"."shows"("show_status_id");

-- CreateIndex
CREATE INDEX "shows_show_standard_id_idx" ON "public"."shows"("show_standard_id");

-- CreateIndex
CREATE INDEX "shows_schedule_id_idx" ON "public"."shows"("schedule_id");

-- CreateIndex
CREATE INDEX "shows_start_time_end_time_idx" ON "public"."shows"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "shows_start_time_idx" ON "public"."shows"("start_time");

-- CreateIndex
CREATE INDEX "shows_end_time_idx" ON "public"."shows"("end_time");

-- CreateIndex
CREATE INDEX "shows_deleted_at_idx" ON "public"."shows"("deleted_at");

-- CreateIndex
CREATE INDEX "shows_client_id_deleted_at_idx" ON "public"."shows"("client_id", "deleted_at");

-- CreateIndex
CREATE INDEX "shows_studio_room_id_deleted_at_idx" ON "public"."shows"("studio_room_id", "deleted_at");

-- CreateIndex
CREATE INDEX "shows_schedule_id_deleted_at_idx" ON "public"."shows"("schedule_id", "deleted_at");

-- CreateIndex
CREATE INDEX "shows_show_status_id_deleted_at_idx" ON "public"."shows"("show_status_id", "deleted_at");

-- CreateIndex
CREATE INDEX "shows_start_time_deleted_at_idx" ON "public"."shows"("start_time", "deleted_at");

-- CreateIndex
CREATE INDEX "shows_client_id_start_time_idx" ON "public"."shows"("client_id", "start_time");

-- CreateIndex
CREATE INDEX "shows_client_id_start_time_deleted_at_idx" ON "public"."shows"("client_id", "start_time", "deleted_at");

-- CreateIndex
CREATE INDEX "shows_client_id_show_status_id_deleted_at_idx" ON "public"."shows"("client_id", "show_status_id", "deleted_at");

-- CreateIndex
CREATE INDEX "shows_client_id_show_status_id_start_time_deleted_at_idx" ON "public"."shows"("client_id", "show_status_id", "start_time", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "show_mcs_uid_key" ON "public"."show_mcs"("uid");

-- CreateIndex
CREATE INDEX "show_mcs_uid_idx" ON "public"."show_mcs"("uid");

-- CreateIndex
CREATE INDEX "show_mcs_show_id_idx" ON "public"."show_mcs"("show_id");

-- CreateIndex
CREATE INDEX "show_mcs_mc_id_idx" ON "public"."show_mcs"("mc_id");

-- CreateIndex
CREATE INDEX "show_mcs_deleted_at_idx" ON "public"."show_mcs"("deleted_at");

-- CreateIndex
CREATE INDEX "show_mcs_show_id_deleted_at_idx" ON "public"."show_mcs"("show_id", "deleted_at");

-- CreateIndex
CREATE INDEX "show_mcs_mc_id_deleted_at_idx" ON "public"."show_mcs"("mc_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "show_mcs_show_id_mc_id_key" ON "public"."show_mcs"("show_id", "mc_id");

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
CREATE INDEX "show_platforms_deleted_at_idx" ON "public"."show_platforms"("deleted_at");

-- CreateIndex
CREATE INDEX "show_platforms_show_id_deleted_at_idx" ON "public"."show_platforms"("show_id", "deleted_at");

-- CreateIndex
CREATE INDEX "show_platforms_platform_id_deleted_at_idx" ON "public"."show_platforms"("platform_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "show_platforms_show_id_platform_id_key" ON "public"."show_platforms"("show_id", "platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "studios_uid_key" ON "public"."studios"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "studios_name_key" ON "public"."studios"("name");

-- CreateIndex
CREATE INDEX "studios_uid_idx" ON "public"."studios"("uid");

-- CreateIndex
CREATE INDEX "studios_name_idx" ON "public"."studios"("name");

-- CreateIndex
CREATE INDEX "studios_deleted_at_idx" ON "public"."studios"("deleted_at");

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
CREATE INDEX "studio_rooms_deleted_at_idx" ON "public"."studio_rooms"("deleted_at");

-- CreateIndex
CREATE INDEX "studio_rooms_studio_id_deleted_at_idx" ON "public"."studio_rooms"("studio_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "studio_rooms_studio_id_name_key" ON "public"."studio_rooms"("studio_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "show_types_uid_key" ON "public"."show_types"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "show_types_name_key" ON "public"."show_types"("name");

-- CreateIndex
CREATE INDEX "show_types_uid_idx" ON "public"."show_types"("uid");

-- CreateIndex
CREATE INDEX "show_types_deleted_at_idx" ON "public"."show_types"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "show_status_uid_key" ON "public"."show_status"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "show_status_name_key" ON "public"."show_status"("name");

-- CreateIndex
CREATE INDEX "show_status_uid_idx" ON "public"."show_status"("uid");

-- CreateIndex
CREATE INDEX "show_status_deleted_at_idx" ON "public"."show_status"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "show_standards_uid_key" ON "public"."show_standards"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "show_standards_name_key" ON "public"."show_standards"("name");

-- CreateIndex
CREATE INDEX "show_standards_uid_idx" ON "public"."show_standards"("uid");

-- CreateIndex
CREATE INDEX "show_standards_deleted_at_idx" ON "public"."show_standards"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "studio_memberships_uid_key" ON "public"."studio_memberships"("uid");

-- CreateIndex
CREATE INDEX "studio_memberships_uid_idx" ON "public"."studio_memberships"("uid");

-- CreateIndex
CREATE INDEX "studio_memberships_user_id_idx" ON "public"."studio_memberships"("user_id");

-- CreateIndex
CREATE INDEX "studio_memberships_studio_id_idx" ON "public"."studio_memberships"("studio_id");

-- CreateIndex
CREATE INDEX "studio_memberships_role_idx" ON "public"."studio_memberships"("role");

-- CreateIndex
CREATE INDEX "studio_memberships_user_id_role_idx" ON "public"."studio_memberships"("user_id", "role");

-- CreateIndex
CREATE INDEX "studio_memberships_deleted_at_idx" ON "public"."studio_memberships"("deleted_at");

-- CreateIndex
CREATE INDEX "studio_memberships_user_id_deleted_at_idx" ON "public"."studio_memberships"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "studio_memberships_studio_id_deleted_at_idx" ON "public"."studio_memberships"("studio_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "studio_memberships_user_id_studio_id_key" ON "public"."studio_memberships"("user_id", "studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_uid_key" ON "public"."schedules"("uid");

-- CreateIndex
CREATE INDEX "schedules_uid_idx" ON "public"."schedules"("uid");

-- CreateIndex
CREATE INDEX "schedules_client_id_idx" ON "public"."schedules"("client_id");

-- CreateIndex
CREATE INDEX "schedules_status_idx" ON "public"."schedules"("status");

-- CreateIndex
CREATE INDEX "schedules_published_at_idx" ON "public"."schedules"("published_at");

-- CreateIndex
CREATE INDEX "schedules_start_date_end_date_idx" ON "public"."schedules"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "schedules_client_id_start_date_idx" ON "public"."schedules"("client_id", "start_date");

-- CreateIndex
CREATE INDEX "schedules_client_id_start_date_deleted_at_idx" ON "public"."schedules"("client_id", "start_date", "deleted_at");

-- CreateIndex
CREATE INDEX "schedules_client_id_start_date_end_date_idx" ON "public"."schedules"("client_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "schedules_client_id_start_date_end_date_deleted_at_idx" ON "public"."schedules"("client_id", "start_date", "end_date", "deleted_at");

-- CreateIndex
CREATE INDEX "schedules_created_by_idx" ON "public"."schedules"("created_by");

-- CreateIndex
CREATE INDEX "schedules_deleted_at_idx" ON "public"."schedules"("deleted_at");

-- CreateIndex
CREATE INDEX "schedules_status_deleted_at_idx" ON "public"."schedules"("status", "deleted_at");

-- CreateIndex
CREATE INDEX "schedules_client_id_deleted_at_idx" ON "public"."schedules"("client_id", "deleted_at");

-- CreateIndex
CREATE INDEX "schedules_client_id_status_deleted_at_idx" ON "public"."schedules"("client_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "schedules_client_id_status_start_date_deleted_at_idx" ON "public"."schedules"("client_id", "status", "start_date", "deleted_at");

-- CreateIndex
CREATE INDEX "schedules_created_by_deleted_at_idx" ON "public"."schedules"("created_by", "deleted_at");

-- CreateIndex
CREATE INDEX "schedules_published_by_deleted_at_idx" ON "public"."schedules"("published_by", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_snapshots_uid_key" ON "public"."schedule_snapshots"("uid");

-- CreateIndex
CREATE INDEX "schedule_snapshots_uid_idx" ON "public"."schedule_snapshots"("uid");

-- CreateIndex
CREATE INDEX "schedule_snapshots_schedule_id_version_idx" ON "public"."schedule_snapshots"("schedule_id", "version");

-- CreateIndex
CREATE INDEX "schedule_snapshots_schedule_id_created_at_idx" ON "public"."schedule_snapshots"("schedule_id", "created_at");

-- CreateIndex
CREATE INDEX "schedule_snapshots_created_by_idx" ON "public"."schedule_snapshots"("created_by");

-- CreateIndex
CREATE INDEX "schedule_snapshots_created_by_created_at_idx" ON "public"."schedule_snapshots"("created_by", "created_at");

-- AddForeignKey
ALTER TABLE "public"."mcs" ADD CONSTRAINT "mcs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_studio_room_id_fkey" FOREIGN KEY ("studio_room_id") REFERENCES "public"."studio_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_show_type_id_fkey" FOREIGN KEY ("show_type_id") REFERENCES "public"."show_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_show_status_id_fkey" FOREIGN KEY ("show_status_id") REFERENCES "public"."show_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_show_standard_id_fkey" FOREIGN KEY ("show_standard_id") REFERENCES "public"."show_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shows" ADD CONSTRAINT "shows_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."show_mcs" ADD CONSTRAINT "show_mcs_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."show_mcs" ADD CONSTRAINT "show_mcs_mc_id_fkey" FOREIGN KEY ("mc_id") REFERENCES "public"."mcs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."show_platforms" ADD CONSTRAINT "show_platforms_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."show_platforms" ADD CONSTRAINT "show_platforms_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_rooms" ADD CONSTRAINT "studio_rooms_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_memberships" ADD CONSTRAINT "studio_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_memberships" ADD CONSTRAINT "studio_memberships_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_snapshots" ADD CONSTRAINT "schedule_snapshots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_snapshots" ADD CONSTRAINT "schedule_snapshots_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
