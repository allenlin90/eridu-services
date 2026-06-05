-- bind-template-system-facts.sql
--
-- Generic, idempotent task-template fact-binding migration.
--
-- A single transient PL/pgSQL helper (bind_template_fact) does all the work:
-- resolve a template by UID, skip if already bound, guard the field type against
-- the fact-key catalog, patch the field, bump version, and write a new snapshot.
-- Adding a binding = add one SELECT call to the worked-example list below.
--
-- The helper is created inside the transaction and DROPped before COMMIT, so it
-- never persists as a schema object.
--
-- NOTE: "current_schema" is double-quoted throughout — it collides with the
-- Postgres built-in function current_schema(). Never remove the quotes.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: bind a single template field to a system fact key (idempotent).
--
--   p_uid      template UID (robust to internal id drift between envs)
--   p_field_id field item id (e.g. 'fld_...')
--   p_key      system_fact_key from the catalog
--   p_patch    JSONB merged into the field BEFORE the binding is added.
--              Use it for type changes. Convention:
--                • a key with a non-null value SETS that property
--                • a key with JSON null REMOVES that property
--              e.g. '{"type":"checkbox","options":null}' converts a field to a
--              checkbox and strips the now-invalid options array.
--
-- Type guard: the field's resulting type (p_patch.type if present, else the
-- field's current type) must equal the catalog's required type for p_key, or the
-- migration aborts. Source of truth for the catalog:
--   packages/api-types/src/task-management/template-definition.schema.ts
--   (SYSTEM_FACT_KEY_DEFINITIONS). The key->required_type CASE below duplicates it;
--   check-fact-key-sync.mjs (run by the shell runner before applying) fails the
--   migration if the two drift, so this map cannot silently fall out of sync.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bind_template_fact(
  p_uid      TEXT,
  p_field_id TEXT,
  p_key      TEXT,
  p_patch    JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
DECLARE
  v_id            BIGINT;
  v_ver           INTEGER;
  v_schema        JSONB;
  v_required_type TEXT;
  v_result_type   TEXT;
  v_field_exists  BOOLEAN;
  v_set           JSONB;
  v_remove        TEXT[];
BEGIN
  v_required_type := CASE p_key
    WHEN 'show_actual_start_time'          THEN 'datetime'
    WHEN 'show_actual_end_time'            THEN 'datetime'
    WHEN 'creator_actual_start_time'       THEN 'datetime'
    WHEN 'creator_actual_end_time'         THEN 'datetime'
    WHEN 'creator_attendance_missing'      THEN 'checkbox'
    WHEN 'show_platform_actual_start_time' THEN 'datetime'
    WHEN 'show_platform_actual_end_time'   THEN 'datetime'
    WHEN 'show_platform_violation'         THEN 'multiselect'
    WHEN 'show_platform_gmv'               THEN 'number'
    WHEN 'show_platform_view_count'        THEN 'number'
    WHEN 'show_platform_ctr'               THEN 'number'
    WHEN 'show_platform_cto'               THEN 'number'
    ELSE NULL
  END;

  IF v_required_type IS NULL THEN
    RAISE EXCEPTION 'Unknown system_fact_key "%" — not in catalog', p_key;
  END IF;

  -- Resolve template by UID
  SELECT id INTO v_id FROM task_templates
  WHERE uid = p_uid AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    RAISE NOTICE 'SKIP — template % not found', p_uid;
    RETURN;
  END IF;

  -- Field must exist
  SELECT EXISTS (
    SELECT 1 FROM task_templates t,
      LATERAL jsonb_array_elements(t."current_schema"->'items') item
    WHERE t.id = v_id AND item->>'id' = p_field_id
  ) INTO v_field_exists;

  IF NOT v_field_exists THEN
    RAISE EXCEPTION 'Field % not found on template %', p_field_id, p_uid;
  END IF;

  -- Idempotency: skip if already bound to this key
  IF EXISTS (
    SELECT 1 FROM task_templates t,
      LATERAL jsonb_array_elements(t."current_schema"->'items') item
    WHERE t.id = v_id
      AND item->>'id' = p_field_id
      AND item->>'system_fact_key' = p_key
  ) THEN
    RAISE NOTICE 'SKIP — % field % already bound to %', p_uid, p_field_id, p_key;
    RETURN;
  END IF;

  -- Split patch into set (non-null) and remove (JSON null) properties
  v_set := COALESCE(
    (SELECT jsonb_object_agg(e.k, e.v)
       FROM jsonb_each(p_patch) AS e(k, v)
      WHERE jsonb_typeof(e.v) <> 'null'),
    '{}'::jsonb);
  v_remove := COALESCE(
    (SELECT array_agg(e.k)
       FROM jsonb_each(p_patch) AS e(k, v)
      WHERE jsonb_typeof(e.v) = 'null'),
    ARRAY[]::TEXT[]);

  -- Type guard: resulting type must match the catalog's required type
  v_result_type := COALESCE(
    v_set->>'type',
    (SELECT item->>'type'
       FROM task_templates t,
         LATERAL jsonb_array_elements(t."current_schema"->'items') item
      WHERE t.id = v_id AND item->>'id' = p_field_id));

  IF v_result_type IS DISTINCT FROM v_required_type THEN
    RAISE EXCEPTION
      'Type mismatch: key % requires field type %, but field % would be % — pass the correct "type" in p_patch',
      p_key, v_required_type, p_field_id, v_result_type;
  END IF;

  -- Rebuild items, patching only the target field:
  --   (field minus removed keys) || set keys || the binding
  SELECT jsonb_set(
    "current_schema",
    '{items}',
    (SELECT jsonb_agg(
       CASE WHEN item->>'id' = p_field_id
            THEN (item - v_remove) || v_set
                 || jsonb_build_object('system_fact_key', p_key)
            ELSE item END
       ORDER BY ordinality)
     FROM jsonb_array_elements("current_schema"->'items')
          WITH ORDINALITY AS arr(item, ordinality))
  ) INTO v_schema
  FROM task_templates WHERE id = v_id;

  v_ver := (SELECT version + 1 FROM task_templates WHERE id = v_id);

  UPDATE task_templates
    SET "current_schema" = v_schema, version = v_ver, updated_at = NOW()
    WHERE id = v_id;

  -- New snapshot — tasks generated after this pick up the binding; existing
  -- tasks reference the old snapshot and are not retroactively affected.
  INSERT INTO task_template_snapshots (template_id, version, schema, metadata, created_at)
    VALUES (v_id, v_ver, v_schema, '{}'::jsonb, NOW());

  RAISE NOTICE 'OK — %: % → % (version → %)', p_uid, p_field_id, p_key, v_ver;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- Bindings (worked example — extend this list for future migrations)
-- ─────────────────────────────────────────────────────────────────────────────

-- QC Review — Start Time (datetime) → show_actual_start_time
SELECT bind_template_fact(
  'ttpl_7DyQX8KM5_jNHRpPuYsn', 'fld_rty9ddwwpoo', 'show_actual_start_time');

-- On air_check — Show_Start (datetime) → show_actual_start_time
SELECT bind_template_fact(
  'ttpl_OtVn1kdHi_V_8TZftv52', 'fld_38hd4mpo7z4', 'show_actual_start_time');

-- Post_production_check — Violation_status: select → multiselect + show_platform_violation
-- Single-option multiselect (boolean-style). Full taxonomy deferred.
SELECT bind_template_fact(
  'ttpl_n6f7qAZQmPA4He6MOR-y', 'fld_5rxs4x6luv9', 'show_platform_violation',
  '{"type":"multiselect",
    "options":[{"id":"opt_platform_violation","value":"platform_violation","label":"Platform violation"}],
    "validation":{},
    "default_value":[]}'::jsonb);

-- On air_check — MC_attended: 3-way select → checkbox + creator_attendance_missing
-- options removed (invalid on checkbox); require_reason flips to "on-true" so the
-- operator gives a reason when the box is checked (flows to ShowCreator.attendanceReason).
SELECT bind_template_fact(
  'ttpl_OtVn1kdHi_V_8TZftv52', 'fld_x58ec4zecif', 'creator_attendance_missing',
  '{"type":"checkbox",
    "default_value":false,
    "validation":{"require_reason":"on-true"},
    "options":null}'::jsonb);

-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION bind_template_fact(TEXT, TEXT, TEXT, JSONB);

COMMIT;
