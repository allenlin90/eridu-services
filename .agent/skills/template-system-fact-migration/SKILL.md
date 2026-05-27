---
name: template-system-fact-migration
description: >
  Audit existing task templates for missing or mismatched system_fact_key bindings and
  produce the SQL migration blocks to fix them. Use when expanding the SystemFactKey
  catalog, onboarding new task templates that need fact extraction, or when a prod-db-sync
  reveals templates without bindings. Covers field-type compatibility rules, idempotent
  migration script structure, and the snapshot lifecycle that must accompany every
  current_schema change.
---

# Template System Fact Migration

Pattern for auditing task templates against the `SystemFactKey` catalog and writing
idempotent SQL migrations to bind (or re-type) fields so the fact-extraction pipeline
can populate `Show`, `ShowCreator`, and `ShowPlatform` actuals on bulk approval.

## When to Use

- Expanding `SystemFactKeyEnum` with a new key — existing templates need the new binding.
- A prod-db-sync reveals templates that have no `system_fact_key` bindings.
- A field-type mismatch blocks a planned binding (e.g. `select` where `checkbox` is required).
- Onboarding a new studio whose templates were created without fact bindings.

## Source of Truth

- **Fact key catalog**: [`packages/api-types/src/task-management/template-definition.schema.ts`](../../../packages/api-types/src/task-management/template-definition.schema.ts)
  — `SystemFactKeyEnum`, `SYSTEM_FACT_KEY_DEFINITIONS`, `FieldItemV2Schema`.
- **Migration scripts**: [`scripts/bind-template-system-facts.sh`](../../../scripts/bind-template-system-facts.sh)
  and [`scripts/bind-template-system-facts.sql`](../../../scripts/bind-template-system-facts.sql)
  — reference implementation for the SQL block pattern.

## Step 1 — Audit the Local DB

```bash
# Templates with no system_fact_key bindings at all
SELECT tt.id, tt.uid, tt.name,
       tt."current_schema"->'metadata'->>'task_type' AS task_type
FROM task_templates tt
WHERE tt.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(tt."current_schema"->'items') item
    WHERE item->>'system_fact_key' IS NOT NULL
  )
ORDER BY tt.id;

# All bound fields across all templates
SELECT tt.id, tt.name, tt.version,
       item->>'id'              AS field_id,
       item->>'type'            AS field_type,
       item->>'label'           AS field_label,
       item->>'system_fact_key' AS system_fact_key
FROM task_templates tt,
  LATERAL jsonb_array_elements(tt."current_schema"->'items') item
WHERE tt.deleted_at IS NULL
  AND item->>'system_fact_key' IS NOT NULL
ORDER BY tt.id, item->>'id';
```

> **`"current_schema"` must always be double-quoted** — it collides with the Postgres
> built-in function `current_schema()`. Unquoted references will silently resolve to
> the schema name string, not the column.

## Step 2 — Map Fields to Fact Keys

For each candidate field, check compatibility against `SYSTEM_FACT_KEY_DEFINITIONS`:

| Fact key | Required `field_type` | target scope |
|---|---|---|
| `show_actual_start_time` | `datetime` | `show` |
| `show_actual_end_time` | `datetime` | `show` |
| `creator_actual_start_time` | `datetime` | `show_creator` (hydrated) |
| `creator_actual_end_time` | `datetime` | `show_creator` (hydrated) |
| `creator_attendance_missing` | `checkbox` | `show_creator` (hydrated) |
| `show_platform_actual_start_time` | `datetime` | `show_platform` (hydrated) |
| `show_platform_actual_end_time` | `datetime` | `show_platform` (hydrated) |
| `show_platform_violation` | `multiselect` | `show_platform` (hydrated) |

**Type mismatches must be resolved in the same migration block** — never bind a field
whose type doesn't match the catalog. The v2 schema Zod validator rejects mismatches at
save time and the extractor will `value_absent` at runtime.

### Common conversion decisions

| Old type | Target fact | Resolution |
|---|---|---|
| `select` (3-way: on_time/late/missing) | `creator_attendance_missing` | Replace with `checkbox`; add `require_reason: "on-true"` so operator provides reason when checked |
| `select` (no\_violation / have\_violation) | `show_platform_violation` | Replace with `multiselect`; provide single option or full violation taxonomy |
| `datetime` | any `*_start_time` / `*_end_time` | Add `system_fact_key` only — no type change needed |

### Hydrated-scope fields

`creator_*` and `show_platform_*` facts are **hydrated-scope**: the task execution engine
expands a single template field into one input per assigned creator/platform at render
time, using `parseHydratedContentKey`. These bindings are appropriate when a task is
assigned per-creator or per-platform. Do not add them to templates that span all
creators/platforms at once.

## Step 3 — Write the Migration Block

Each block follows this shape (see reference implementation for full detail):

```sql
DO $$
DECLARE
  v_id     BIGINT;
  v_ver    INTEGER;
  v_schema JSONB;
  v_fld    TEXT := 'fld_<fieldId>';
  v_key    TEXT := '<system_fact_key>';
BEGIN
  -- 1. Resolve by UID — never hard-code internal id
  SELECT id INTO v_id FROM task_templates
  WHERE uid = '<ttpl_...>' AND deleted_at IS NULL;
  IF v_id IS NULL THEN RAISE NOTICE 'SKIP — template not found'; RETURN; END IF;

  -- 2. Idempotency guard
  IF EXISTS (
    SELECT 1 FROM task_templates t,
      LATERAL jsonb_array_elements(t."current_schema"->'items') item
    WHERE t.id = v_id AND item->>'id' = v_fld AND item->>'system_fact_key' = v_key
  ) THEN RAISE NOTICE 'SKIP — already bound'; RETURN; END IF;

  -- 3. Rebuild items array, patching only the target field
  SELECT jsonb_set(
    "current_schema", '{items}',
    (SELECT jsonb_agg(
       CASE WHEN item->>'id' = v_fld
            THEN item || jsonb_build_object('system_fact_key', v_key)
            -- OR for type change:
            -- THEN (item - 'type' - 'options' ...) || jsonb_build_object('type','checkbox', ...)
            ELSE item END
       ORDER BY ordinality)
     FROM jsonb_array_elements("current_schema"->'items')
          WITH ORDINALITY AS t(item, ordinality))
  ) INTO v_schema FROM task_templates WHERE id = v_id;

  -- 4. Bump version + persist
  v_ver := (SELECT version + 1 FROM task_templates WHERE id = v_id);
  UPDATE task_templates
    SET "current_schema" = v_schema, version = v_ver, updated_at = NOW()
    WHERE id = v_id;

  -- 5. Create new snapshot (tasks generated after this pick up the binding)
  INSERT INTO task_template_snapshots (template_id, version, schema, metadata, created_at)
    VALUES (v_id, v_ver, v_schema, '{}'::jsonb, NOW());

  RAISE NOTICE 'OK — <template>: % → % (version → %)', v_fld, v_key, v_ver;
END $$;
```

**Always wrap all blocks in a single `BEGIN; … COMMIT;`** — all succeed or none commit.

## Step 4 — Wire into the Shell Runner

Add blocks to `scripts/bind-template-system-facts.sql`.
The shell script (`scripts/bind-template-system-facts.sh`) handles:
- env loading from `apps/erify_api/.env`
- localhost safety guard (refuses remote targets unless `ALLOW_PROD=1`)
- dry-run (`--dry-run` flag)
- auto-verify query after migration

Run locally first, then prod:

```bash
# Local
bash scripts/bind-template-system-facts.sh

# Prod (after local verification)
ALLOW_PROD=1 TARGET_DATABASE_URL="$PROD_DATABASE_URL" \
  bash scripts/bind-template-system-facts.sh
```

## Step 5 — Verify

After running, the auto-verify query at the bottom of the shell script confirms bound
fields. Cross-check expected row count: one row per bound field per template.

Manual end-to-end smoke test:
1. Generate a task from the updated template.
2. Fill the bound field and submit for review.
3. Bulk-approve via `POST /studios/:studioId/tasks/bulk-approve`.
4. Query the target table (e.g. `Show.actualStartTime`, `ShowCreator.attendanceMissing`).
5. Confirm an `Audit` row exists for the write.

## Snapshot Lifecycle Note

Bumping `version` and inserting a `task_template_snapshots` row is **mandatory**.
Tasks store a `snapshot_id` reference — tasks generated before the migration reference
the old snapshot and are **not retroactively affected**. Only tasks generated from the
new snapshot carry the binding. This is by design (immutable task templates rule).

## Related

- [fact-extraction-pipeline](../fact-extraction-pipeline/SKILL.md) — extractor registry,
  outcome routing, and adding new `IngestionExtractor` implementations.
- [task-template-builder](../task-template-builder/SKILL.md) — UI-side builder that
  manages `system_fact_key` bindings interactively.
- [local-database-cli](../local-database-cli/SKILL.md) — psql patterns and the
  `"current_schema"` quoting rule.
