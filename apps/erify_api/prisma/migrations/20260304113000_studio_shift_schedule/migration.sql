-- Studio membership base hourly rate
ALTER TABLE "studio_memberships"
ADD COLUMN "base_hourly_rate" DECIMAL(10, 2);

-- Studio shift status enum
CREATE TYPE "StudioShiftStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- Studio shifts table
CREATE TABLE "studio_shifts" (
  "id" BIGSERIAL NOT NULL,
  "uid" TEXT NOT NULL,
  "studio_id" BIGINT NOT NULL,
  "user_id" BIGINT NOT NULL,
  "date" DATE NOT NULL,
  "hourly_rate" DECIMAL(10, 2) NOT NULL,
  "projected_cost" DECIMAL(10, 2) NOT NULL,
  "calculated_cost" DECIMAL(10, 2),
  "is_approved" BOOLEAN NOT NULL DEFAULT false,
  "is_duty_manager" BOOLEAN NOT NULL DEFAULT false,
  "status" "StudioShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "studio_shifts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_shifts_uid_key" ON "studio_shifts"("uid");
CREATE INDEX "studio_shifts_studio_id_date_idx" ON "studio_shifts"("studio_id", "date");
CREATE INDEX "studio_shifts_user_id_date_idx" ON "studio_shifts"("user_id", "date");
CREATE INDEX "studio_shifts_studio_id_is_duty_manager_date_idx" ON "studio_shifts"("studio_id", "is_duty_manager", "date");
CREATE INDEX "studio_shifts_deleted_at_idx" ON "studio_shifts"("deleted_at");
CREATE INDEX "studio_shifts_studio_id_deleted_at_idx" ON "studio_shifts"("studio_id", "deleted_at");
CREATE INDEX "studio_shifts_user_id_deleted_at_idx" ON "studio_shifts"("user_id", "deleted_at");

ALTER TABLE "studio_shifts"
ADD CONSTRAINT "studio_shifts_studio_id_fkey"
FOREIGN KEY ("studio_id") REFERENCES "studios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "studio_shifts"
ADD CONSTRAINT "studio_shifts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Studio shift blocks table
CREATE TABLE "studio_shift_blocks" (
  "id" BIGSERIAL NOT NULL,
  "uid" TEXT NOT NULL,
  "shift_id" BIGINT NOT NULL,
  "start_time" TIMESTAMP(3) NOT NULL,
  "end_time" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "studio_shift_blocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_shift_blocks_uid_key" ON "studio_shift_blocks"("uid");
CREATE INDEX "studio_shift_blocks_shift_id_idx" ON "studio_shift_blocks"("shift_id");
CREATE INDEX "studio_shift_blocks_start_time_end_time_idx" ON "studio_shift_blocks"("start_time", "end_time");
CREATE INDEX "studio_shift_blocks_deleted_at_idx" ON "studio_shift_blocks"("deleted_at");
CREATE INDEX "studio_shift_blocks_shift_id_deleted_at_idx" ON "studio_shift_blocks"("shift_id", "deleted_at");

ALTER TABLE "studio_shift_blocks"
ADD CONSTRAINT "studio_shift_blocks_shift_id_fkey"
FOREIGN KEY ("shift_id") REFERENCES "studio_shifts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
