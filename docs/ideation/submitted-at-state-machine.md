# Ideation: Typed Submission Timestamp & State Machine

> **Status**: Deferred from MVP
> **Origin**: Task submission reporting & export design review (2026-03-15)
> **Related**: [BE design §4.7](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)

## What

Add a first-class `submittedAt` field to the `Task` model:

- `Task.submittedAt DateTime? @map("submitted_at")`
- Set when a task transitions into `REVIEW` for the current submission cycle.
- Keep `completedAt` for approval/final completion.

This enables precise filtering and sorting on "when was this task submitted" without relying on `updatedAt` (which changes on any update) or buried metadata fields.

## Why It Was Considered

- Reporting and sorting on submitted tasks is a core use case for the export feature.
- `updatedAt` is imprecise — it changes on any task update, not just submission.
- A typed field enables efficient DB indexing: `[studioId, submittedAt]`, `[templateId, submittedAt]`.
- Stable sort ordering for batched report queries requires a deterministic, submission-specific timestamp.

## Why It Was Deferred

1. **Historical backfill coverage is poor.** The most common submission path (non-overdue member submission via `MeTaskService`) writes no recoverable submission timestamp to metadata. The backfill would leave the majority of historical tasks with `submittedAt = null`.
2. **`status` + `updatedAt` is sufficient for MVP.** The export feature filters by status (`REVIEW`, `COMPLETED`, `CLOSED`) and sorts by `updatedAt`. This is imprecise but adequate for the initial use case.
3. **Adding the field requires changes in two submission paths.** Both `task.service.ts` (studio-sourced) and `me-task.service.ts` (member-sourced) must set `submittedAt` on transition to `REVIEW`. Getting the resubmission semantics right (overwrite on re-submit vs. preserve first submission) requires product clarity.
4. **Migration + backfill adds deployment risk** that is disproportionate to the MVP export feature.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. **Product requires precise submission timestamp filtering** (e.g. "show me tasks submitted between 2pm and 6pm").
2. **Sort ordering by `updatedAt` produces confusing results** in production — managers report seeing tasks in unexpected order.
3. **A downstream feature** (e.g. SLA tracking, submission latency metrics) needs `submittedAt` as a first-class field.

## Implementation Notes (Preserved Context)

### Schema addition

```prisma
model Task {
  // ... existing fields
  submittedAt DateTime? @map("submitted_at")
  // index: [studioId, submittedAt]
  // optional: [templateId, submittedAt]
}
```

### Resubmission semantics

If a task is rejected back to `IN_PROGRESS` and resubmitted, `submittedAt` is **overwritten** with the latest submission time. This means `submittedAt` always reflects the most recent submission, not the first. The full submission history remains available in `metadata.audit` for audit purposes.

### Going-forward requirement

When `submittedAt` is added, the transition to `REVIEW` must set it in **both** submission paths:
- `task.service.ts` — studio-sourced updates: add `submittedAt = new Date()` when `payload.status === REVIEW`
- `me-task.service.ts` — member-sourced: add `submittedAt = new Date()` when action is `SUBMIT_FOR_REVIEW`

### Historical backfill strategy — best-effort only

| Path | `metadata.audit.last_transition.at` | `metadata.due_warning.submitted_at` | Recoverable? |
|---|---|---|---|
| Studio-sourced status update | Written (when `auditContext.source === 'studio'`) | Only if overdue | Yes — use `last_transition.at` when `to === REVIEW` |
| Overdue member submission | Not written (no audit context in `MeTaskService`) | Written (when `now > task.dueDate`) | Yes — use `due_warning.submitted_at` |
| **Non-overdue member submission** | Not written | Not written | **No** — no recoverable timestamp |

Non-overdue member submissions (the most common case) have neither field. **The backfill will leave the majority of historical tasks with `submittedAt = null`.** Treat historical `submittedAt` data as sparse, not authoritative.

### Reporting query impact

The reporting query must treat `null` `submittedAt` as valid (task was submitted before the field existed) and fall back to `updatedAt` for sort ordering, with this fallback flagged as imprecise in API responses.

### Verification items (when promoted)

- `submittedAt` backfill correctly extracts timestamps from audit metadata where available.
- `submittedAt` is overwritten on resubmission (rejection → resubmit cycle).
- Both submission paths (`task.service.ts`, `me-task.service.ts`) set `submittedAt` correctly.
- Sort ordering gracefully handles mixed `submittedAt` / `null` rows.
