# Task Submission Reporting & Export — Frontend Design

> **TLDR**: Add a studio-scoped report-builder page where managers choose submitted-task sources and columns, load batched datasets into an IndexedDB-backed workspace, review show-centric tables with numeric summaries and QC links, and export client-side CSV/XLSX without generating server-side files.

## 1. Purpose

Provide a manager workflow that sits between the current per-task review queue and a future warehouse/reporting stack.

Primary user outcomes:

1. summarize moderation metrics such as GMV and views across many shows,
2. review premium-show post-production URLs for QC,
3. export a reusable spreadsheet without asking backend to generate/stash files.

## 2. Scope

In scope:

1. studio-scoped report builder UI
2. source/template/snapshot selection
3. show/task filter controls
4. batched query loading with append behavior
5. IndexedDB dataset cache for rerun/resume
6. client-side CSV export
7. client-side XLSX export from the same normalized dataset

Out of scope:

1. scheduled emails / recurring exports
2. cross-studio reporting
3. BI dashboards / pivot-table builder
4. offline task editing changes to existing execution flows

## 3. Recommended Route Shape

Add a dedicated manager-facing page:

- `/studios/$studioId/task-reports`

Rationale:

- keeps feature studio-scoped,
- avoids overloading `review-queue`, which is still per-task operational review,
- leaves room for future report categories under the same route.

## 4. Primary Studio-Manager Flow

1. Open `Task Reports`
2. Pick a saved definition or start a new report
3. Select one or more sources:
   - moderation template / snapshot
   - post-production template / snapshot
4. Choose fields/columns from the source catalog
5. Set scope filters:
   - show date range
   - client
   - task status
   - assignee / show if needed
6. Run query
7. Review show-centric table with:
   - blank cells for missing submissions,
   - numeric summaries,
   - clickable file/url values
8. Click `Load More` to append another batch into the same workspace
9. Export as CSV or XLSX from the locally cached workspace

## 5. UX Structure

## 5.1 Page sections

Recommended route decomposition:

1. `task-reports/index.tsx` — route container only
2. `report-definition-panel.tsx` — saved definitions and naming
3. `report-source-builder.tsx` — source selection + column picker
4. `report-scope-filters.tsx` — shareable URL-backed filters
5. `report-workspace-table.tsx` — preview table + summary row
6. `report-export-bar.tsx` — CSV/XLSX export actions and cache controls

This route will exceed 200 LOC quickly; keep container/orchestration separate from table/export sections.

## 5.2 Source selection UX

Each source card should show:

- template name
- task type
- snapshot version or "All matched versions"
- submitted task count in current source catalog
- selected field count

Column picker behavior:

- system columns (show name, show start time, client, assignee, task status) are always available,
- task-content columns come from snapshot field catalogs,
- incompatible source groups are surfaced early so managers know export may split.

## 5.3 Preview workspace

The preview table is show-centric.

Each row should be able to display:

- show metadata
- selected metrics from moderation task(s)
- selected QC link/file fields from post-production task(s)
- source-status indicators when a selected task is missing or not yet submitted

Numeric footer/summary strip should support:

- count of rows
- sum for selected number columns
- average for selected number columns

## 5.4 Export UX

Export controls should make partition behavior explicit:

- single compatible group -> one CSV or one XLSX sheet
- multiple groups -> multiple CSV downloads or one XLSX workbook with multiple sheets

Do not hide version splits. Managers need to know when outputs were separated because snapshot schemas differ.

## 6. State Management Plan

### 6.1 Server state

Use TanStack Query for:

- source catalog
- saved definition list/detail
- mutation endpoints for definition CRUD
- batched query requests

Do not override the app-wide `staleTime: 0` default unless the source catalog is proven static enough to justify it.

### 6.2 URL state

Keep shareable scope filters in the route search schema:

- `date_from`
- `date_to`
- `client_id`
- `task_status[]`
- optional `definition_id`

This preserves back/forward behavior and allows managers to share report views.

### 6.3 Local component state

Use local state for in-progress draft configuration only:

- selected sources
- selected columns
- local export format selection
- UI-only column ordering

Store only stable identifiers in local state where possible (`definitionId`, `sourceKey`, `fieldKey`), then derive full objects from query data.

### 6.4 IndexedDB workspace cache

Reuse the existing repo pattern of `idb-keyval`.

Suggested cache key:

- `task_report_workspace:${studioId}:${definitionHash}`

Suggested cached payload:

- normalized definition
- fetched cursor history
- show index
- partitions
- aggregate summaries
- `cached_at`
- `schema_version`

Behavior:

1. on successful batch fetch, merge into IndexedDB
2. reopening the same definition hash restores the previous workspace instantly
3. show a visible "cached as of <timestamp>" badge
4. allow manual `Clear Cache`

Recommended freshness rule:

- treat cached workspace as reusable but stale after 24 hours; keep it visible and offer rerun/refresh.

## 7. API Layer Plan

Create dedicated task-report API declarations and query keys, for example:

- `get-task-report-sources.ts`
- `get-task-report-definitions.ts`
- `create-task-report-definition.ts`
- `update-task-report-definition.ts`
- `delete-task-report-definition.ts`
- `query-task-report.ts`

Query keys should include studio scope and the normalized definition hash so cache isolation is deterministic.

Example key families:

- `taskReportSourceKeys.list(studioId, filters)`
- `taskReportDefinitionKeys.list(studioId)`
- `taskReportQueryKeys.run(studioId, definitionHash, cursor)`

## 8. Client Data Model

The frontend should treat the backend response as two layers:

1. `shows[]` index
2. `partitions[]` flat rows

Client responsibilities:

1. merge partition rows onto show rows for preview
2. keep partition boundaries for export
3. compute numeric summaries from cached partitions
4. surface duplicate-source warnings when returned by the API

This avoids forcing the backend to produce multiple specialized table shapes.

## 9. Export Implementation Strategy

### 9.1 CSV

CSV can be implemented with a small local serializer.

Rules:

- flatten arrays (`multiselect`) into a deterministic delimiter such as `; `
- export file/url fields as URL strings
- preserve empty string vs `null` distinctions consistently
- include system columns first, then selected task fields

### 9.2 XLSX

Recommend adding a browser-side workbook library only when this route ships.

Preferred approach:

- lazy-load the dependency from the export action,
- generate one sheet per partition,
- reuse the exact same normalized rows used by CSV.

Why lazy-load:

- no current workbook library exists in `erify_studios`,
- export is an infrequent manager action,
- avoids inflating the initial route bundle.

## 10. Link and File Preview Rules

1. URL/file fields render as anchors in the preview table.
2. Image-style URLs may optionally show thumbnail preview on row expand, not inline in dense tables.
3. Export output should remain plain URLs; do not attempt to embed files.
4. If backend later moves to signed URLs, this page must display a warning or refresh links before export.

## 11. Empty and Error States

Required states:

1. no source selected
2. selected source has no submitted tasks in current scope
3. cached workspace available but stale
4. multi-partition export warning
5. duplicate-source-on-show warning
6. batch query error while previous cached data still exists

The page must keep already fetched batches visible if a later batch fails.

## 12. Testing Plan

### 12.1 Unit tests

1. definition hash stability
2. partition-to-preview merge logic
3. numeric summary calculation
4. CSV serializer escaping and array handling
5. IndexedDB cache restore/clear behavior

### 12.2 Component tests

1. source selection and field picker interactions
2. preview table renders blank state for missing submissions
3. file/url cells render clickable links
4. export controls reflect single-group vs multi-group behavior

### 12.3 Integration tests

1. running a report appends later batches without dropping prior rows
2. saved definition reruns with URL filters intact
3. stale cached workspace can refresh cleanly into new data

## 13. Rollout Recommendation

### Milestone FE-1

1. source catalog + definition builder
2. batched preview workspace
3. IndexedDB cache
4. CSV export

### Milestone FE-2

1. XLSX multi-sheet export
2. richer row details / thumbnail preview for QC links
3. stronger compatibility warnings and partition labels

## 14. Risks and Mitigations

### 14.1 Dataset size

Risk:

- long date ranges can create very large in-browser datasets.

Mitigation:

- bounded scope required by API,
- append-only batches,
- explicit cache size / clear controls,
- no eager full-studio loads.

### 14.2 Cache drift

Risk:

- IndexedDB workspace can become stale after managers approve or edit tasks.

Mitigation:

- show cached timestamp,
- mark stale after 24h,
- rerun replaces or appends from fresh cursor chain.

### 14.3 Multi-version confusion

Risk:

- managers may not understand why exports split into multiple outputs.

Mitigation:

- label partitions clearly by template + snapshot version,
- explain the split in the export bar before download.

## 15. Verification Plan

When implemented, verify at minimum:

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios test`

Manual smoke should cover:

1. build a moderation metrics report by date range + client
2. append multiple query batches into one workspace
3. reopen cached workspace after route reload
4. export one compatible CSV
5. export a multi-partition XLSX workbook
