# Ideation: Task Analytics Summaries

> **Status**: Deferred from MVP
> **Origin**: Task submission reporting & export design review (2026-03-15)
> **Related**: [BE design](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [PRD](../../docs/prd/task-submission-reporting.md)

## What

Add numeric aggregation (count, sum, average) to the task submission reporting system. This would appear as:

1. **Backend pre-computed summaries** — stored in the `TaskReportResult` JSONB alongside `rows[]` and `columns[]`, computed during result generation.
2. **Frontend summary strip** — a footer row in the preview table showing aggregated values per numeric column.
3. **Shared `compute-summaries.ts`** — a portable pure function in `lib/` that both BE (during generation) and FE (for client-side re-computation after filtering) can use.

## Why It Was Considered

- Managers reviewing moderation metrics (GMV, views, conversion) naturally want totals and averages across the result set.
- A summary strip is standard UX for tabular data review.
- Pre-computing on the BE avoids large client-side aggregation for big result sets.

## Why It Was Deferred

1. **MVP focus is data export, not analytics.** The primary user need is exporting submitted task data as CSV/XLSX. Summaries are a review convenience, not a blocker for the export workflow.
2. **Aggregation logic requires careful definition.** What "sum" and "average" mean depends on the field semantics (e.g. should GMV be summed across shows? across tasks? per-client?). Defining this correctly requires product input that hasn't been specified yet.
3. **Client-side aggregation is trivial for MVP result sizes.** With a 10,000-row cap and typical results of < 2,000 rows, the FE can compute summaries from the stored result JSON without performance issues. Pre-computing on the BE adds complexity without clear benefit at this scale.
4. **Shared `compute-summaries.ts` extraction is premature.** Until both BE and FE need the same algorithm, maintaining a shared package adds overhead.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. **Product explicitly requires a summary strip** in the review workspace with defined aggregation semantics per field type.
2. **Result sizes consistently exceed 5,000 rows**, making client-side aggregation noticeably slow.
3. **Downstream consumers** (e.g. Show Economics, P&L rollups) need pre-computed aggregates from the report engine.

## Implementation Notes (Preserved Context)

### BE additions (when promoted)

- Add `compute-summaries.ts` to `src/models/task-report/lib/` — pure function, zero framework imports.
- Compute summaries per partition during result generation (after all batches complete).
- Store as `summaries` key in the `TaskReportResult.result` JSONB.
- Each partition summary: `{ field_key: { count: number, sum: number, avg: number } }` for numeric fields only.

### FE additions (when promoted)

- Add `compute-summaries.ts` to `src/features/task-reports/lib/` — same algorithm, FE-portable.
- Render a summary strip component below the preview table.
- Use BE summaries for the standard view; re-compute client-side only after local column filtering.
- If both BE and FE converge on the same algorithm, extract to `@eridu/report-core`.

### Verification items (when promoted)

- BE: numeric summaries (count, sum, avg) are correctly computed and stored in result JSONB.
- FE: summary strip renders correct values from stored result.
- FE: client-side re-computation after column filtering matches expected values.
