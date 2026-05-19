# Task Template Loop **Grid View** — Design

> **Status**: 📐 Planned
> **Date**: 2026-05-19
> **Scope**: `apps/erify_studios/src/components/task-templates/builder/` and the studio task-template route at `/studios/$studioId/task-templates/$templateId`.
> **Phase**: 4 · PR 11.6 (slots between [PR 11.5](https://github.com/allenlin90/eridu-services/pull/84) and the planned PR 12 economics surface).
> **Triggered by**: Authoring pain on loop-heavy moderation templates — example `ttpl_pWi1mbHEtHU0D-Zc3cHa` in studio `std_OBXMKm0gW4IGQUNQzp4E` repeats the same product / promotion-mechanic cue cards across many loops.

---

## Problem

In **Loop-based moderation** mode, each loop is rendered as its own card and its checkbox cue-card fields stack vertically inside the card ([`task-template-builder.tsx`](../../src/components/task-templates/builder/task-template-builder.tsx)). The checkbox label *is* the moderator's read-aloud cue (product name, promotion mechanic, etc.); the checkbox itself just confirms delivery.

For loop-heavy templates this surface fights the author:

1. The same mechanic text recurs in many loops, but the author must scroll loop-to-loop and re-type it in each card.
2. Side-by-side comparison is impossible — you cannot see Loop 3's Slot 2 next to Loop 5's Slot 2 to verify they match.
3. Paste-from-Sheets is impossible. Producers plan loops in Google Sheets first (one row per loop, one column per mechanic slot); today they must hand-transcribe each cell.
4. Label drift goes unnoticed until QA — `"BOGO buy 1 get 1"` vs `"BOGO: buy one get one free"` look identical in cards but differ in reporting.

The schema engine handles loops correctly. The bottleneck is purely authoring UX.

## Goals

- Let an author bulk-edit checkbox-cue-card **labels and descriptions** across all loops on a single surface.
- Support paste from Google Sheets / Excel / TSV (rows = loops, columns = slots) anchored at a focused cell.
- Make label drift between loops visually obvious.
- Keep the existing per-loop **Cards view** intact as the canonical surface for **structural** changes (add/remove field, change field type, reorder, validation rules, conditional logic) — the Grid view is intentionally narrow.
- Land safely behind a per-template view toggle so existing users see no change unless they opt in.

## Non-Goals

- Editing field structure (type, required flag, validation, options, conditional logic) from the grid. Cards view stays the home for that.
- Replacing Cards view. Both views coexist; either can be the default once we measure usage.
- Editing **non-checkbox** fields (number GMV, textarea notes, date pickers) from the grid in Slice 1. We can extend later if usage demands it.
- A "live collaborative" grid (multi-cursor / OT). Local edits + the existing template autosave loop is enough.
- Schema changes. The grid is a pure rendering of the existing `BuilderTemplateSchemaType.items[]` array partitioned by `group`.

---

## Three approaches

We considered three approaches before settling on a sliced rollout. All three are documented here so reviewers can see what was rejected and why.

### Approach A — Positional grid (simplest)

- **Alignment**: columns are pure positions (Slot 1, Slot 2, …). Column count for any loop = max checkbox-field count across all loops. Loops with fewer slots show empty cells.
- **Cell content**: label text (mechanic copy) on the first line; collapsible second line for the field's `description`.
- **Edit semantics**: independent per cell. Editing Loop 3 / Slot 2 only touches that loop's field.
- **Bulk primitives**:
  - Fill-down on a column (copy the focused cell's label to all rows beneath it in the same column).
  - Duplicate-row (clones a loop with its checkbox children, mirroring the existing Clone Loop button).
  - Paste TSV from clipboard at the anchor cell — Excel-style overwrite. Extra rows create new loops; extra columns create new slots in those loops.
- **Field structure changes** (add slot, remove slot, change field type, edit options) stay in Cards view. The grid header shows a "Switch to Cards to add a column / change types" hint when an action goes out of scope.
- **Trade-off**: zero magic, predictable, fast to build. No "edit BOGO once, apply everywhere" — you fill-down or paste a column.

**Sketch:**

```
        | Slot 1            | Slot 2                   | Slot 3
--------+-------------------+--------------------------+----------------------
Loop 1  | Shirt A           | BOGO buy 1 get 1         | Free ship > $50
Loop 2  | Shirt B           | BOGO buy 1 get 1         | Free ship > $50
Loop 3  | Hat               | 10% off code: FRESH10    | (empty)
Loop 4  | Shirt A           | BOGO buy 1 get 1         | Free ship > $50
+ row   |                   |                          |
```

### Approach B — Key-aligned grid (richer)

- **Alignment**: columns are field **keys** (or `shared_field_key` for V2 templates), not positions. Column `promo_1` lines up across every loop that has a field with that key. Loops missing the key show a "+ add" cell.
- **Cell content**: label text. Column header shows the key + an editable caption (renaming the caption renames the key across all loops at once).
- **Edit semantics**: independent edit on labels, but because columns are aligned by key, drift is visually obvious — a column whose cells should match (`BOGO …`) but don't is immediately flagged.
- **Bulk primitives**: everything in **A**, plus:
  - Per-cell "Apply to whole column" button (fills every loop in this column with this cell's label).
  - "Apply only where currently equal to *X*" (safer partial propagation — only overwrite cells whose current value matches the original, so manual one-off edits are preserved).
- **Paste**: anchors snap to the column-key grid; pasting a 5×3 TSV into Loop 3 / `promo_1` fills loops 3–7 × keys `promo_1`, `promo_2`, `promo_3` in order.
- **Trade-off**: more useful when *the same kind of mechanic* recurs in the same slot across loops (you can see and fix drift directly), but the author must understand the key-aligned model. The "+ add" affordance and the dual key/caption header add UI weight.

**Sketch:**

```
        | promo_product (Product) | promo_1 (Promo 1)        | promo_2 (Promo 2)
--------+-------------------------+--------------------------+----------------------
Loop 1  | Shirt A                 | BOGO buy 1 get 1         | Free ship > $50
Loop 2  | Shirt B                 | BOGO buy 1 get 1         | Free ship > $50
Loop 3  | Hat                     | 10% off code: FRESH10    | + add promo_2
Loop 4  | Shirt A                 | BOGO buy 1 get 1         | Free ship > $50
```

### Approach C — Grid + JSON drawer (power-user)

- Everything in **A**, plus a collapsible "Raw JSON" panel underneath the grid showing the same data as a JSON array. Edits on either side stay in sync via the same `onChange` plumbing.
- **Trade-off**: doubles the surface to build and test. Highest value for engineers auditing templates; lowest value for the producers and moderators this PR is for. The schema is already round-trippable through the existing `payload.ts`, so a power user can already reach the JSON path outside the builder.

---

## Decision — ship **A** for PR 11.6; defer B and C

PR 11.6 ships **Approach A only** — the positional grid with paste-from-Sheets, fill-down, and duplicate-row. This solves the two concrete pains we observed (scrolling loop-to-loop and hand-transcribing repeated mechanics) without committing to features whose value we have not yet validated.

- **Approach B (key-aligned columns + per-cell apply-to-column)** stays documented above as the natural upgrade path. Pick it up as a follow-up row **only if** producers report label-drift cases that A's fill-down does not catch. Key-alignment is contained and additive on top of A's grid component — the schema does not change either way.
- **Approach C (raw-JSON drawer)** stays deferred. The existing `payload.ts` already round-trips JSON outside the builder, so a power user can already reach that path today. Revisit only if a power-user audience surfaces.

The grid is **checkbox-only** in PR 11.6. Cue-card checkboxes are the actual workflow; a uniform cell editor (label + optional description) is simple and predictable. Mixing number / textarea / date / select cells would multiply per-cell render, validation, and paste-coercion logic without serving the workflow. Non-checkbox fields stay visible-but-read-only beneath each loop row with an "Edit in Cards view" link. Bulk-editing other field types is explicitly out of scope and would be its own future row if and when a workflow asks for it.

---

## Implementation outline (PR 11.6 — Approach A)

### View toggle

Add a `view: 'cards' | 'grid'` segmented control to the builder header next to the existing **Workflow View** select. Persist the user's last choice in IndexedDB via `idb-keyval` keyed by `taskTemplateBuilderView` (per-user, not per-template — consistent with other builder IDB caching). The toggle only appears when `isModerationMode` is true and on desktop (`lg:` breakpoint); for Standard checklist mode the grid view has no useful axis.

Default = `cards`. Existing tests stay green because the default surface is unchanged.

### Grid component

A new component `task-template-loop-grid.tsx` in the same folder. Props mirror `TaskTemplateBuilder`:

```ts
type LoopGridProps = {
  template: BuilderTemplateSchemaType;
  onChange: (template: BuilderTemplateSchemaType) => void;
  errors?: Record<string, string[]>;
};
```

Internally, build the grid from the template by partitioning `template.items` by `group` and filtering to `type === 'checkbox'`. Non-checkbox fields within a loop are listed below the grid as a read-only summary with a "Edit in Cards view" link — they exist, but the grid is checkbox-only in Slice 1.

### Cell editor

Each cell renders an inline `Input` (label) with an optional expander to reveal `Textarea` (description). Saving = blur or `Enter`. Escape reverts. The label is the `FieldItem.label` of the underlying `items[]` entry; the description is `FieldItem.description`.

### Loops as rows

- Loop name and duration stay editable in the row header (reuses the existing inputs from the Cards view, scaled down).
- Row actions: clone loop, delete loop, change position — same handlers as Cards view.
- "+ Add Loop" appears as a final row.

### Slot columns

Slot count = max checkbox count across loops. Column header shows `Slot N`. Loops with fewer than `N` checkbox fields render empty cells in the tail columns; clicking an empty cell creates a new checkbox field in that loop using `createTextFieldForTemplate(currentTemplate, loop.id)` and overwriting `type: 'checkbox'`, mirroring how the existing "Add Field to Loop" button works.

A "+" header creates a new slot column. This means adding a new checkbox field to every loop at once — the most common case authors ask for.

### Fill-down

Right-click or three-dot menu on a cell offers **Fill column down** (copies the cell's `label` to every row below in the same column, creating fields where the loop has fewer than `N` checkbox slots).

### Paste from clipboard

On the focused cell, capture the `paste` event. Parse the clipboard as TSV (Google Sheets / Excel default); fall back to single-cell plain text. For each row × column offset from the anchor cell:

- If the target cell exists, overwrite its `label`.
- If the target loop does not exist (paste extends past the last loop), create new loops using `createNextLoop(...)`.
- If the target column does not exist (paste extends past `Slot N`), create new checkbox fields in each touched loop.

Show a small toast: `"Pasted 12 cells across 4 loops × 3 slots"`. This is undoable through the existing template-draft state.

### Validation surfacing

Reuse the `errors` prop. Cells whose underlying field has an error (e.g. duplicate key) get a red border and a tooltip with the message — the same data the Cards view already uses, just rendered per-cell.

### What stays in Cards view

Add/remove field of a non-checkbox type, change field type, edit options/validation/conditional logic, drag-reorder fields within a loop. The grid surfaces a small "Switch to Cards view to edit field structure" link in the empty state and beside any non-checkbox field that the grid skipped.

---

## Deferred — Approach B (key-aligned columns)

Not in PR 11.6. Picked up only if producers report label-drift between loops that A's fill-down doesn't catch. The upgrade is contained:

- Replace the `Slot N` column model with a `field-key` column model. Group `template.items` by `(group, key)` and project columns as the union of distinct keys across loops, ordered by their first appearance.
- Column headers gain an editable caption + the underlying key as a muted subscript. Renaming the caption renames the key across every loop at once (with a duplicate-key validation pass mirroring the existing `TemplateSchemaV2` `superRefine`).
- Per-cell **Apply to column** button + **Apply where equal to *X*** secondary action.
- Empty cells in a loop show "+ add (`promo_2`)" rather than "+ add Slot 3".

---

## Deferred — Approach C (raw JSON drawer)

Not in PR 11.6 and not committed to a future row. Documented only so a future Phase-5 effort can pick it up without re-brainstorming.

- Sit underneath the grid in a `Collapsible` panel.
- Render `template.items.filter(item => item.group)` as JSON in a code editor (`@codemirror/lang-json`).
- Two-way bind to the same `onChange`: parsing JSON updates the template; mutations to the template re-render the JSON.
- Be gated to studio admins / a feature flag, since invalid JSON edits can break the template.

---

## Edge cases & risks

| Concern | Mitigation |
| --- | --- |
| User has a loop with multiple **non-checkbox** fields and a couple of checkboxes — grid would hide the non-checkbox fields | Slice 1 lists them under the loop row as a read-only summary with a "Edit in Cards view" link. The grid header banner reminds the user. |
| `shared_field_key` propagation | Slice 1 leaves shared fields alone — editing a shared-field cell's label does not unlink it. We render a small lock icon on those cells matching the Cards view's "Shared" badge. |
| Paste lands on a shared field cell | Shared field cells reject paste with a toast `"Shared field labels are managed in Shared Fields settings"` and the rest of the paste still lands on non-shared cells. |
| Very wide grids (≥ 20 loops × ≥ 8 slots) | Use a virtualized table via `@tanstack/react-virtual` (already a dependency through `@tanstack/react-table`). Slice 1 is fine without virtualization up to ~50×10; revisit if usage exceeds that. |
| Mobile | The grid is desktop-only in Slice 1. Below `md`, the toggle hides and Cards view is forced — same pattern as the [responsive Dialog→Drawer house rule](../../../../.agent/skills/frontend-ui-components/references/ui-component-details.md). |
| Undo / discard | The Cancel-alert and template-draft state in `TaskTemplateBuilder` already serialize the whole template; grid edits flow through the same `onChange`, so the existing discard path covers it. |
| Schema engine drift (v1 vs v2) | Both engines store the same shape we render from (`group` + `items[]`). The grid works on both; the only engine-aware code is the existing `createTextFieldForTemplate` helper, already imported. |

---

## Verification gates

Same as the standing Phase 4 gates:

```
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```

PR 11.6 acceptance:

- Toggle appears only in moderation mode; persists across reloads.
- Existing Cards view rendering and tests unchanged.
- Paste a 5×3 TSV block from a Google Sheet — fills 5 loops × 3 slots, creates new loops/columns as needed, toast confirms cell count.
- Fill-down copies a cell's label to every row in its column, creating fields where the loop is short.
- Switching back to Cards view shows the same data; round-trip with Save → reload → toggle Grid → labels intact.
- Tests at iPhone SE (375×667) confirm the grid hides and Cards view is forced.
- Shared-field cells reject paste and inline edit with a toast pointing at Shared Fields settings.

---

## Out of scope (future work)

- Approach B (key-aligned columns + per-cell apply-to-column). Documented as a contained upgrade; only triggered by reported label-drift cases.
- Approach C (raw JSON drawer).
- Bulk-edit of **non-checkbox** fields (number GMV, textarea notes) from the grid.
- Multi-template "shared mechanic library" — letting an author pick from a saved list of cue cards across templates. Belongs with the Shared Fields surface.
- Mobile grid editing.
- A shareable URL that opens the grid view on a specific cell (the cards-vs-grid toggle is per-user, not per-URL).
