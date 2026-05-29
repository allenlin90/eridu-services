# Show Readiness

> Studio show readiness triage panel and Issues filter on `/studios/:studioId/task-setup`.

## Implementation

- Panel component: [show-readiness-triage-panel.tsx](../src/features/studio-shows/components/show-readiness/show-readiness-triage-panel.tsx)
- View-model utils: [show-readiness.utils.ts](../src/features/studio-shows/utils/show-readiness.utils.ts)
- Scope datetime bounds: [show-scope.utils.ts](../src/features/studio-shows/utils/show-scope.utils.ts)
- Route integration: [index.tsx](../src/routes/studios/$studioId/task-setup/index.tsx) — `ShowTaskReadinessSection`
- Backend orchestration: [task-orchestration.service.ts](../../erify_api/src/task-orchestration/task-orchestration.service.ts) — `getStudioShowsWithTaskSummary`

## What it does

The readiness panel on the studio task setup page:

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

Currently, the baseline required task type assignments are hardcoded:
- **All shows**: Require `SETUP` + `CLOSURE` task types.
- **Premium shows** (where show standard name is `'premium'`): Additionally require at least one active, loop-based task template (`missing_moderation_task`) to be generated and assigned.
- **ACTIVE** tasks (unless loop-based) are not a readiness gate by default.

### Future Configurable Settings
Under the proposed **Studio Configuration & Settings** architecture (see [studio-config-settings.md](../../../docs/ideation/studio-config-settings.md)), this baseline will be configurable per-studio. Studios will be able to define exactly what task type assignments and structural check policies (like loop tasks) are required for `bau` and `premium` shows to be counted as fully complete and ready.
