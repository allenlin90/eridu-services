---
name: template-system-fact-migration
description: >
  Use when expanding the SystemFactKey catalog, onboarding task templates that need
  operational fact extraction, a prod-db-sync reveals task templates without
  system_fact_key bindings, or a field-type mismatch (e.g. select where checkbox or
  multiselect is required) blocks binding a template field to the fact-extraction
  pipeline.
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
- **Migration scripts**: [`scripts/bind-template-system-facts.sh`](./scripts/bind-template-system-facts.sh)
  and [`scripts/bind-template-system-facts.sql`](./scripts/bind-template-system-facts.sql)
  — the reusable `bind_template_fact` helper plus a worked-example call list.

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
| `show_platform_gmv` | `number` | `show_platform` (hydrated) |
| `show_platform_view_count` | `number` | `show_platform` (hydrated) |
| `show_platform_ctr` | `number` | `show_platform` (hydrated) |
| `show_platform_cto` | `number` | `show_platform` (hydrated) |

**Type mismatches must be resolved in the same binding call** (via `p_patch`) — never bind
a field whose type doesn't match the catalog. The v2 schema Zod validator rejects mismatches
at save time and the extractor will `value_absent` at runtime.

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

## Step 3 — Add a Binding Call

The reusable `bind_template_fact(p_uid, p_field_id, p_key, p_patch)` helper in
[`scripts/bind-template-system-facts.sql`](./scripts/bind-template-system-facts.sql)
owns all the boilerplate — resolve-by-UID, idempotency skip, type guard, field patch,
version bump, and snapshot insert. Adding a binding is one `SELECT` call.

**Pure binding** (field already has the required type, e.g. a `datetime` field):

```sql
SELECT bind_template_fact(
  'ttpl_7DyQX8KM5_jNHRpPuYsn', 'fld_rty9ddwwpoo', 'show_actual_start_time');
```

**Binding with a type change** — pass a `p_patch` JSONB merged into the field before
the binding is added. Convention: a key with a value **sets** that property; a key with
JSON `null` **removes** it (e.g. dropping `options` when converting to `checkbox`):

```sql
-- select → checkbox
SELECT bind_template_fact(
  'ttpl_OtVn1kdHi_V_8TZftv52', 'fld_x58ec4zecif', 'creator_attendance_missing',
  '{"type":"checkbox","default_value":false,
    "validation":{"require_reason":"on-true"},"options":null}'::jsonb);
```

The helper's embedded `key → required_type` map aborts the migration with a clear error
if the resulting field type doesn't match the key — so a wrong-type binding fails at
migration time, not silently at extraction time. That map duplicates the catalog;
[`scripts/check-fact-key-sync.mjs`](./scripts/check-fact-key-sync.mjs) (run by the shell
runner before applying) fails the migration if the SQL map drifts from
`SYSTEM_FACT_KEY_DEFINITIONS`, so it cannot silently fall out of sync.

**All calls run inside a single `BEGIN; … COMMIT;`** (the helper is created and dropped
within that transaction) — all succeed or none commit.

## Step 4 — Wire into the Shell Runner

Add `bind_template_fact(...)` calls to the worked-example list in
[`scripts/bind-template-system-facts.sql`](./scripts/bind-template-system-facts.sql).
The shell script ([`scripts/bind-template-system-facts.sh`](./scripts/bind-template-system-facts.sh)) handles:
- env loading from `apps/erify_api/.env`
- localhost safety guard (refuses remote targets unless `ALLOW_PROD=1`)
- dry-run (`--dry-run` flag)
- auto-verify query after migration

Run locally first, then prod:

```bash
SCRIPT=.agent/skills/template-system-fact-migration/scripts/bind-template-system-facts.sh

# Local
bash "$SCRIPT"

# Prod (after local verification)
ALLOW_PROD=1 TARGET_DATABASE_URL="$PROD_DATABASE_URL" bash "$SCRIPT"
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
