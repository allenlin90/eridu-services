# Tech Debt: Studios Filter Groups and Show-Time Cells Still Lack Cross-Feature Sharing

## Current Issue

Two presentation patterns recur across `erify_studios` with no shared extraction:

1. **Multi-select filter groups + array-toggle handler.** The schedule-publish impacts toolbar now consolidates its filters and uses one local generic `CheckboxFilterGroup`, removing its two copy-pasted dropdown blocks. Comparable multi-select behavior remains independently implemented in `performance-filter-fields.tsx` and `my-tasks-toolbar.tsx`, while `toggleImpactKind`/`toggleResolutionStatus` in `src/routes/studios/$studioId/schedule-publish-impacts.tsx` remain copy-identical array-toggle callbacks.
2. **Show start/end-time table cell.** `schedule-publish-impacts-columns.tsx` renders the show time with the same `date-fns` format strings and stacked layout as `creator-mapping-show-columns.tsx` and `studio-shows-table/columns.tsx`, with no shared cell component across the three.

## Why It Matters

Each new operational surface can still re-implement these patterns by copy-paste, so label/format/behavior drift is only prevented by reviewer vigilance. The schedule-publish UX correction removed the local duplicate filter menus but did not establish a stable cross-feature filter-group API.

## Desired Direction

- Once another surface needs the same consolidated filter-group behavior, extract a generic multi-select filter group (options, selected values, onToggle) into the studios feature-shared layer — or `@eridu/ui` if `erify_creators` grows the same need per the package-extraction rule — and migrate the applicable call sites. Do not revive one-dropdown-per-filter UX merely to share the old shape.
- Extract a shared show-time cell component (or column-helper) used by the three column files.

Per the repo rule, this is broad cleanup: do it in a dedicated scoped PR, not folded into a feature PR.

## Trigger To Fix

- The next PR that would add another copy of either pattern (a new multi-select filter group inside a consolidated filter surface or another show-time column) — extract first, then build the new surface on the shared piece.

## Acceptance Criteria

- One shared multi-select filter-group component with applicable call sites (`schedule-publish-impacts-toolbar`, `performance-filter-fields`, `my-tasks-toolbar`) migrated without changing each surface's intended consolidated filter composition.
- One shared show-time cell used by the three column files, same rendered output.

## Related Context

PR #310 multi-agent review findings 8–9; [`frontend-code-quality` skill](../../.agents/skills/frontend-code-quality/SKILL.md) (duplication rules); [`table-view-pattern` skill](../../.agents/skills/table-view-pattern/SKILL.md).
