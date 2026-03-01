-- Add new columns
ALTER TABLE "show_status" ADD COLUMN "system_key" TEXT;
ALTER TABLE "shows" ADD COLUMN "external_id" TEXT;

-- Backfill known status system keys so runtime upsert-by-system_key does not
-- collide with existing unique name values (e.g. "cancelled").
UPDATE "show_status"
SET "system_key" = CASE lower("name")
  WHEN 'draft' THEN 'DRAFT'
  WHEN 'confirmed' THEN 'CONFIRMED'
  WHEN 'live' THEN 'LIVE'
  WHEN 'completed' THEN 'COMPLETED'
  WHEN 'cancelled' THEN 'CANCELLED'
  ELSE "system_key"
END
WHERE "system_key" IS NULL
  AND lower("name") IN ('draft', 'confirmed', 'live', 'completed', 'cancelled');

-- Seed missing cancelled_pending_resolution status (idempotent).
INSERT INTO "show_status" (
  "uid",
  "name",
  "system_key",
  "metadata",
  "created_at",
  "updated_at"
)
SELECT
  'shst_' || substring(md5(random()::text || clock_timestamp()::text), 1, 21),
  'cancelled_pending_resolution',
  'CANCELLED_PENDING_RESOLUTION',
  '{}'::jsonb,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM "show_status"
  WHERE lower("name") = 'cancelled_pending_resolution'
     OR "system_key" = 'CANCELLED_PENDING_RESOLUTION'
);

-- Precheck guard: duplicated non-null system keys.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "show_status"
    WHERE "system_key" IS NOT NULL
    GROUP BY "system_key"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration aborted: duplicate non-null show_status.system_key values found';
  END IF;
END $$;

-- Precheck guard: duplicated non-null (client_id, external_id).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "shows"
    WHERE "external_id" IS NOT NULL
    GROUP BY "client_id", "external_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration aborted: duplicate (client_id, external_id) values found in shows';
  END IF;
END $$;

-- Add indexes after data guards/backfills.
CREATE UNIQUE INDEX "show_status_system_key_key" ON "show_status"("system_key");
CREATE UNIQUE INDEX "shows_client_id_external_id_key" ON "shows"("client_id", "external_id");
