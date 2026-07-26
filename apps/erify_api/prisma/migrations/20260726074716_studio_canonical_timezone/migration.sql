-- CUSTOM SQL START: nullable-first Studio.timezone rollout
-- Prisma generated an unconditional `ADD COLUMN ... NOT NULL`, which cannot run
-- against existing rows. Replaced with the reviewed add-nullable -> backfill ->
-- verify -> enforce sequence required by SCENE_QC_IMPLEMENTATION_PLAN.md §5.
-- There is deliberately no DEFAULT: a DB default is the silent fallback the
-- product contract forbids.

-- 1. Add nullable.
ALTER TABLE "studios" ADD COLUMN "timezone" TEXT;

-- 2. Explicit reviewed Studio -> IANA mapping. Keyed on the unique studio name
--    so it is portable across environments and human-reviewable. Every studio
--    row (including soft-deleted rows — NOT NULL applies to all of them) must
--    appear here. Regenerate this list from
--    `SELECT name, deleted_at FROM studios ORDER BY id;` in the target
--    environment before deploying, and extend it rather than adding a blanket
--    UPDATE. See docs/tech-debt/scene-qc-studio-timezone-no-write-path.md
--    for why every studio is Asia/Bangkok today.
UPDATE "studios" AS s
SET "timezone" = m."timezone"
FROM (VALUES
  ('Main Studio', 'Asia/Bangkok')
) AS m("name", "timezone")
WHERE s."name" = m."name"
  AND s."timezone" IS NULL;

-- 3. Fail loudly rather than guessing.
DO $$
DECLARE offenders TEXT;
BEGIN
  SELECT string_agg("name", ', ') INTO offenders
    FROM "studios" WHERE "timezone" IS NULL;
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'Migration aborted: studios without a reviewed IANA timezone: %', offenders;
  END IF;

  SELECT string_agg(s."name", ', ') INTO offenders
    FROM "studios" s
   WHERE NOT EXISTS (SELECT 1 FROM pg_timezone_names t WHERE t.name = s."timezone");
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'Migration aborted: studios with an unknown IANA timezone: %', offenders;
  END IF;
END $$;

-- 4. Enforce.
ALTER TABLE "studios" ALTER COLUMN "timezone" SET NOT NULL;
-- CUSTOM SQL END
