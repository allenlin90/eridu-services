# Tech Debt: Studios Multi-Select Filter Dropdown and Show-Time Cell Are Copy-Pasted Across Features

## Current Issue

Two presentation patterns recur across `erify_studios` with no shared extraction:

1. **Multi-select filter dropdown + array-toggle handler.** The "Impact kind" and "Resolution" dropdowns in `src/features/shows/components/schedule-publish-impacts-toolbar.tsx` are structurally identical `DropdownMenu`/`DropdownMenuCheckboxItem` blocks, and `toggleImpactKind`/`toggleResolutionStatus` in `src/routes/studios/$studioId/schedule-publish-impacts.tsx` are copy-identical array-toggle callbacks. The same unextracted shape already exists in `performance-filter-fields.tsx` and `my-tasks-toolbar.tsx`.
2. **Show start/end-time table cell.** `schedule-publish-impacts-columns.tsx` renders the show time with the same `date-fns` format strings and stacked layout as `creator-mapping-show-columns.tsx` and `studio-shows-table/columns.tsx`, with no shared cell component across the three.

## Why It Matters

Each new operational surface re-implements both patterns by copy-paste, so label/format/behavior drift is only prevented by reviewer vigilance. The multi-agent review of PR #310 confirmed this is a recurring gap (4+ call sites each), not a one-off.

## Desired Direction

- Extract a generic `MultiSelectFilterDropdown` (options, selected values, onToggle) into the studios feature-shared layer — or `@eridu/ui` if `erify_creators` grows the same need per the package-extraction rule — and migrate the existing call sites.
- Extract a shared show-time cell component (or column-helper) used by the three column files.

Per the repo rule, this is broad cleanup: do it in a dedicated scoped PR, not folded into a feature PR.

## Trigger To Fix

- The next PR that would add another copy of either pattern (a new multi-select filter dropdown or another show-time column) — extract first, then build the new surface on the shared piece.

## Acceptance Criteria

- One shared multi-select filter dropdown component with the existing call sites (`schedule-publish-impacts-toolbar`, `performance-filter-fields`, `my-tasks-toolbar`) migrated and visually unchanged.
- One shared show-time cell used by the three column files, same rendered output.

## Related Context

PR #310 multi-agent review findings 8–9; [`frontend-code-quality` skill](../../.agents/skills/frontend-code-quality/SKILL.md) (duplication rules); [`table-view-pattern` skill](../../.agents/skills/table-view-pattern/SKILL.md).
