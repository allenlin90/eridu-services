---
name: task-reporting-patterns
description: Task Submission Reporting feature (feat/task-submission-reporting) — merged final state, backend+frontend patterns confirmed correct
metadata:
  type: project
---

Merged final state (after df5d5cd4):

- `TaskReportDefinition` Prisma model has `version` field. Optimistic lock check is in service layer
  (`existing.version !== payload.version` → 409). `version: { increment: 1 }` passed inside `data` to repository. CORRECT.
- `TaskReportDefinitionRepository` uses `txHost.tx` via a `delegate` getter for all writes. `TaskReportScopeRepository`
  uses `this.prisma` directly (intentional — read-only analytics, never in a transaction).
- `TaskReportDefinitionRepository.updateInStudio()` accepts `Prisma.TaskReportDefinitionUpdateInput` in its params type
  — acceptable (service never imports Prisma directly). `TaskReportScopeRepository` exported types contain
  `Prisma.JsonValue`; services consume via `Awaited<ReturnType<...>>` inference. Accepted pattern.
- `getTaskReportSourcesQuerySchema` uses `superRefine` + typed `.transform()` instead of inner `.parse()` — correct,
  avoids bypassing `ZodValidationPipe` and leaking raw `ZodError`.
- `sharedFieldsListSchema` in `StudioService` uses `safeParse` + `HttpError.internalServerError()` — keeps error
  propagation in the service layer. CORRECT.
- `TASK_REPORT_SYSTEM_COLUMN.SHOW_ID` = `'show_id'` (plain string, not BigInt) — show UIDs are safe to expose.
- `enforcePreflightLimit` runs 2 parallel COUNT queries before extraction (Layer 1 guardrail). Show-exceeds branch
  checked first; when BOTH exceed, only the show message is shown (asymmetric). Known deferred follow-up.
- 409 conflict on definition update handled in FE `useTaskReportDefinitionMutations.updateMutation.onError` with a
  specific "reload" message.
- `console.error` remains in two COMPONENT-LEVEL try/catch blocks (`report-builder.tsx:247`,
  `task-report-definitions-viewer.tsx:76`) — pre-pattern, non-blocking, acceptable.
- `date_preset` accepted in API scope but never resolved to a date range server-side; FE resolves the preset to explicit
  dates before sending. Intentional per PRD.
- `parseDateBoundary` in `TaskReportScopeService` uses local-tz parse (`new Date(\`${date}T00:00:00\`)`) — intentional,
  matches existing show/task filtering behavior (see `combineDateAndTime` note in `studio-shift-schedule-patterns.md`).
- `sortedAllRows` (pre-filter) is used for CSV export; `sortedRows` (post-filter) is used for the visible table —
  correct, CSV exports all rows regardless of view filters.
