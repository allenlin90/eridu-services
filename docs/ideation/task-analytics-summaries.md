# Ideation: Task Analytics Summaries

> **Status**: Deferred from MVP
> **Origin**: Task submission reporting & export design review (2026-03-15)
> **Related**: [BE design](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [FE canonical](../../apps/erify_studios/docs/TASK_SUBMISSION_REPORTING.md), [feature doc](../features/task-submission-reporting.md)

## What

Add numeric aggregation (count, sum, average) to the task submission reporting system. This would appear as:

1. **Frontend summary strip** — a footer row in the preview table showing aggregated values per numeric column, computed client-side from the cached result.
2. **Portable `compute-summaries.ts`** — a pure function in `lib/` for client-side computation. If a BE pre-computation path is added later (e.g., for very large datasets), the same algorithm can be shared.

## Why It Was Considered

- Managers reviewing moderation metrics (GMV, views, conversion) naturally want totals and averages across the result set.
- A summary strip is standard UX for tabular data review.
- Since the FE now caches the full dataset and applies view filters client-side, summaries should update dynamically as view filters change.

## Why It Was Deferred

1. **MVP focus is data export, not analytics.** The primary user need is exporting submitted task data as CSV/XLSX. Summaries are a review convenience, not a blocker for the export workflow.
2. **Aggregation logic requires careful definition.** What "sum" and "average" mean depends on the field semantics (e.g. should GMV be summed across shows? across tasks? per-client?). Defining this correctly requires product input that hasn't been specified yet.
3. **Client-side aggregation is trivial for MVP result sizes.** With a 10,000-row cap and typical results of < 1,000 rows, the FE can compute summaries from the cached result without performance issues.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. **Product explicitly requires a summary strip** in the review workspace with defined aggregation semantics per field type.
2. **Result sizes consistently exceed 5,000 rows**, making client-side aggregation noticeably slow.
3. **Downstream consumers** (e.g. Show Economics, P&L rollups) need pre-computed aggregates from the report engine.

## Implementation Notes (Preserved Context)

### FE additions (when promoted)

- Add `compute-summaries.ts` to `src/features/task-reports/lib/` — pure function, zero framework imports.
- Render a summary strip component below the result table.
- Summaries re-compute when view filters change (since the summary should reflect the visible rows, not the full dataset).
- Each column summary: `{ count: number, sum: number, avg: number }` for numeric fields only.

### BE additions (if needed for scale)

- Add `compute-summaries.ts` to `src/models/task-report/lib/` — same algorithm.
- Include summaries in the inline result response alongside `rows[]` and `columns[]`.
- FE uses BE summaries for the unfiltered view; re-computes client-side after view filter changes.

### Verification items (when promoted)

- FE: summary strip renders correct values from cached result.
- FE: summaries update correctly when view filters change.
- FE: summaries handle `null` values (exclude from count/sum/avg, don't treat as zero).
