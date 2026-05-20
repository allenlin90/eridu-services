# Task Template **Mechanic-Library Grid View** — Design

> **Status**: 🚧 In progress (PR [#86](https://github.com/allenlin90/eridu-services/pull/86))
> **Date**: 2026-05-20 (supersedes the 2026-05-19 Approach-A positional grid design)
> **Scope**: `apps/erify_studios/src/components/task-templates/builder/` and the studio task-template route at `/studios/$studioId/task-templates/$templateId`.
> **Phase**: 4 · PR 11.7 (between [PR 11.5](https://github.com/allenlin90/eridu-services/pull/84) and the planned PR 12 economics surface). Followups in PR 11.8 (studio-level catalog) and PR 11.9 (usage rollup).
> **Triggered by**: Authoring pain on loop-heavy moderation templates — example `ttpl_pWi1mbHEtHU0D-Zc3cHa` in studio `std_OBXMKm0gW4IGQUNQzp4E` repeats the same product / promotion-mechanic cue cards across many loops.

---

## Why the original Approach-A grid was wrong

The first cut of PR 11.7 shipped a **positional grid** — rows = loops, columns = `Slot 1..N` checkbox cells, with paste-from-Sheets, fill-down, and duplicate-row. It was reviewed and rejected by producers within a day. The reasons:

1. **The grid did not prevent drift, it just made it easier to introduce.** Each cell stored an independent label. Editing Loop 3 / Slot 2 did not touch Loop 4 / Slot 2 even when both should match. Fill-down only fixed already-aligned columns; producers still had to remember which cells were supposed to be the same.
2. **Paste-from-Sheets fought the schema.** Pasting a 5×3 TSV block created 5 loops × 3 anonymous columns. If the producer's Google Sheet was ordered differently than the template (e.g. product in column 2 instead of column 1), the paste silently misaligned and every subsequent edit propagated the misalignment.
3. **Cells had no identity beyond position.** Renaming a mechanic anywhere required either (a) editing every loop manually (slow and error-prone) or (b) fill-down + remembering to fix the upstream cells (which the user immediately did wrong in practice).
4. **The cell editor itself had bugs.** Cutting an input made the borderless field look empty/missing; the `DropdownMenu` "Add description" action re-focused the label input; "Fill column down" misreported its scope. These are all symptoms of the same problem — a positional grid asks the cell to be both a data row and an inline form, and the affordances collide.

The cell-level bugs are real, but fixing them does not fix the data model. The real bug is that **the cell is the wrong unit of identity**.

## The fix: make the mechanic the unit of identity

The same product or promotion mechanic recurs across many loops. The author's mental model is "**a list of mechanics that play in different loops**", not "a 2D grid of cells". So the data model is:

- **Mechanic** — a `{ id, label, description? }` record. There is one per distinct cue card. Renaming it once updates every loop that uses it.
- **Loop** — unchanged from today.
- **Assignment** — a Loop ↔ Mechanic link. Toggling an assignment on creates a checkbox `FieldItem` in that loop with the mechanic's label; toggling off removes the field.

The UI is a single page with two panels:

1. **Mechanic library** (top): the list of mechanics for this template, with inline rename, optional description, and a "Used in N loops" affordance.
2. **Loop × Mechanic assignment matrix** (bottom): rows = loops, columns = mechanics, cells = checkboxes. Click to assign / unassign.

This is the established pattern for "many things × many things, the cells are the relationship" (think Notion database relations, Airtable junction tables, Linear label assignment). It maps cleanly to the producer's spreadsheet, but the column header *is* the mechanic — editing it renames the mechanic everywhere it appears.

```
MECHANICS                                                [+ Add]
  Shirt A               [edit]   Used in 3 loops
  BOGO buy 1 get 1      [edit]   Used in 4 loops
  Free ship > $50       [edit]   Used in 4 loops
  10% off FRESH10       [edit]   Used in 1 loop

LOOP × MECHANIC                                          [+ Loop]
        | Shirt A | BOGO buy 1 | Free ship | 10% off    |
  Loop 1|   [x]   |    [x]     |    [x]    |            |
  Loop 2|         |    [x]     |    [x]    |            |
  Loop 3|         |            |           |    [x]     |
  Loop 4|   [x]   |    [x]     |    [x]    |            |
```

---

## Goals

- Let an author rename a recurring mechanic exactly once and have every loop reflect the change.
- Let an author add or remove a mechanic from a loop with a single click.
- Make label drift across loops impossible by construction (within a template).
- Keep the existing per-loop **Cards view** intact as the canonical surface for **structural** changes (add/remove non-checkbox field, change field type, reorder, validation rules, conditional logic, shared-field insertion).
- Auto-migrate existing templates so producers see their current loops/cells correctly grouped into mechanics on first open. No manual data prep, no breaking change.

## Non-Goals (PR 11.7)

- **Studio-level mechanic catalog.** PR 11.7's library is template-local. Cross-template reuse is PR 11.8.
- **Cards-view label edits syncing back to the library.** A label edit in Cards view will drift from the mechanic until PR 11.8's catalog model lands and we make the link bidirectional. PR 11.7 surfaces this as a "Cards-edited labels are not synced to the library" note when the Grid detects mismatch.
- **Editing non-checkbox fields from the Grid.** Number / textarea / select / file fields stay in Cards view; the Grid shows them as a read-only summary per loop, exactly as the previous design did.
- **Shared-field labels.** V1 `standard: true` and V2 `shared_field_key` checkboxes are managed by Shared Fields settings; they are excluded from the mechanic library and shown as a banner above the matrix.
- **Schema changes to the api-types package.** All new fields ride on `TemplateMetadataSchema.catchall(z.any())`; this PR ships as a pure `erify_studios` change.

---

## Data model

Both fields live under `template.metadata`. Both V1 and V2 metadata schemas already accept arbitrary catchall fields, so no api-types change is needed.

```ts
type Mechanic = {
  id: string;                // 'mech_' + nanoid-ish; client-generated
  label: string;             // moderator's read-aloud cue
  description?: string;      // optional context
};

type MechanicAssignments = Record<string /* FieldItem.id */, string /* Mechanic.id */>;

// In TemplateMetadata (rides on the existing catchall):
{
  mechanics?: Mechanic[];
  mechanicAssignments?: MechanicAssignments;
}
```

### Why `mechanicAssignments` is keyed by `FieldItem.id` and not the other way around

A loop has many mechanics; a mechanic appears in many loops. The natural junction is `(loopId, mechanicId) → fieldItemId`, but we already have one canonical record per assignment in `items[]` (the checkbox `FieldItem` itself, with its `group: loopId` and `label`). Keying assignments by `FieldItem.id` means:

- The mechanic library is the projection: `for each mechanic, find all items where assignments[item.id] === mechanic.id`.
- Deleting a mechanic = deleting every linked item (and every assignment entry pointing to that mechanic). One pass over `items[]`, deterministic.
- Adding a loop or a mechanic doesn't touch the assignments map (no row-vs-column ambiguity).
- Cards view never sees the assignments map; it sees `items[]` exactly as today.

### Auto-migration

On first render of the Grid view, if `metadata.mechanics` is missing or empty, run a one-shot client-side migration:

1. Scan `items.filter(i => i.type === 'checkbox' && !isSharedField(i))`.
2. Bucket items by `label.trim().toLowerCase()`.
3. For each non-empty bucket, mint a `Mechanic` whose `label` is the first item's label (preserving original casing).
4. Record `assignments[item.id] = mechanic.id` for every item in the bucket.
5. Stash on the template draft and call `onChange`. The user must save to persist.

This is idempotent; subsequent loads see populated `metadata.mechanics` and skip migration. It is lossless: every item retains its current id, key, label, and group. Shared fields and non-checkbox fields are not touched.

If two unrelated mechanics coincidentally share the exact same label today, they will be linked into one mechanic — this is almost always what producers want (it's drift the system was hiding). The user can split them back apart by adding a new mechanic and reassigning, but in practice we expect this to be rare.

---

## UI affordances

### Mechanic library panel (top)

- Inline rename: click the label, edit, blur or Enter to commit. On commit, every linked `FieldItem.label` updates in the same `onChange`.
- "Used in N loops" badge: derived count, click to scroll the matrix to the column.
- Per-row menu: "Edit description", "Delete mechanic" (with confirm — cascade removes every linked item).
- "+ Add mechanic" button creates an unlinked entry; the matrix shows a new column with empty checkboxes.

### Loop × Mechanic matrix (bottom)

- Rows = loops in their declared order; the row header is the loop name + duration (editable, same as today's Cards view).
- Columns = mechanics in library order; column header repeats the label (read-only — rename via the library above).
- Cells = `Checkbox`. Toggling on appends a checkbox `FieldItem` to the loop and records the assignment. Toggling off finds the item assigned to that `(loop, mechanic)`, deletes it from `items[]`, and clears the assignment.
- Row actions: clone loop (also clones assignments), delete loop (cascades both items and the assignments for that loop), "+ Loop" at the bottom.
- Non-checkbox fields and shared fields are summarised in a single banner row below the matrix per loop: "Loop 3 also has 2 non-mechanic fields — edit in Cards view".

### View toggle

- The `Cards ↔ Grid` toggle next to **Workflow View** stays exactly where PR 11.7's first cut put it.
- Persistence in IndexedDB via `idb-keyval` keyed `taskTemplateBuilderView` — per-user, not per-template.
- Below `md` the toggle hides and Cards is forced (same `useIsMobile()` pattern as PR 13's responsive Dialog→Drawer rule).

### Validation surfacing

Reuse the existing `errors` prop. If a linked item has a Zod error, its column header gets a destructive border + a tooltip. Cards view continues to show full per-field errors.

---

## What stays in Cards view

- Add / remove a **non-checkbox** field (number, text, textarea, select, file, date, etc.).
- Change a field's type.
- Edit options, validation rules, conditional logic, default values.
- Drag-reorder fields within a loop.
- Insert shared fields (canonical or loop-scoped).

The Grid links a small "Edit field structure in Cards view" affordance beside any loop whose mechanics list looks incomplete (e.g. the loop has zero checkbox fields but does have non-checkbox fields).

---

## Migration risks and mitigations

| Concern | Mitigation |
| --- | --- |
| Two coincidentally identical labels in unrelated logical mechanics get linked into one mechanic | Acceptable for v1 — the user can split them by renaming one and reassigning. We expect this to be rare; if reports surface it, PR 11.8's catalog gives us a clean place to track explicit mechanic identity. |
| Cards-view label edit on a linked item drifts from the mechanic | The Grid detects this on render and shows an inline "Synced from Cards" pill on the affected mechanic, with a "Re-sync from library" action. Bidirectional sync is PR 11.8 once the catalog model lands. |
| Migration runs before the user saves, then the user discards | The migration only mutates the in-memory draft via `onChange`; the existing discard path (cancel alert in `TaskTemplateBuilder`) wipes it. Idempotent, so re-opening re-runs the same projection. |
| Shared fields would otherwise inherit the auto-rename behaviour | The migration filter (`!isSharedField(i)`) excludes them entirely. They render in the "Shared fields hidden" banner above the matrix and stay editable only from Shared Fields settings. |
| Very large templates (≥ 30 loops × ≥ 20 mechanics) | The matrix is a `Table` with `overflow-x-auto`. Virtualisation deferred until usage exceeds ~50×30; revisit if reported. |

---

## Verification gates

```
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```

PR 11.7 acceptance:

- Toggle appears only in moderation mode and on desktop; persists across reloads.
- Open `ttpl_pWi1mbHEtHU0D-Zc3cHa` in Grid view — every distinct checkbox label across loops appears once in the mechanic library; the matrix renders the existing assignments.
- Rename a mechanic; verify every linked loop's Cards view shows the new label after toggling back.
- Toggle a matrix cell off; the corresponding checkbox `FieldItem` disappears from Cards view for that loop.
- Toggle a matrix cell on; a new checkbox `FieldItem` appears in Cards view for that loop with the mechanic's current label.
- Delete a mechanic; every linked loop loses the corresponding checkbox; the mechanic disappears from the library.
- Save → reload → open Grid → no migration re-runs (idempotent); the library and matrix render identically.
- iPhone SE (375×667) — the toggle is hidden, Cards view is forced.

---

## Followups (separately tracked rows)

- **PR 11.8 — Studio-level mechanic catalog.** Promote the template-local library to a studio resource (`StudioMechanic` Prisma model + `/studios/:id/mechanics` endpoints + content-team admin page). Templates pick mechanics from the catalog; renames propagate across every template that links them. Makes cross-template drift impossible.
- **PR 11.9 — Mechanic usage rollup.** "Used in N templates / M loops" + drill-in for the content team.
