-- AlterTable
ALTER TABLE "shows" ADD COLUMN     "actual_end_time" TIMESTAMP(3),
ADD COLUMN     "actual_start_time" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "studio_shift_blocks" ADD COLUMN     "actual_end_time" TIMESTAMP(3),
ADD COLUMN     "actual_start_time" TIMESTAMP(3);
