# Feature: Task Templates

> **Status**: ✅ Shipped — foundational; predates the PRD-promotion process
> **Workstream**: Task Management
> **Canonical docs**: [BE summary](../../apps/erify_api/docs/TASK_MANAGEMENT_SUMMARY.md), [FE summary](../../apps/erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md), [Moderation loop workflow](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md), [Builder skill](../../.agent/skills/task-template-builder/SKILL.md)
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
- Studio shared-field registry integration (`standard: true` flags a template field as a canonical metric)
- Builder UX with drag-and-drop, draft autosave (planned for IndexedDB), live preview, and clone-loop
- Snapshot-driven downstream consumers: task execution form, file upload validation, and report projection all read from the snapshot, not the live template

## Architecture: The Five Layers

A task template is the same JSON envelope at multiple layers, with a different lifecycle and reader at each. Walking the same example (a Live Show Moderation template that captures GMV per loop) end-to-end:

### Layer 0 — Studio shared-field registry (canonical metric definitions)

Stored on `Studio.metadata.shared_fields[]`. The studio's controlled vocabulary of metrics that any template can reference. One row per metric per studio.

```jsonc
{
  "shared_fields": [
    { "key": "gmv",        "type": "number", "category": "metric",   "label": "GMV",       "is_active": true },
    { "key": "orders",     "type": "number", "category": "metric",   "label": "Orders",    "is_active": true },
    { "key": "proof_link", "type": "url",    "category": "evidence", "label": "Proof URL", "is_active": true }
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
      { "id": "l1", "name": "Welcome",    "durationMin": 15 },
      { "id": "l2", "name": "Flash Sale", "durationMin": 15 }
    ]
  },
  "items": [
    { "id": "uuid-1", "key": "gmv",     "type": "number",   "group": "l1", "standard": true,  "required": true },
    { "id": "uuid-2", "key": "gmv_l2",  "type": "number",   "group": "l2", "standard": false, "required": true },
    { "id": "uuid-3", "key": "l1_pin",  "type": "checkbox", "group": "l1", "label": "Pin welcome comment" }
  ]
}
```

**Lifecycle**: edited freely until referenced by tasks; each save bumps `TaskTemplate.version` (a content-edit counter) and writes a fresh `TaskTemplateSnapshot`.

### Layer 2 — Snapshot (the immutable copy)

`TaskTemplateSnapshot.schema` is a byte-for-byte copy of `currentSchema` at task-creation time, frozen forever. `Task.snapshotId` pins each task to the exact shape it was created with. Editing the template later **never** mutates past snapshots.

This is the layer the form, the upload validator, and the report projection all read from at runtime. Layer 1 (template) only exists for authoring.

### Layer 3 — Task instance (the captured data)

One `Task` row per show per assignee. The moderator's entered values live in `Task.content` as a **flat JSON object keyed by `field.key`**:

```jsonc
{
  "gmv": 1500,           // L1 GMV
  "gmv_l2": 1800,        // L2 GMV
  "l1_pin": true,
  "l1_pin__reason": "Pinned comment was delayed",
  "l1_pin__extra": { "cause": "Network retry" }
}
```

**No nesting by loop**. All loop fields coexist in one object so the entire form persists in one atomic PATCH. The frontend filters by `activeGroup` for display, but the storage is flat.

Fields with explanation or auxiliary input data use flat sidecar keys derived from the field storage key:

- `"<fieldKey>__reason"` stores the operator's explanation text.
- `"<fieldKey>__extra"` stores optional structured input metadata.

These sidecars do not become separate report columns by default. Report projection appends them to the selected field's cell so a show remains one row.

### Layer 4 — Loop view (UI partition only)

There is **no loop entity in the database**. The execution sheet computes loop tabs from `metadata.loops[]` and filters items by `group === activeGroup`. The backend validates only a flat `FieldItem[]` plus an optional `metadata.loops[]` shape. See [MODERATION_WORKFLOW.md](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md) for the full UI contract.

### Layer 5 — Report projection (downstream)

`TaskReportRunService` walks each task's **snapshot** (not the live template) and projects fields into report columns:

- `field.standard === true` → `columnKey = field.key` (canonical, e.g., `gmv`)
- otherwise → `columnKey = "${task.templateUid}:${field.key}"` (template-local, e.g., `tpl_xyz:gmv_l2`)
- Field sidecars (`__reason`, `__extra`) and object-shaped input extras are rendered into the same report cell as the field value.
- For forward compatibility with the v2 template redesign, report extraction can read either `field.key`-keyed content or `field.id`-keyed content before projecting into the same descriptor column.

This is why this feature is the **upstream** of [task-submission-reporting](./task-submission-reporting.md): the snapshot's shape and the `standard` flag are what determine whether a column is canonical (cross-template comparable) or template-local.

## Cross-Layer Attribute Map

The current schema overloads `field.key` to play three roles at once. Reading down the column for a single attribute shows where it's interpreted:

| Attribute          | Layer 0 (studio)    | Layer 1 (template)                    | Layer 2 (snapshot)   | Layer 3 (task content)   | Layer 5 (report)                          |
| ------------------ | ------------------- | ------------------------------------- | -------------------- | ------------------------ | ----------------------------------------- |
| `key`              | canonical metric id | editor handle, unique within template | frozen with snapshot | **storage key**          | column key when `standard`                |
| `id`               | —                   | dnd-kit / form state stable id        | frozen               | unused                   | unused                                    |
| `standard`         | —                   | flag linking to Layer 0               | frozen               | —                        | branches `columnKey` shape                |
| `group`            | —                   | binds field to a loop id              | frozen               | —                        | unused today                              |
| `type`             | locked at creation  | must match Layer 0 if `standard`      | frozen               | drives content validator | drives column type                        |
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
| `standard` (canonical link)    | Shared-field picker; locks `key`/`type` once linked                    | No direct UX effect (storage is the same)                                  | No direct UX effect                          |
| `id`                           | dnd-kit drag handle stability                                          | React-hook-form field name; IndexedDB draft key component                  | Same as execution                            |
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
7. If the attribute affects storage shape: is the change additive, or does it require [feature-version-cutover.md](../../.agent/workflows/feature-version-cutover.md)?

## Key Product Decisions

- **One Task = one full form, not one row per field.** A show with 3 task types creates 3 Task rows, not 60.
- **Snapshots are the runtime source of truth.** The form, validator, uploader, and report projection all read `task.snapshotSchema`, never `template.currentSchema`. This makes editing a template safe.
- **Shared-field metadata (`key`, `type`, `category`) is locked post-creation.** Renaming or retyping a canonical metric would break every snapshot referencing it.
- **`task.content` is flat across loops.** A loop is a UI partition computed from `metadata.loops[]` + `items[].group`, not a storage container. The whole form saves and submits atomically.
- **Field `key` is globally unique within a template today.** This is the constraint that forces per-loop suffixing (`gmv`, `gmv_l2`, `gmv_l3`) and is the structural source of the limitation below.
- **`metadata.loops[]` order, not item order, defines loop sequence.** Reordering items within a loop is reorder-only; reassigning loops happens by editing `group`.

## Downstream Consumers

| Consumer                            | What it reads                                                      | Reference                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Task Execution Sheet (operator)     | `task.snapshotSchema`, `task.content`, `metadata.loops` (for tabs) | [MODERATION_WORKFLOW.md](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md)                                                               |
| Studio Task Action Sheet (reviewer) | `task.snapshotSchema`, `task.content` (no loop filtering)          | [MODERATION_WORKFLOW.md](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md)                                                               |
| Material asset uploads              | `field.key` of file-typed items                                    | [JSON_FORM_SUBMISSION_UPLOAD_FLOW.md](../../apps/erify_studios/docs/JSON_FORM_SUBMISSION_UPLOAD_FLOW.md)                                     |
| Task Submission Reporting           | snapshot field catalog, `standard`, `field.key`, `task.content`    | [task-submission-reporting feature doc](./task-submission-reporting.md), [BE design](../../apps/erify_api/docs/TASK_SUBMISSION_REPORTING.md) |

## Known Limitation

The same canonical metric (e.g., GMV) cannot be repeated across loops of one template and still aggregate as a single canonical column, because `field.key` is the storage key and must be unique within the template. The current workaround is to suffix per-loop keys (`gmv_l2`, `gmv_l3`), which makes those fields template-local instead of canonical — so per-loop GMV never sums into the L1 GMV column in reports.

A redesign that decouples editor handle, storage key, and canonical reference is in ideation: [task-template-redesign](../ideation/task-template-redesign.md). Not shipped.

## Maintenance: Documentation Sync

Task Templates is a multi-layer feature. Any change to schema, snapshot semantics, content storage, or canonical-metric link affects all five layers and several downstream consumers. **When refactoring or redesigning any layer, the artifacts below must be updated in the same PR**, not in a follow-up.

Run [.agent/workflows/knowledge-sync.md](../../.agent/workflows/knowledge-sync.md) for the general mechanism. **For schema redesigns specifically** (e.g., the in-flight v2 in `docs/ideation/task-template-redesign.md`), trigger [.agent/workflows/feature-version-cutover.md](../../.agent/workflows/feature-version-cutover.md) instead — that workflow decides whether this doc updates in place or splits into a versioned folder (`task-templates/README.md` for v2, `task-templates/v1.md` archived).

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
| Builder skill                | [.agent/skills/task-template-builder/SKILL.md](../../.agent/skills/task-template-builder/SKILL.md)                                                 | Builder UX, draft, validation, or shared-field insertion patterns change      |
| Shared schema skill          | [.agent/skills/shared-api-types/SKILL.md](../../.agent/skills/shared-api-types/SKILL.md)                                                           | `template-definition.schema.ts` or task-management exports change             |
| Shared schema source         | [packages/api-types/src/task-management/template-definition.schema.ts](../../packages/api-types/src/task-management/template-definition.schema.ts) | Field item shape, validation, or schema engine envelope changes               |
| Seed                         | [apps/erify_api/prisma/seed.ts](../../apps/erify_api/prisma/seed.ts)                                                                               | New canonical patterns; deprecation of old patterns (e.g., `_l2` workarounds) |
| Active ideation              | [docs/ideation/task-template-redesign.md](../ideation/task-template-redesign.md)                                                                   | Until shipped or rejected; mark resolved decisions, prune stale options       |

**Definition of done for refactor/redesign PRs in this area**: every artifact above either has its update committed in the same PR, or has an explicit "no change needed" line in the PR description. Reviewers should treat a missing update as a blocking finding.

## Acceptance Record

- [x] Studio-scoped template CRUD with shared Zod validation
- [x] Immutable snapshot per task (`Task.snapshotId`)
- [x] Form schema engine with typed fields and per-type validation
- [x] Loop-based moderation mode (`metadata.loops[]` + `items[].group`)
- [x] Studio shared-field registry integration (`standard: true`)
- [x] Builder UX (drag-and-drop, live preview, clone-loop)
- [x] Snapshot-driven downstream readers (form, uploader, reporting)
- [x] System-admin cross-studio template management
