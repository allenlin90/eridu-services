# Tech Debt: Studios Filter Groups and Show-Time Cells Still Lack Cross-Feature Sharing

> **Status update (2026-07-24):** The drift-prone cores of both patterns have been
> extracted into shared, output-preserving primitives (see "Resolved" below). What
> remains is an optional single-widget unification that would change rendered output,
> so it stays trigger-gated.

## Resolved (2026-07-24, output-preserving cleanup)

Shared primitives now back every listed call site, with **no change to rendered
output** on any surface:

- **`toggleArrayValue`** (`src/lib/array-utils.ts`) — the copy-identical
  `includes ? filter : [...spread]` multi-select toggle. Now used by
  `toggleImpactKind`/`toggleResolutionStatus` (`schedule-publish-impacts.tsx`
  route), `toggleStatus`/`toggleTaskType` (`use-my-tasks-filters.ts`), and the
  three inline toggles in `performance-filter-fields.tsx`.
- **`MultiSelectCheckboxItems`** (`src/components/filters/multi-select-checkbox-items.tsx`)
  — the shared `DropdownMenuCheckboxItem` list (checked/onToggle/`preventDefault`)
  for the dropdown-style multi-selects. Migrated: `performance-filter-fields.tsx`
  (show type / platform / show standard) and `my-tasks-toolbar.tsx` (status / task
  type). Callers keep their own trigger button and `DropdownMenuContent` wrapper.
- **`CheckboxFilterGroup`** (`src/components/filters/checkbox-filter-group.tsx`) —
  the inline (non-dropdown) consolidated group, relocated out of
  `schedule-publish-impact-filters.tsx` into the shared `components/filters/` layer
  so it is a discoverable cross-feature primitive for future consolidated panels.
- **`formatShowDate` / `formatShowTime` / `formatShowTimeRange`**
  (`src/lib/show-time-format.ts`) — the `MMM d, yyyy` / `h:mm a` format strings and
  the `start - end` range string. Migrated: `schedule-publish-impacts-columns.tsx`,
  `creator-mapping-show-columns.tsx`, and `studio-shows-table/columns.tsx` (both the
  `start_time` cell and the `ShowActualsCell` time range).

This removes the format/behavior-drift risk the "Why It Matters" section called
out — the shared source of truth can no longer diverge between surfaces. Unit tests
cover `toggleArrayValue` and the show-time formatters.

## Remaining (trigger-gated)

The three named filter surfaces still use **two distinct UI shapes** on purpose:
`schedule-publish` is an inline checkbox fieldset (`CheckboxFilterGroup`) while
`performance` and `my-tasks` are dropdown-checkbox menus (`MultiSelectCheckboxItems`).
Likewise the three show-time cells keep their own wrappers and empty states
(`text-sm` vs `flex flex-col`, em-dash vs hyphen vs no guard). Collapsing either
into a single widget with one canonical look would **change rendered output** on
some surfaces, so it is not done preemptively.

## Trigger To Fix (remaining)

- A surface needs a new consolidated **inline** filter group → reuse
  `CheckboxFilterGroup` from `components/filters/`.
- A surface needs a new **dropdown** multi-select → reuse `MultiSelectCheckboxItems`.
- A deliberate UX pass decides to normalize the filter surfaces to one shape, or the
  show-time cells to one `ShowTimeCell` — do it then, as an intentional visual change,
  building on the shared format helpers already in place.

## Acceptance Criteria

- [x] Shared multi-select primitives back `schedule-publish-impacts` filters,
      `performance-filter-fields`, and `my-tasks-toolbar` without changing each
      surface's filter composition or rendered output.
- [x] Shared show-time formatters back all three column files (plus the actuals
      cell), same rendered output.
- [ ] (Optional, trigger-gated) A single shared filter-group widget and a single
      `ShowTimeCell`, accepted as a deliberate visual normalization.

## Related Context

PR #310 multi-agent review findings 8–9; [`frontend-code-quality` skill](../../.agents/skills/frontend-code-quality/SKILL.md) (duplication rules); [`table-view-pattern` skill](../../.agents/skills/table-view-pattern/SKILL.md).
