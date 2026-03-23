# Show Readiness

> Studio show readiness triage panel and Issues filter on `/studios/:studioId/show-operations`.

## Implementation

- Panel component: [show-readiness-triage-panel.tsx](../src/features/studio-shows/components/show-readiness/show-readiness-triage-panel.tsx)
- View-model utils: [show-readiness.utils.ts](../src/features/studio-shows/utils/show-readiness.utils.ts)
- Scope datetime bounds: [show-scope.utils.ts](../src/features/studio-shows/utils/show-scope.utils.ts)
- Route integration: [index.tsx](../src/routes/studios/$studioId/show-operations/index.tsx) — `ShowTaskReadinessSection`
- Backend orchestration: [task-orchestration.service.ts](../../erify_api/src/task-orchestration/task-orchestration.service.ts) — `getStudioShowsWithTaskSummary`

## What it does

The readiness panel on the studio show operations page:

1. Summarises scope health — X of Y shows need attention, % ready progress bar
2. Groups issues into three priority buckets:
   - **No task plan** — shows with zero tasks
   - **Unassigned workload** — tasks exist but staffing incomplete
   - **Missing required coverage** — missing `SETUP`/`CLOSURE`, or moderation on premium shows
3. Per-bucket popover exposes affected show names, timing, and issue tags
4. "Issues" CTA narrows the shows table to attention shows only (`needs_attention=true`)

## Key behaviors

- Shows table, readiness panel, and Issues filter all use the same datetime scope window (`date_from/date_to`) produced by `toShowScopeDateTimeBounds` with D+1 `05:59` local operational-day cutoff.
- `needs_attention=true` triggers BE shift-alignment with `match_show_scope=true` and `include_past=true`, then constrains the paginated show query to warning show UIDs.
- Scope-total count refreshes via `refreshSignal` in query key. The shift-alignment refetch is gated to signal increments only (not mount or scope change) via `useRef` to avoid duplicate requests.
- Bulk Generate/Assign dialogs close immediately on confirm; row selection is preserved for chained follow-up.

## Required task type baseline

`SETUP` + `CLOSURE` are required for all shows. Premium shows (standard name = `'premium'`) additionally require at least one moderation task (`missing_moderation_task`). `ACTIVE` is not a readiness gate.
