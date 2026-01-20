-- DropForeignKey
ALTER TABLE "shows" DROP CONSTRAINT "shows_schedule_id_fkey";

-- AddForeignKey
ALTER TABLE "shows" ADD CONSTRAINT "shows_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
