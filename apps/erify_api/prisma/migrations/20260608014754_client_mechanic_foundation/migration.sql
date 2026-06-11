-- CreateTable
CREATE TABLE "client_mechanics" (
    "id" BIGSERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "client_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "instruction_label" TEXT NOT NULL,
    "instruction_body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "content_revision" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "client_mechanics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_mechanics_uid_key" ON "client_mechanics"("uid");

-- CreateIndex
CREATE INDEX "client_mechanics_created_by_idx" ON "client_mechanics"("created_by");

-- CreateIndex
CREATE INDEX "client_mechanics_deleted_at_idx" ON "client_mechanics"("deleted_at");

-- CreateIndex
CREATE INDEX "client_mechanics_client_id_deleted_at_idx" ON "client_mechanics"("client_id", "deleted_at");

-- CreateIndex
CREATE INDEX "client_mechanics_client_id_status_deleted_at_idx" ON "client_mechanics"("client_id", "status", "deleted_at");

-- AddForeignKey
ALTER TABLE "client_mechanics" ADD CONSTRAINT "client_mechanics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_mechanics" ADD CONSTRAINT "client_mechanics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
