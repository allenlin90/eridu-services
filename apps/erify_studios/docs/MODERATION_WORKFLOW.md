# Moderation Loop Workflow

> **Status**: Implemented (feat/moderator-workflow, 2026-03)
> **Design reference**: [docs/design/MODERATION_WORKFLOW_DESIGN.md](./design/MODERATION_WORKFLOW_DESIGN.md)

---

## 1. Overview

A "loop-based moderation task" covers an entire livestream show as a single `Task` row. Instead of generating one `Task` per loop repetition, the full checklist for every loop is stored together in `task.content` (a flat JSON object). The frontend partitions this flat payload into per-loop views.

**Why a single task?**
- A 2-hour show with eight 15-minute loops would otherwise produce 8+ task rows per moderator, per show — unmanageable at scale.
- The backend stays ignorant of loops; it validates only a flat `FieldItem[]` array.
- All loop content is persisted in one atomic PATCH call.

---

## 2. Data Contract

> **Critical reading for future developers.** There is no RDBMS schema enforcing loop structure — everything is stored in JSON. The contract below is the only authoritative definition.

### 2.1 Template Schema (stored in `task_template_snapshot.schema`)

```json
{
  "name": "...",
  "task_type": "ACTIVE",
  "metadata": {
    "loops": [
      { "id": "l1", "name": "Welcome & Intro", "durationMin": 15 },
      { "id": "l2", "name": "Flash Sale Push",  "durationMin": 15 }
    ]
  },
  "items": [
    {
      "id": "uuid",
      "key": "l1_pin_welcome",
      "type": "checkbox",
      "label": "Pin welcome comment",
      "group": "l1",
      "required": true
    },
    {
      "id": "uuid",
      "key": "l2_announce_sale",
      "type": "text",
      "label": "Flash sale announcement copy",
      "group": "l2",
      "required": true
    }
  ]
}
```

**Fields:**

| Field | Type | Notes |
|---|---|---|
| `metadata.loops[].id` | `string` | Loop identifier — must match `items[].group`. Format: `l1`, `l2`, … (`l{n}`) |
| `metadata.loops[].name` | `string` | Display name shown to moderator |
| `metadata.loops[].durationMin` | `number` | Loop duration in minutes. Defaults to `15` if absent or invalid |
| `items[].group` | `string \| undefined` | Loop ID this field belongs to. Absent = ungrouped (standard checklist) |
| `items[].key` | `string` | Must be globally unique across the entire template (not just per-loop) |

### 2.2 Task Content (stored in `task.content`)

```json
{
  "l1_pin_welcome": true,
  "l1_campaign_link": "https://example.com/sale",
  "l2_announce_sale": "Flash sale starting now!"
}
```

`task.content` is a **flat JSON object**, keyed by `item.key`. All loop data coexists in the same JSON object — there is no nesting by loop. `react-hook-form` tracks all fields in memory simultaneously; only the visual display is partitioned by `activeGroup`.

### 2.3 Backend Contract

The backend (`erify_api`) validates only:
- `items` is a flat `FieldItem[]` (each item has `id`, `key`, `type`, `label`)
- `group` is an optional `string` on each field item
- `metadata.loops` (when present) must match the shared strict shape from `@eridu/api-types/task-management`:
  - `id: string`
  - `name: string`
  - `durationMin: positive integer`

**Important**: There is still no relational DB-level referential integrity between `items[].group` and `metadata.loops[].id`. The contract is enforced at the API schema layer, not via SQL constraints.

---

## 3. Business Rules

### Loop Identity and Ordering
- Loop IDs are generated as `l1`, `l2`, `l3`, … (monotonically increasing, gap-safe on deletion)
- **Loop order is determined by `metadata.loops` array order**, not by the order fields appear in `items`
- Field linkage uses the loop **id** (e.g., `"l1"`), not the loop **name** — names can change without breaking linkage

### Empty Loop Handling
- A loop with no matching fields (nothing in `items[].group === loop.id`) does not appear in the execution sheet tab list
- The builder allows creating empty loops and adding fields to them later

### Fallback (missing metadata)
- If `metadata.loops` is absent, the execution sheet falls back to inferring loop tabs from the set of unique `group` values in `items`, in the order they appear in the array
- If `metadata.loops` is present but malformed, schema validation rejects it (strict shared schema); this is intentional for new rollout quality

### Field Keys
- Keys must be globally unique across the entire template (not per-loop)
- New fields get auto-generated keys (`field_<timestamp>`)
- Cloning a loop copies fields with new UUIDs and deduplicated keys (suffix appended on collision)
- Cloning a template regenerates all field UUIDs but preserves keys

### Mode Detection (Builder)
`isModerationMode` is **derived, never stored**:
```typescript
template.items.some((item) => !!item.group) || (template.metadata?.loops?.length ?? 0) > 0
```
Switching to standard mode strips all `group` props and removes `metadata.loops`.

---

## 4. Personas & Workflows

### 4.1 Planner / Studio Admin

**Goal**: Build a reusable moderation template, set loop names, durations, and fields.

**Workflow**:
1. Open Template Builder → switch **Workflow View** to `Loop-based moderation`
2. Click **Add Loop** → sets name, duration (minutes), position
3. Expand a loop card → click **Add Field** → configure field type/label/validation
4. Reorder loops by editing position number (1-based); reorder fields within a loop via drag-and-drop
5. Clone a loop to duplicate its structure to a new loop
6. Save template → `metadata.loops` and flat `items[]` are persisted together

**Builder display**: Loop headers show total item count only (e.g., `5 items`). Per-loop completion is shown in the live preview and execution sheet, not in the builder header.

### 4.2 Moderator / Operator

**Goal**: Complete the moderation checklist loop-by-loop during a live show.

**Workflow**:
1. Open task from My Tasks → Task Execution Sheet opens
2. The **Loop Progress block** appears above the form:
   - Progress bar (current loop position / total loops)
   - Current loop name and item completion count
   - `(Live)` indicator if the loop matches the current clock time vs show start time
   - Previous / Next navigation buttons
3. Fill in fields for the active loop → content auto-saves to IndexedDB (500ms debounce) and syncs to the DB (650ms debounce, if `enableAutosave` is enabled)
4. Navigate to next loop → repeat
5. Submit for Review when all loops are complete

**Live loop detection**: Requires `task.show.start_time`. Algorithm:
```
elapsedMinutes = (Date.now() - show.startTime) / 60_000
walk metadata.loops in order, accumulate durationMin
first loop where elapsedMinutes < cumulativeDuration → live loop
```
The clock ticks every 30 seconds — sufficient for live loop identification but too coarse for a countdown display. Countdown timer is **not implemented** (deferred).

**Draft persistence**:
- IndexedDB key: `my_task_execution_draft:{taskId}`
- Stores: `{ taskId, content, baseContent, baseVersion, updatedAt }`
- Hydrated on sheet open; cleared on submit success

### 4.3 Studio Reviewer / Admin

**Goal**: Review the full submission across all loops.

**Workflow**:
1. Open task from Review Queue → Studio Task Action Sheet
2. **All loop fields are displayed at once** (no `activeGroup` filtering) — intentional, reviewers need complete visibility
3. Approve or reject with note

---

## 5. Component Responsibilities

| Component | Responsibility |
|---|---|
| `task-template-builder.tsx` | Compiles visual loops → flat `items[]` + `metadata.loops`; detects loop mode from schema |
| `live-preview.tsx` | Mirrors execution sheet loop UX using `default_value` as completion proxy |
| `task-execution-sheet.tsx` | Reads `metadata.loops`, resolves `loopTabs`, passes `activeGroup` to `JsonForm` |
| `studio-task-action-sheet.tsx` | Renders `JsonForm` without `activeGroup` — all fields visible for reviewer |
| `json-form.tsx` | Filters rendered fields: `items.filter(item => !activeGroup || item.group === activeGroup)` |
| `@eridu/ui/Progress` | Shared progress bar primitive (`@radix-ui/react-progress`) |

**Schema types (shared contract)**:
- `LoopMetadataSchema` / `LoopMetadata` / `TemplateMetadataSchema` are defined in `packages/api-types/src/task-management/template-definition.schema.ts`
- `apps/erify_studios/src/components/task-templates/builder/schema.ts` re-exports these for builder usage

---

## 6. Known Constraints & Deferred Features

| Item | Status | Notes |
|---|---|---|
| Per-loop countdown timer | Deferred | 30s clock tick is too coarse; requires a 1s interval and layout work |
| "Mark Loop Complete" button | Deferred | Would set a metadata flag per loop; no backend enforcement needed |
| Cross-loop drag-and-drop | Not supported | Dragging a field across loops does not reassign its `group` — reorder within-loop only |
| Builder "filled count" in loop header | Not implemented | Only shown in live preview and execution sheet |
| Loop field key prefixing | Convention only | Recommended: `l1_`, `l2_` etc. — not auto-enforced by the builder |
