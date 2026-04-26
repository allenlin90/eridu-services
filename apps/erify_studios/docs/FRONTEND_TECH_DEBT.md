# erify_studios Frontend Tech Debt Register

> **Status**: Active register
> **Scope**: `apps/erify_studios`
> **Last reviewed**: 2026-04-26

## Active Debt

| Area | Evidence | Risk | Proposed fix | PR size |
| --- | --- | --- | --- | --- |
| Large task-template builder modules | `components/task-templates/builder/task-template-builder.tsx`, `field-editor.tsx`, and shared renderer files exceed cleanup thresholds and mix builder state, validation, and rendering concerns. | Medium | Split builder state, field editing, preview, and validation helpers into smaller feature-local modules with parity tests for schema output. | Large |
| Large JSON/task execution surfaces | `components/json-form/json-form.tsx`, `features/tasks/components/task-execution-sheet.tsx`, and `studio-task-action-sheet.tsx` are oversized mixed UI/state modules. | Medium | Extract focused hooks for draft state, upload state, and action orchestration before changing rendering. | Large |
| Task report UI complexity | `features/task-reports/components/report-column-picker.tsx`, `report-builder.tsx`, and `report-result-table.tsx` contain dense UI and table logic. | Medium | Split route/controller state from presentational column groups and virtualized result rendering. | Medium |
| Test mock typing | Scanner still finds many `any` usages in test mocks and integration stubs. | Low | Introduce shared typed test doubles for `@eridu/ui`, TanStack Router, and common table components. | Medium |
| Column config Fast Refresh disables | Several column config files disable `react-refresh/only-export-components`. | Low | Separate pure column factories from any cell components or constants that trigger the rule. | Small |
| Generated router typing noise | `src/routeTree.gen.ts` contains generated `as any` casts. | Low | Leave generated output alone; revisit only when TanStack Router codegen changes. | Separate tooling |
| Optional shared non-search combobox mode | `AsyncCombobox` always renders a search input and requires `onSearch`. Current `erify_studios` usages now wire real search, but future finite static lookups may need a non-searchable mode. | Low | Add an explicit non-searchable mode to `@eridu/ui` that hides/disables `CommandInput`, then migrate legitimate static lookup fields. | Small/medium shared UI |
| Server-authoritative table pagination across remaining listing hooks | Only the three studio-show listing hooks (`use-studio-shows`, `use-studio-show-management`, `use-creator-mapping-shows`) derive `tablePagination` (pageIndex/pageSize/total/pageCount) from `data.meta`. Other listing hooks (clients, platforms, users, creators, studios, schedules, studio-rooms, show-statuses/types/standards, memberships, studio-members, studio-shifts, task-templates, task-report-definitions, studio-creator-roster) still surface raw URL `pagination` to consumers, so the table briefly disagrees with displayed data during `keepPreviousData` transitions. | Low | Replicate the `tablePagination` derivation pattern in each listing hook and audit consumers reading `meta?.total`/`meta?.totalPages` separately. | Medium (cross-cutting consumer audit) |
| Shared selection-survives-page-change hook location | `useSelectedRowSnapshots()` lives under `features/studio-shows/hooks/` but is generic over `{ id: string }` and intended for any route surface. | Low | Move to `lib/` or `features/admin/hooks/` once a non-shows consumer needs it. | Small (file move + import updates) |

## Resolved In This Cleanup

- Legacy show form lookup fields no longer use no-op `onSearch`; they now query by `name` and pass the TanStack Query `AbortSignal`.
- Creator mapping table query now preserves previous data during server-driven page/filter transitions.
- Admin form dialogs now distinguish submitted schema fields from render-only display fields, removing read-only ID casts.
- Duplicate selected-row snapshot logic in show operations and creator mapping routes is centralized in `useSelectedRowSnapshots()`.
- Listing hooks that previously used the inline `(prev) => prev` placeholder idiom now use `keepPreviousData` from TanStack Query, matching the rest of `erify_studios` (`use-my-tasks`, `studio-members/api/members`, `memberships/api/get-memberships`, `memberships/api/get-studio-memberships`, `studio-creator-roster/api/studio-creator-roster`).
