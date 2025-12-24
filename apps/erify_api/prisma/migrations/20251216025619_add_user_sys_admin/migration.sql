-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_system_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "users_is_system_admin_idx" ON "users"("is_system_admin");
