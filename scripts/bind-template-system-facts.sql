-- scripts/bind-template-system-facts.sql
--
-- Add system_fact_key bindings to the 3 task templates that have structurally
-- compatible fields. Without bindings the fact-extraction pipeline has nothing
-- to extract on bulk-approval, leaving show-run-review / sign-off blank.
--
-- NOTE: "current_schema" is double-quoted throughout — it collides with the
-- Postgres built-in function current_schema(). Never remove the quotes.
--
-- Idempotent: each block checks for an existing binding before mutating.

BEGIN;

-- ── 1. QC Review ─────────────────────────────────────────────────────────────
-- fld_rty9ddwwpoo  Start Time (datetime) → show_actual_start_time
DO $$
DECLARE
  v_id     BIGINT;
  v_ver    INTEGER;
  v_schema JSONB;
  v_fld    TEXT := 'fld_rty9ddwwpoo';
  v_key    TEXT := 'show_actual_start_time';
BEGIN
  SELECT id INTO v_id FROM task_templates
  WHERE uid = 'ttpl_7DyQX8KM5_jNHRpPuYsn' AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    RAISE NOTICE 'SKIP — QC Review template not found'; RETURN;
  END IF;

  -- Idempotency: skip if already bound
  IF EXISTS (
    SELECT 1 FROM task_templates t,
      LATERAL jsonb_array_elements(t."current_schema"->'items') item
    WHERE t.id = v_id
      AND item->>'id' = v_fld
      AND item->>'system_fact_key' = v_key
  ) THEN
    RAISE NOTICE 'SKIP — QC Review % already bound to %', v_fld, v_key; RETURN;
  END IF;

  -- Rebuild items array, patching only the target field
  SELECT jsonb_set(
    "current_schema",
    '{items}',
    (SELECT jsonb_agg(
       CASE WHEN item->>'id' = v_fld
            THEN item || jsonb_build_object('system_fact_key', v_key)
            ELSE item END
       ORDER BY ordinality)
     FROM jsonb_array_elements("current_schema"->'items')
          WITH ORDINALITY AS t(item, ordinality))
  ) INTO v_schema
  FROM task_templates WHERE id = v_id;

  v_ver := (SELECT version + 1 FROM task_templates WHERE id = v_id);

  UPDATE task_templates
    SET "current_schema" = v_schema, version = v_ver, updated_at = NOW()
    WHERE id = v_id;

  INSERT INTO task_template_snapshots (template_id, version, schema, metadata, created_at)
    VALUES (v_id, v_ver, v_schema, '{}'::jsonb, NOW());

  RAISE NOTICE 'OK — QC Review: % → % (version → %)', v_fld, v_key, v_ver;
END $$;

-- ── 2. On air_check ──────────────────────────────────────────────────────────
-- fld_38hd4mpo7z4  Show_Start (datetime) → show_actual_start_time
DO $$
DECLARE
  v_id     BIGINT;
  v_ver    INTEGER;
  v_schema JSONB;
  v_fld    TEXT := 'fld_38hd4mpo7z4';
  v_key    TEXT := 'show_actual_start_time';
BEGIN
  SELECT id INTO v_id FROM task_templates
  WHERE uid = 'ttpl_OtVn1kdHi_V_8TZftv52' AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    RAISE NOTICE 'SKIP — On air_check template not found'; RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM task_templates t,
      LATERAL jsonb_array_elements(t."current_schema"->'items') item
    WHERE t.id = v_id
      AND item->>'id' = v_fld
      AND item->>'system_fact_key' = v_key
  ) THEN
    RAISE NOTICE 'SKIP — On air_check % already bound to %', v_fld, v_key; RETURN;
  END IF;

  SELECT jsonb_set(
    "current_schema",
    '{items}',
    (SELECT jsonb_agg(
       CASE WHEN item->>'id' = v_fld
            THEN item || jsonb_build_object('system_fact_key', v_key)
            ELSE item END
       ORDER BY ordinality)
     FROM jsonb_array_elements("current_schema"->'items')
          WITH ORDINALITY AS t(item, ordinality))
  ) INTO v_schema
  FROM task_templates WHERE id = v_id;

  v_ver := (SELECT version + 1 FROM task_templates WHERE id = v_id);

  UPDATE task_templates
    SET "current_schema" = v_schema, version = v_ver, updated_at = NOW()
    WHERE id = v_id;

  INSERT INTO task_template_snapshots (template_id, version, schema, metadata, created_at)
    VALUES (v_id, v_ver, v_schema, '{}'::jsonb, NOW());

  RAISE NOTICE 'OK — On air_check: % → % (version → %)', v_fld, v_key, v_ver;
END $$;

-- ── 3. Post_production_check ──────────────────────────────────────────────────
-- fld_5rxs4x6luv9  Violation_status: select → multiselect + show_platform_violation
-- Simple single-option multiselect (boolean-style check). Drops require_reason.
-- Refinement (more violation labels) deferred until proper taxonomy is designed.
DO $$
DECLARE
  v_id      BIGINT;
  v_ver     INTEGER;
  v_schema  JSONB;
  v_fld     TEXT := 'fld_5rxs4x6luv9';
  v_key     TEXT := 'show_platform_violation';
  v_options JSONB := '[{"id":"opt_platform_violation","value":"platform_violation","label":"Platform violation"}]';
BEGIN
  SELECT id INTO v_id FROM task_templates
  WHERE uid = 'ttpl_n6f7qAZQmPA4He6MOR-y' AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    RAISE NOTICE 'SKIP — Post_production_check template not found'; RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM task_templates t,
      LATERAL jsonb_array_elements(t."current_schema"->'items') item
    WHERE t.id = v_id
      AND item->>'id' = v_fld
      AND item->>'system_fact_key' = v_key
  ) THEN
    RAISE NOTICE 'SKIP — Post_production_check % already bound to %', v_fld, v_key; RETURN;
  END IF;

  SELECT jsonb_set(
    "current_schema",
    '{items}',
    (SELECT jsonb_agg(
       CASE WHEN item->>'id' = v_fld
            THEN
              -- Strip old type/options/validation/default_value/system_fact_key, add new ones
              (item - 'type' - 'options' - 'validation' - 'default_value' - 'system_fact_key')
              || jsonb_build_object(
                   'type',            'multiselect',
                   'options',         v_options,
                   'validation',      '{}'::jsonb,
                   'default_value',   '[]'::jsonb,
                   'system_fact_key', v_key)
            ELSE item END
       ORDER BY ordinality)
     FROM jsonb_array_elements("current_schema"->'items')
          WITH ORDINALITY AS t(item, ordinality))
  ) INTO v_schema
  FROM task_templates WHERE id = v_id;

  v_ver := (SELECT version + 1 FROM task_templates WHERE id = v_id);

  UPDATE task_templates
    SET "current_schema" = v_schema, version = v_ver, updated_at = NOW()
    WHERE id = v_id;

  INSERT INTO task_template_snapshots (template_id, version, schema, metadata, created_at)
    VALUES (v_id, v_ver, v_schema, '{}'::jsonb, NOW());

  RAISE NOTICE 'OK — Post_production_check: % → multiselect/% (version → %)', v_fld, v_key, v_ver;
END $$;

-- ── 4. On air_check — MC_attended → creator_attendance_missing ───────────────
-- fld_x58ec4zecif was a 3-way select (on_time / late / missing). The
-- creator_attendance_missing extractor expects a boolean (checkbox). Replace:
--   type: select → checkbox
--   options: dropped (not valid on checkbox)
--   default_value: "" → false
--   validation.require_reason: [{op:neq,value:on_time}] → "on-true"
--     (operator is prompted for a reason when the box is checked; that reason
--      flows to ShowCreator.attendanceReason via the __reason sidecar)
--   system_fact_key: creator_attendance_missing (hydrated scope: per creator)
--
-- MC_late (mins) and Livestream_late/missing_reason are left unchanged —
-- there are no fact keys for these fields; lateness is derived from
-- creator_actual_start_time vs Show.startTime by the read layer.
DO $$
DECLARE
  v_id     BIGINT;
  v_ver    INTEGER;
  v_schema JSONB;
  v_fld    TEXT := 'fld_x58ec4zecif';
  v_key    TEXT := 'creator_attendance_missing';
BEGIN
  SELECT id INTO v_id FROM task_templates
  WHERE uid = 'ttpl_OtVn1kdHi_V_8TZftv52' AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    RAISE NOTICE 'SKIP — On air_check template not found'; RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM task_templates t,
      LATERAL jsonb_array_elements(t."current_schema"->'items') item
    WHERE t.id = v_id
      AND item->>'id' = v_fld
      AND item->>'system_fact_key' = v_key
  ) THEN
    RAISE NOTICE 'SKIP — On air_check % already bound to %', v_fld, v_key; RETURN;
  END IF;

  SELECT jsonb_set(
    "current_schema",
    '{items}',
    (SELECT jsonb_agg(
       CASE WHEN item->>'id' = v_fld
            THEN
              -- Drop type, options, validation, default_value; keep id, key, label, required, description
              (item - 'type' - 'options' - 'validation' - 'default_value' - 'system_fact_key')
              || jsonb_build_object(
                   'type',            'checkbox',
                   'default_value',   false,
                   'validation',      jsonb_build_object('require_reason', 'on-true'),
                   'system_fact_key', v_key)
            ELSE item END
       ORDER BY ordinality)
     FROM jsonb_array_elements("current_schema"->'items')
          WITH ORDINALITY AS t(item, ordinality))
  ) INTO v_schema
  FROM task_templates WHERE id = v_id;

  v_ver := (SELECT version + 1 FROM task_templates WHERE id = v_id);

  UPDATE task_templates
    SET "current_schema" = v_schema, version = v_ver, updated_at = NOW()
    WHERE id = v_id;

  INSERT INTO task_template_snapshots (template_id, version, schema, metadata, created_at)
    VALUES (v_id, v_ver, v_schema, '{}'::jsonb, NOW());

  RAISE NOTICE 'OK — On air_check: % → checkbox/% (version → %)', v_fld, v_key, v_ver;
END $$;

COMMIT;
