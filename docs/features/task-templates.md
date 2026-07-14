# Feature: Task Templates

> **Status**: ✅ Shipped — foundational; predates the PRD-promotion process
> **Workstream**: Task Management
> **Canonical docs**: [BE summary](../../apps/erify_api/docs/TASK_MANAGEMENT_SUMMARY.md), [FE summary](../../apps/erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md), [Moderation loop workflow](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md), [Builder skill](../../.agents/skills/task-template-builder/SKILL.md)
> **Downstream**: [Task Submission Reporting](./task-submission-reporting.md) — consumes snapshots and task content produced by this feature

## Problem

Studios need a reusable, versioned way to define what "doing a task" means — what fields to capture, what's required, what links to a canonical metric, and how the structure changes across loops of a moderation workflow. The same definition must drive data capture (operator forms), historical fidelity (so editing a template doesn't retroactively rewrite past submissions), and downstream aggregation (cross-show reporting).

## Users

| Role                 | Need                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| Studio Admin         | Author and edit templates; manage the studio's shared-field registry |
| Studio Manager       | Author/edit templates; cannot manage shared fields                   |
| Moderation Manager   | Author moderation templates with loop structure                      |
| Operator / Moderator | Execute the form rendered from a template snapshot                   |
| Reporting consumers  | Read snapshot + content to project per-show columns                  |

## What Was Delivered

- Studio-scoped template CRUD with shared Zod schema validation (`@eridu/api-types/task-management`)
- Immutable `TaskTemplateSnapshot` per task, decoupling future template edits from historical task content
- Form schema engine: typed fields (`text`, `number`, `checkbox`, `select`, `multiselect`, `date`, `datetime`, `url`, `file`, …) with per-type validation and conditional `require_reason` rules
- Loop-based moderation mode: `metadata.loops[]` plus `items[].group` partitions one template into N loops, rendered per-loop in the execution sheet but stored as one flat `task.content`
- Studio shared-field registry integration (`shared_field_key` links v2 template fields to canonical metrics)
- Builder UX with drag-and-drop, draft autosave (planned for IndexedDB), live preview, and clone-loop
- Snapshot-driven downstream consumers: task execution form, file upload validation, and report projection all read from the snapshot, not the live template

## Architecture: The Five Layers

A task template is the same JSON envelope at multiple layers, with a different lifecycle and reader at each. Walking the same example (a Live Show Moderation template that captures GMV per loop) end-to-end:

### Layer 0 — Studio shared-field registry (canonical metric definitions)

Stored on `Studio.metadata.shared_fields[]`. The studio's controlled vocabulary of metrics that any template can reference. One row per metric per studio.

```jsonc
{
  "shared_fields": [
    { "key": "gmv", "type": "number", "category": "metric", "label": "GMV", "is_active": true },
    { "key": "orders", "type": "number", "category": "metric", "label": "Orders", "is_active": true },
    { "key": "proof_link", "type": "url", "category": "evidence", "label": "Proof URL", "is_active": true }
  ]
}
```

**Lifecycle**: edited via `/studios/:id/settings/shared-fields`. `key`, `type`, and `category` are locked once created (see Key Product Decisions).

### Layer 1 — Template (the editable blueprint)

`TaskTemplate.currentSchema` JSON, scoped to one studio. Defines structure but holds no submitted data.

```jsonc
// "Live Show Moderation" — TaskTemplate.currentSchema
{
  "name": "Live Show Moderation",
  "task_type": "ACTIVE",
  "metadata": {
    "loops": [
      { "id": "l1", "name": "Welcome", "durationMin": 15 },
      { "id": "l2", "name": "Flash Sale", "durationMin": 15 }
    ]
  },
  "schema_version": 2,
  "schema_engine": "task_template_v2",
  "content_key_strategy": "field_id",
  "report_projection_strategy": "descriptor",
  "items": [
    { "id": "fld_gmvl100001", "key": "gmv", "type": "number", "group": "l1", "shared_field_key": "gmv", "required": true },
    { "id": "fld_gmvl200001", "key": "gmv", "type": "number", "group": "l2", "shared_field_key": "gmv", "required": true },
    { "id": "fld_actualst01", "key": "actual_start", "type": "datetime", "group": "l1", "system_fact_key": "show_actual_start_time", "required": true },
    { "id": "fld_pin1000001", "key": "l1_pin", "type": "checkbox", "group": "l1", "label": "Pin welcome comment" }
  ]
}
```

**Lifecycle**: edited freely until referenced by tasks; each save bumps `TaskTemplate.version` (a content-edit counter) and writes a fresh `TaskTemplateSnapshot`.

### Layer 2 — Snapshot (immutable; per-task hydration computed at render time)

`TaskTemplateSnapshot.schema` is a byte-for-byte copy of `currentSchema` at task-creation time. `Task.snapshotId` pins each task to the exact shape it was created with. Editing the template later **never** mutates past snapshots. The snapshot is fully immutable.

**`system_fact_key` hydrated bindings (PR 12 series).** For template fields that carry a `system_fact_key`, the operator form does *not* render the field directly — instead, at render and submission time the task is hydrated against the show's currently-assigned `ShowCreator` / `ShowPlatform` set into per-target inputs with deterministic keys `<fieldId>:<scope>:<uid>` (e.g., `fld_attendmiss1:creator:show_mc_alpha`). Operator values land in `task.content` at those keys. Keys present in `task.content` whose target is no longer assigned surface as `binding_stale: true` hydrated items: rendered dimmed and read-only in the form, skipped at extraction, with `require_reason` stripped so a removed target can't block submission. Platform violation bindings use a `multiselect` field (`show_platform_violation`); each selected value creates an active `ShowPlatformViolation` row for that platform, and a resubmission replaces only rows from the same hydrated task field. Once a task is `COMPLETED` / `CLOSED`, the snapshot AND `task.content` are frozen — no further hydration runs against newer assignments. See [TASK_INPUT_FACT_BINDING.md](../../apps/erify_api/docs/TASK_INPUT_FACT_BINDING.md) §3.A.

**Exception 2 — Active Task Snapshot Transitions (PR 93 series).** When active tasks are transitioned to the latest template snapshot version, a database-level optimistic concurrency check is performed (gated on `version`). Any incoming metadata payload is merged on top of existing metadata, ensuring operational metadata (such as `material_asset_upload_versions` tracked by the file uploader) is preserved rather than overwritten by concurrent snapshot upgrades. Any conflict due to out-of-order edits raises a `VersionConflictError`, mapping to a standard HTTP 409 Conflict.

This is the layer the form, the upload validator, and the report projection all read from at runtime. Layer 1 (template) only exists for authoring.

### Layer 3 — Task instance (the captured data)

One `Task` row per show per assignee. The moderator's entered values live in `Task.content` as a **flat JSON object**. The key is engine-routed:

- v1 snapshots: `field.key`
- v2 snapshots: `field.id`

```jsonc
{
  "fld_gmvl100001": 1500, // L1 GMV
  "fld_gmvl200001": 1800, // L2 GMV
  "fld_pin1000001": true,
  "fld_pin1000001__reason": "Pinned comment was delayed",
  "fld_pin1000001__extra": { "cause": "Network retry" }
}
```

**No nesting by loop**. All loop fields coexist in one object so the entire form persists in one atomic PATCH. The frontend filters by `activeGroup` for display, but the storage is flat.

Fields with explanation or auxiliary input data use flat sidecar keys derived from the field storage key:

- `"<fieldKey>__reason"` stores the operator's explanation text.
- `"<fieldKey>__extra"` stores optional structured input metadata.

These sidecars do not become report columns by default. Report definitions can opt a selected field into an adjacent extra column, keeping the base answer and explanation/metadata separate while preserving one row per show.

### Layer 4 — Loop view (UI partition only)

There is **no loop entity in the database**. The execution sheet computes loop tabs from `metadata.loops[]` and filters items by `group === activeGroup`. The backend validates only a flat `FieldItem[]` plus an optional `metadata.loops[]` shape. See [MODERATION_WORKFLOW.md](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md) for the full UI contract.

### Layer 5 — Report projection (downstream)

`TaskReportRunService` walks each task's **snapshot** (not the live template) and projects fields into report columns:

- v1 shared field (`standard: true`) → `columnKey = field.key` (canonical or legacy suffixed, e.g., `gmv_l1`)
- v2 shared loop field (`shared_field_key: "gmv", group: "l1"`) → `columnKey = "gmv_l1"`
- v2 shared non-loop field (`shared_field_key: "session_review_feedback"`) → `columnKey = "session_review_feedback"`
- v2 template-local loop field → `columnKey = "${task.templateUid}:${field.group}:${field.key}"`
- v2 template-local non-loop field → `columnKey = "${task.templateUid}:${field.key}"`
- When a selected report column has `include_extra: true`, field sidecars (`__reason`, `__extra`) render into an adjacent `{columnKey}__extra` column.
- Base field values remain in the selected column; extra columns are an export-template option, not automatic schema expansion.

This is why this feature is the **upstream** of [task-submission-reporting](./task-submission-reporting.md): the snapshot's engine and descriptor helpers determine whether a column is canonical (cross-template comparable) or template-local.

## Cross-Layer Attribute Map

The v2 schema decouples editor handle, content storage key, and canonical reporting reference. Reading down the column for a single attribute shows where it is interpreted:

| Attribute          | Layer 0 (studio)    | Layer 1 (template)                    | Layer 2 (snapshot)   | Layer 3 (task content)   | Layer 5 (report)                          |
| ------------------ | ------------------- | ------------------------------------- | -------------------- | ------------------------ | ----------------------------------------- |
| `key`              | canonical metric id | editor handle, unique per loop group in v2 | frozen with snapshot | v1 storage key only      | v2 template-local descriptor segment      |
| `id`               | —                   | stable `fld_...` field identity       | frozen               | **v2 storage key**       | unused                                    |
| `shared_field_key` | —                   | link to Layer 0                       | frozen               | —                        | v2 shared descriptor base                 |
| `system_fact_key`  | —                   | closed operational fact binding       | frozen on authored fields; per-target hydrated keys live in `task.content` and are recomputed at render and submission time until the task is `COMPLETED`/`CLOSED` | drives target-scoped hydration in PR 12 | read by PR 12 extractors; task reports project platform-performance bindings from the extracted `ShowPlatform` columns (not content) |
| `standard`         | —                   | legacy v1 canonical flag              | frozen               | —                        | v1 shared descriptor branch               |
| `group`            | —                   | binds field to a loop id              | frozen               | —                        | v2 shared/template-local loop descriptor segment |
| `type`             | locked at creation  | must match Layer 0 if shared          | frozen               | drives content validator | drives column type                        |
| `metadata.loops[]` | —                   | loop catalog                          | frozen               | —                        | unused today (per-loop pivot is deferred) |

## Schema → UX Bindings

The template schema isn't only a storage contract — it also drives what the user sees and how they interact at three distinct surfaces: the **builder** (where the schema is authored), the **execution sheet** (where the operator fills it out), and the **review sheet** (where a reviewer reads back the submission). A change to any schema attribute usually changes behavior at one or more of these surfaces, so impact analysis must walk this map before touching the schema.

| Schema attribute               | Builder surface (authoring)                                            | Execution surface (operator)                                               | Review surface (reviewer)                    |
| ------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| `type`                         | Field-type picker; reveals type-specific config (options, range, etc.) | Selects renderable control (text input, checkbox, date picker, file, …)    | Selects read-only display variant            |
| `label` / `description`        | Inline text editor                                                     | Field heading + helper text                                                | Field heading + helper text                  |
| `required`                     | Toggle                                                                 | Asterisk + blocks submit until filled                                      | Marked but not enforced                      |
| `validation`                   | Type-specific rule editor                                              | Inline validation feedback as the user types                               | Read-only; violations surfaced as warnings   |
| `default_value`                | Default editor; also drives live preview completion proxy              | Pre-fills empty fields on open                                             | Reflected in displayed value                 |
| `options` (select/multiselect) | Options list editor                                                    | Dropdown / chip control choices                                            | Choice rendering                             |
| `require_reason`               | Conditional rule editor (operator/value pairs by type)                 | Reveals an explanation textarea and stores it under `<fieldKey>__reason` when the trigger condition fires | Shows the captured reason inline             |
| `group` + `metadata.loops[]`   | Loop card grouping; loop reorder by position; loop name/duration edit  | Loop tabs + Previous/Next nav; live-loop indicator from `show.start_time`  | All loops visible at once (no tab filtering) |
| `shared_field_key` (canonical link) | Shared-field picker; locks shared key/type once linked                  | No direct UX effect beyond engine-routed storage                           | No direct UX effect                          |
| `system_fact_key`              | Searchable "Auto-fill record field" picker (with info-icon tooltip); selecting a binding sets the compatible field type from `@eridu/api-types/task-management`; each fact key can appear once per template | At render time, the operator task form expands the bound field into one input per assigned `ShowCreator` / `ShowPlatform` (PR 12.0.4); keys without an active target are marked `binding_stale` and rendered read-only | PR 12.0.5+ extractors read the hydrated keys and write to indexed columns |
| `standard`                     | Legacy v1 canonical link only                                          | Legacy v1 snapshots remain readable                                        | Legacy v1 snapshots remain readable          |
| `id`                           | dnd-kit drag handle stability and v2 content key                       | React-hook-form field name; IndexedDB draft key component                  | Same as execution                            |
| `task_type` (envelope-level)   | Mode selector affecting which template-type-specific rules apply       | Determines submission-window enforcement (SETUP before show, ACTIVE after) | Visible as a chip                            |

### Cross-surface invariants

- **The same schema renders all three surfaces.** There is no separate "builder schema" or "review schema." Adding a new attribute that the renderer doesn't understand is silently ignored downstream — verify all three surfaces explicitly.
- **The builder is the inverse of the execution form.** Every attribute that affects rendering must have a corresponding builder control, otherwise the attribute becomes unreachable for new templates.
- **Live preview mirrors the execution surface, not the builder surface.** If a change shows up correctly in the builder but not in live preview, the rendering pipeline has drifted.
- **Loop UX is computed, not stored.** No DB-level loop entity exists. Changes to `metadata.loops[]` semantics (reorder rules, live-loop detection) ripple to the execution sheet's tab logic only — review sheet ignores it.

### Impact analysis checklist for a schema change

When changing a schema attribute or adding a new one, walk this list before merging:

1. Does the **builder** expose a control to author the new/changed attribute? (If no: dead attribute.)
2. Does the **live preview** reflect the change? (If no: builder/renderer drift.)
3. Does the **execution sheet** render and validate it correctly per `activeGroup`? (If no: operator can't use it.)
4. Does the **review sheet** display it without loop filtering? (If no: reviewer blind spot.)
5. Does the **content validator** in `@eridu/api-types/task-management` enforce it at submit time? (If no: bad data accepted.)
6. Does the **report projection** still produce correct column keys and values? (If no: downstream report breakage.)
7. If the attribute affects storage shape: is the change additive, or does it require [feature-version-cutover.md](../../.agents/workflows/feature-version-cutover.md)?

## Key Product Decisions

- **One Task = one full form, not one row per field.** A show with 3 task types creates 3 Task rows, not 60.
- **Snapshots are the runtime source of truth.** The form, validator, uploader, and report projection all read `task.snapshotSchema`, never `template.currentSchema`. This makes editing a template safe.
- **Task snapshot updates use optimistic concurrency control.** Transitioning an active task's snapshot version employs a database-level optimistic concurrency check (gated on `version`), preserving existing JSONB metadata (such as file upload tracker versions) and raising a `VersionConflictError` (HTTP 409 Conflict) if concurrent edits occur.
- **Shared-field metadata (`key`, `type`, `category`) is locked post-creation.** Renaming or retyping a canonical metric would break every snapshot referencing it.
- **`task.content` is flat across loops.** A loop is a UI partition computed from `metadata.loops[]` + `items[].group`, not a storage container. The whole form saves and submits atomically.
- **Field `id` is the v2 storage identity.** v2 `field.key` is an editor handle and may repeat across different loop groups; `field.id` is stable, unique, and used for `task.content`.
- **Shared-field projection is descriptor-based.** v2 shared loop fields use `(shared_field_key, group)` for report columns, so `gmv` in loop `l8` projects to `gmv_l8` across templates.
- **`metadata.loops[]` order, not item order, defines loop sequence.** Reordering items within a loop is reorder-only; reassigning loops happens by editing `group`.

## Mechanic References (PR 20.5)

A **mechanic** is a client-owned reusable moderation instruction (`ClientMechanic` — see [`CLIENT_MECHANICS_MANAGEMENT.md`](../../apps/erify_studios/docs/CLIENT_MECHANICS_MANAGEMENT.md)). Once a template is bound to a client (`TaskTemplate.clientId`, PR 20.4), the builder's **Loop × Mechanic matrix** lets an author check a cell to link that mechanic into a loop — this checks a mechanic into a v2 field via `mechanic_ref`:

```jsonc
// FieldItemV2.mechanic_ref
{
  "client_id": "client_abc123",
  "mechanic_id": "cmech_def456",
  "content_revision": 5 // frozen at check/upgrade time, never live-resolved
}
```

- **`content_revision` is frozen, not live.** It's set when the matrix cell is checked (or explicitly upgraded later) and copied verbatim into `currentSchema` / the template snapshot. Coverage (PR 20.6/20.7) compares this frozen value against the catalog's current `contentRevision` to detect staleness — it never re-resolves the mechanic's content at read time.
- **One mechanic, one field per loop, shared identity.** Checking the same mechanic in multiple loops creates one field per loop, each carrying the same `mechanic_id` — editing the mechanic once in the catalog and upgrading propagates to every loop that references it.
- **Per-loop `(mechanic_id, group)` uniqueness**, enforced in `TemplateSchemaV2Validator` alongside the existing `(key, group)` rule: checking an already-assigned mechanic in the same loop is a no-op, not a duplicate field.
- **Mechanic fields are catalog-owned in Cards.** Cards view stays canonical for structural fields; mechanic fields interleave and reorder there, but their label/description are read-only (edit in the mechanic catalog, then upgrade the field to pull the new revision).
- **`TaskTemplateMechanicRef`** is a denormalized link table (`template_id` / `snapshot_id` ↔ `mechanic_id` + `group`), written on template save. Coverage resolvers (PR 20.6/20.7) query this table directly — never a JSONB scan of `currentSchema`.
- **Matrix view forces Cards on mobile.** The Loop × Mechanic matrix is a wide grid; small viewports render Cards only.

## Downstream Consumers

| Consumer                            | What it reads                                                      | Reference                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Task Execution Sheet (operator)     | `task.snapshotSchema`, `task.content`, `metadata.loops` (for tabs) | [MODERATION_WORKFLOW.md](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md)                                                               |
| Studio Task Action Sheet (reviewer) | `task.snapshotSchema`, `task.content` (no loop filtering)          | [MODERATION_WORKFLOW.md](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md)                                                               |
| Material asset uploads              | engine-routed content key for file-typed items                     | [JSON_FORM_SUBMISSION_UPLOAD_FLOW.md](../../apps/erify_studios/docs/JSON_FORM_SUBMISSION_UPLOAD_FLOW.md)                                     |
| Task Submission Reporting           | snapshot field catalog, descriptor helper, content-key helper      | [task-submission-reporting feature doc](./task-submission-reporting.md), [BE design](../../apps/erify_api/docs/TASK_SUBMISSION_REPORTING.md) |

## Version Coexistence

Active templates use `task_template_v2`. Historical v1 snapshots remain valid and are read through the same engine helpers:

- `getFieldContentKey()` routes task-content reads/writes by schema engine.
- `getFieldSharedKey()` normalizes v1 `standard` and v2 `shared_field_key`.
- `getFieldReportDescriptor()` aligns v1 historical suffixed shared fields and v2 canonical loop fields into the same report columns.

The normalization script (`apps/erify_api/scripts/normalize-task-template-schemas.ts`) upgrades active `TaskTemplate.currentSchema` records and creates matching latest v2 snapshots. It does not rewrite historical snapshots or existing `Task.content`.

## Production Normalization Gates

Run the normalization sequence from a server with the production `DATABASE_URL`:

```bash
pnpm --filter erify_api exec tsx scripts/normalize-task-template-schemas.ts --validate-only
pnpm --filter erify_api exec tsx scripts/normalize-task-template-schemas.ts --current-to-v2 --dry-run
pnpm --filter erify_api exec tsx scripts/normalize-task-template-schemas.ts --current-to-v2 --apply
pnpm --filter erify_api exec tsx scripts/normalize-task-template-schemas.ts --cleanup-legacy-shared-fields --dry-run
pnpm --filter erify_api exec tsx scripts/normalize-task-template-schemas.ts --cleanup-legacy-shared-fields --apply
```

Stop the rollout unless all of these are true:

- `--validate-only` exits `0` and prints `summary.invalid: 0`.
- Template-level `manualReviewItems` are empty or explicitly accepted by the rollout owner.
- `--current-to-v2 --dry-run` planned counts match the expected template count.
- `--current-to-v2 --apply` applies exactly the dry-run plan and creates one latest v2 snapshot per upgraded template.
- A second `--current-to-v2 --dry-run` reports no additional planned upgrades.
- `--cleanup-legacy-shared-fields --dry-run` removed counts match the expected legacy suffixed registry entries.
- A second cleanup dry-run after apply reports `removed_count: 0`.

## Maintenance: Documentation Sync

Task Templates is a multi-layer feature. Any change to schema, snapshot semantics, content storage, or canonical-metric link affects all five layers and several downstream consumers. **When refactoring or redesigning any layer, the artifacts below must be updated in the same PR**, not in a follow-up.

Run [.agents/workflows/knowledge-sync.md](../../.agents/workflows/knowledge-sync.md) for the general mechanism. **For schema redesigns specifically** (e.g., major version updates), trigger [.agents/workflows/feature-version-cutover.md](../../.agents/workflows/feature-version-cutover.md) instead — that workflow decides whether this doc updates in place or splits into a versioned folder (`task-templates/README.md` for v2, `task-templates/v1.md` archived).

Feature-specific artifact list:

| Layer / concern              | Artifact                                                                                                                                           | Update when                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Product / feature view       | [docs/features/task-templates.md](./task-templates.md) (this doc)                                                                                  | Any layer changes; new attribute; canonical-metric semantics shift            |
| Downstream feature view      | [docs/features/task-submission-reporting.md](./task-submission-reporting.md)                                                                       | Snapshot/content key shape changes; column-key derivation changes             |
| Backend canonical reference  | [apps/erify_api/docs/TASK_MANAGEMENT_SUMMARY.md](../../apps/erify_api/docs/TASK_MANAGEMENT_SUMMARY.md)                                             | Entity, endpoint, or service responsibility changes                           |
| Backend reporting reference  | [apps/erify_api/docs/TASK_SUBMISSION_REPORTING.md](../../apps/erify_api/docs/TASK_SUBMISSION_REPORTING.md)                                         | Projection rules, column-key derivation, snapshot reads change                |
| Frontend canonical reference | [apps/erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md](../../apps/erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md)                                     | UI screens, workflows, or task-card contract change                           |
| Moderation loop reference    | [apps/erify_studios/docs/MODERATION_WORKFLOW.md](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md)                                             | Loop schema, `metadata.loops[]`, or content storage shape changes             |
| Upload flow reference        | [apps/erify_studios/docs/JSON_FORM_SUBMISSION_UPLOAD_FLOW.md](../../apps/erify_studios/docs/JSON_FORM_SUBMISSION_UPLOAD_FLOW.md)                   | File-field resolution or content-key strategy changes                         |
| Builder skill                | [.agents/skills/task-template-builder/SKILL.md](../../.agents/skills/task-template-builder/SKILL.md)                                                 | Builder UX, draft, validation, or shared-field insertion patterns change      |
| Shared schema skill          | [.agents/skills/shared-api-types/SKILL.md](../../.agents/skills/shared-api-types/SKILL.md)                                                           | `template-definition.schema.ts` or task-management exports change             |
| Shared schema source         | [packages/api-types/src/task-management/template-definition.schema.ts](../../packages/api-types/src/task-management/template-definition.schema.ts) | Field item shape, validation, or schema engine envelope changes               |
| Seed                         | [apps/erify_api/prisma/seed.ts](../../apps/erify_api/prisma/seed.ts)                                                                               | New canonical patterns; deprecation of old patterns (e.g., `_l2` workarounds) |

**Definition of done for refactor/redesign PRs in this area**: every artifact above either has its update committed in the same PR, or has an explicit "no change needed" line in the PR description. Reviewers should treat a missing update as a blocking finding.

## Acceptance Record

- [x] Studio-scoped template CRUD with shared Zod validation
- [x] Immutable snapshot per task (`Task.snapshotId`)
- [x] Form schema engine with typed fields and per-type validation
- [x] Loop-based moderation mode (`metadata.loops[]` + `items[].group`)
- [x] Studio shared-field registry integration (`shared_field_key` in v2; `standard: true` retained for v1 snapshots)
- [x] Builder UX (drag-and-drop, live preview, clone-loop)
- [x] Snapshot-driven downstream readers (form, uploader, reporting)
- [x] System-admin cross-studio template management
