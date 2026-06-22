-- CreateEnum
CREATE TYPE "CreatorType" AS ENUM ('STANDARD', 'FLEXIBLE', 'OTHER');

-- AlterTable
ALTER TABLE "creators" ADD COLUMN     "type" "CreatorType" NOT NULL DEFAULT 'STANDARD';
