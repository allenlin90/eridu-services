# Task Submission Reporting & Export — Backend Design

> **TLDR**: Add a studio-scoped reporting API that stores reusable report definitions as JSON, resolves submitted-task data from immutable template snapshots, returns batched compatibility-grouped datasets, and leaves final review/export materialization to the client.

## 1. Purpose

Support manager-facing review and export of submitted task data without introducing server-side report files or a warehouse dependency.

Primary examples:

- moderation managers summarizing GMV, views, and performance metrics across many shows,
- studio managers reviewing post-production upload URLs for premium-show QC,
- admins exporting submitted task evidence by client or date range.

This design must fit the current task architecture:

- `Task.content` stores submitted values,
- `TaskTemplateSnapshot.schema` is the historical source of truth,
- studio-scoped routes already exist for review and task listing,
- no DB internal IDs may leak through API responses.

## 2. Goals

1. Persist reusable report definitions as JSON only.
2. Resolve selected fields against immutable task snapshots.
3. Support batched, append-friendly queries for client-side caching.
4. Return compatibility-grouped datasets so exports remain schema-safe.
5. Reuse existing task/show/client relations instead of introducing a parallel reporting store.

## 3. Non-Goals

1. No server-side CSV/XLSX generation.
2. No cloud-storage report artifacts.
3. No warehouse or BigQuery dependency for the first version.
4. No arbitrary formula engine in backend report definitions.

## 4. Key Design Decisions

### 4.1 Snapshot schema is canonical

Current template schema cannot be the reporting source of truth because tasks already persist against immutable snapshots. Report extraction must always resolve from `task.snapshot.schema` plus `task.content`.

Template-based source selection is allowed, but only as a convenience that resolves to one or more actual snapshot groups at query time.

### 4.2 Show-centric review, snapshot-centric export

Managers want one operational review table per show, but backend export groups must preserve schema compatibility. The API therefore returns:

1. a top-level show index for client-side joining, and
2. one or more source partitions keyed by snapshot compatibility.

The client can merge partitions for on-screen review by `show_uid`, but export must keep incompatible partitions separate.

### 4.3 Safe partition key

Do not group rows by `task.type + snapshot.version` alone. Snapshot versions are local to each template and can collide across unrelated schemas.

Safe MVP partition key:

- `template_uid`
- `snapshot_version`
- optional future `schema_signature`

Future cross-template merging is acceptable only if a deterministic schema-compatibility fingerprint is introduced.

### 4.4 No materialized report storage

The backend stores only:

- saved report definitions,
- source catalog metadata,
- batched query responses.

The backend does **not** persist generated files or cached datasets.

### 4.5 Typed submission timestamp is worth adding

Current task model has `completedAt`, but not a first-class `submittedAt` for `REVIEW`. Reporting and sorting on "submitted tasks" becomes awkward if this remains buried only in metadata transitions.

Recommended addition:

- `Task.submittedAt DateTime? @map("submitted_at")`

Set when a task transitions into `REVIEW` for the current submission cycle. Keep `completedAt` for approval/final completion.

## 5. Proposed Schema Additions

### 5.1 `Task` model

Add:

- `submittedAt DateTime? @map("submitted_at")`
- index on `[studioId, submittedAt]`
- optional index on `[templateId, submittedAt]`

Reason:

- reliable filtering of submitted work,
- stable sorting for batched report queries,
- avoids JSON-metadata queries for core report workflows.

### 5.2 `TaskReportDefinition` model

Add a dedicated soft-deletable studio-scoped model.

Suggested fields:

- `id BigInt`
- `uid String @unique`
- `studioId BigInt`
- `name String`
- `description String?`
- `definition Json`
- `createdById BigInt?`
- `updatedById BigInt?`
- `createdAt DateTime`
- `updatedAt DateTime`
- `deletedAt DateTime?`

`definition` JSON stores:

- source descriptors (`template` or `snapshot`)
- selected field keys
- show/task filters
- optional preferred export format / column ordering

Do **not** store generated rows or file URLs here.

## 6. Shared API Contract Additions (`@eridu/api-types/task-management`)

Add a new reporting schema module under the task-management domain. Expected DTOs:

- `taskReportSourceDto`
- `taskReportDefinitionDto`
- `createTaskReportDefinitionSchema`
- `updateTaskReportDefinitionSchema`
- `taskReportQueryRequestSchema`
- `taskReportQueryResponseSchema`
- `taskReportPartitionDto`
- `taskReportColumnDto`

Key request concepts:

- `sources[]`: template-based or snapshot-based selection
- `columns[]`: selected field keys plus optional display overrides
- `scope`: show filters (`show_uids`, `date_from`, `date_to`, `client_id`, `show_uid`, etc.)
- `submitted_statuses`: default `[REVIEW, COMPLETED, CLOSED]`
- `cursor`
- `limit`

Key response concepts:

- `shows[]`: stable show metadata index
- `partitions[]`: compatibility-grouped flat rows
- `next_cursor`
- `scope_summary`

## 7. Endpoint Plan

### 7.1 Source catalog

`GET /studios/:studioId/task-report-sources`

Purpose:

- list available templates/snapshots that have submitted tasks in the studio,
- return field catalogs derived from snapshot schemas,
- expose usage summary (`submitted_task_count`, `latest_show_start`, etc.).

Access:

- `ADMIN`, `MANAGER`, `MODERATION_MANAGER`

### 7.2 Saved definition CRUD

- `GET /studios/:studioId/task-report-definitions`
- `GET /studios/:studioId/task-report-definitions/:definitionUid`
- `POST /studios/:studioId/task-report-definitions`
- `PATCH /studios/:studioId/task-report-definitions/:definitionUid`
- `DELETE /studios/:studioId/task-report-definitions/:definitionUid`

Purpose:

- persist named JSON definitions only,
- support repeated manager workflows,
- keep ownership studio-scoped.

### 7.3 Batched query

`POST /studios/:studioId/task-reports/query`

Body accepts either:

- inline definition payload, or
- `definition_uid` plus optional scope overrides.

Response shape should be optimized for client-side merging and export:

```text
scope_summary
shows[]
partitions[]
next_cursor
```

Each partition row should include:

- `show_id`
- `task_id`
- `task_status`
- `submitted_at`
- `completed_at`
- `template_id`
- `snapshot_version`
- `values`
- `duplicate_source_on_show`

## 8. Query Strategy

### 8.1 Scope resolution

1. Validate the report definition.
2. Require bounded scope: `show_uids` or `date_from/date_to`.
3. Resolve template-based sources to matching submitted-task snapshots inside scope.
4. Build a lean Prisma query over `Task` with:
   - `deletedAt: null`
   - studio scope
   - submitted statuses
   - target show filters
   - template/snapshot filters

### 8.2 Lean select/include

Select only what the client needs:

- task UID, status, submitted/completed timestamps,
- template UID/name,
- snapshot version/schema,
- `content`,
- show UID/name/external ID/start/end,
- client name,
- studio room name,
- assignee name,
- creator names if needed for system columns.

Avoid broad includes that duplicate full show objects.

### 8.3 Row extraction

For each matched task:

1. read selected field definitions from `snapshot.schema.items`,
2. pull matching values from `task.content`,
3. normalize by field type,
4. append into the appropriate partition.

Normalization rules:

- `number` -> numeric JSON value
- `checkbox` -> boolean
- `multiselect` -> array of strings in API response
- `file` / `url` -> raw URL string
- missing key -> `null`

### 8.4 Duplicate-source handling

MVP assumption: one active non-deleted task per show/template is the normal case.

If multiple non-deleted submitted tasks match the same show + source partition:

- do not silently merge them,
- emit separate rows,
- set `duplicate_source_on_show = true`.

This keeps export lossless and flags data hygiene issues explicitly.

### 8.5 Pagination

Use cursor pagination for the batched query endpoint.

Recommended order:

1. `show.startTime DESC`
2. `show.uid DESC`
3. `task.uid DESC`

Reason:

- append-friendly for client workspaces,
- stable resume semantics for IndexedDB cache,
- avoids deep offset pagination on larger report windows.

## 9. Service and Module Boundaries

Recommended module split:

- `StudioTaskReportController` for studio-scoped HTTP surface
- `TaskReportDefinitionService` for CRUD on saved definitions
- `TaskReportQueryService` as orchestration layer for source resolution + batched query assembly
- `TaskReportDefinitionRepository` for preset persistence
- extend `TaskRepository` with lean report-query helpers as needed

Boundary rules:

- controllers stay transport-only,
- definition CRUD is a model-style service,
- batched reporting query is orchestration because it coordinates tasks, templates, snapshots, and shows.

## 10. Validation and Guardrails

1. Roles: `ADMIN`, `MANAGER`, `MODERATION_MANAGER`
2. Maximum sources per query: recommended `<= 10`
3. Maximum selected fields per source: recommended `<= 50`
4. Maximum batch size: recommended `<= 100` shows per page
5. Require bounded scope to prevent whole-studio full scans
6. Reject unknown field keys for snapshot-based definitions at validation time
7. For template-based definitions, allow missing keys in older snapshots but return `null` rather than fabricating values

## 11. Risks and Mitigations

### 11.1 Template evolution drift

Risk:

- template-based saved definitions may reference field keys that disappear in later versions.

Mitigation:

- snapshot-based presets remain exact,
- template-based presets return `null` for missing fields and surface compatibility warnings.

### 11.2 File URL longevity

Risk:

- if upload URLs ever become signed/expiring, exported values may go stale.

Mitigation:

- keep URL export as current-state behavior,
- if signed URLs are introduced later, move report responses to stable asset identifiers plus on-demand re-sign endpoints.

### 11.3 Large JSON payloads

Risk:

- selected task content can become large over long date ranges.

Mitigation:

- bounded scope,
- lean select,
- cursor pagination,
- selected-field extraction in service before response serialization.

## 12. Verification Plan

When implemented, verify at minimum:

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api test`

Targeted tests:

1. source catalog resolves snapshot field metadata correctly
2. batched query partitions rows by template + snapshot version
3. template-based definitions return `null` for missing keys on older snapshots
4. submitted-status filtering excludes in-progress work by default
5. saved definition CRUD respects studio scoping and soft delete
