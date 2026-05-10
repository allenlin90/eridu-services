-- CreateEnum
CREATE TYPE "CompensationItemType" AS ENUM ('BONUS', 'ALLOWANCE', 'OVERTIME', 'DEDUCTION', 'OTHER');

-- CreateEnum
CREATE TYPE "CompensationLineItemTargetType" AS ENUM ('SHOW', 'SHOW_CREATOR', 'STUDIO_SHIFT', 'STUDIO_SHIFT_BLOCK');

-- CreateTable
CREATE TABLE "compensation_line_items" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "studio_id" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "item_type" "CompensationItemType" NOT NULL,
    "reason" TEXT NOT NULL,
    "target_type" "CompensationLineItemTargetType" NOT NULL,
    "target_id" BIGINT NOT NULL,
    "show_id" BIGINT,
    "show_creator_id" BIGINT,
    "studio_shift_id" BIGINT,
    "studio_shift_block_id" BIGINT,
    "created_by_id" BIGINT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "compensation_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compensation_line_items_uid_key" ON "compensation_line_items"("uid");

-- CreateIndex
CREATE INDEX "compensation_line_items_studio_id_deleted_at_idx" ON "compensation_line_items"("studio_id", "deleted_at");

-- CreateIndex
CREATE INDEX "compensation_line_items_target_type_target_id_deleted_at_idx" ON "compensation_line_items"("target_type", "target_id", "deleted_at");

-- CreateIndex
CREATE INDEX "compensation_line_items_show_id_idx" ON "compensation_line_items"("show_id");

-- CreateIndex
CREATE INDEX "compensation_line_items_show_creator_id_idx" ON "compensation_line_items"("show_creator_id");

-- CreateIndex
CREATE INDEX "compensation_line_items_studio_shift_id_idx" ON "compensation_line_items"("studio_shift_id");

-- CreateIndex
CREATE INDEX "compensation_line_items_studio_shift_block_id_idx" ON "compensation_line_items"("studio_shift_block_id");

-- CreateIndex
CREATE INDEX "compensation_line_items_created_by_id_idx" ON "compensation_line_items"("created_by_id");

-- CreateIndex
CREATE INDEX "compensation_line_items_deleted_at_idx" ON "compensation_line_items"("deleted_at");

-- AddForeignKey
ALTER TABLE "compensation_line_items" ADD CONSTRAINT "compensation_line_items_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_line_items" ADD CONSTRAINT "compensation_line_items_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_line_items" ADD CONSTRAINT "compensation_line_items_show_creator_id_fkey" FOREIGN KEY ("show_creator_id") REFERENCES "show_creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_line_items" ADD CONSTRAINT "compensation_line_items_studio_shift_id_fkey" FOREIGN KEY ("studio_shift_id") REFERENCES "studio_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_line_items" ADD CONSTRAINT "compensation_line_items_studio_shift_block_id_fkey" FOREIGN KEY ("studio_shift_block_id") REFERENCES "studio_shift_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_line_items" ADD CONSTRAINT "compensation_line_items_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
