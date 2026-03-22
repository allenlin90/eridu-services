# Ideation: Task Report Run Query Batching

> **Status**: Deferred — monitor in Phase 3
> **Origin**: Task submission reporting design review (2026-03-21)
> **Related**: [BE design](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [feature doc](../features/task-submission-reporting.md)

## What

`TaskReportRunRepository.findSubmittedTasksInScope()` currently fetches all matching tasks in a single query, bounded by the 10,000-row preflight limit. For large scopes near the limit, this can allocate significant memory for the result set before row construction begins.

A cursor-based batching approach (e.g., 500 tasks per batch) would reduce peak memory usage by processing and discarding each batch before fetching the next.

## Why It Was Deferred

1. **Preflight enforces a hard cap.** The 10,000-row limit on both shows and tasks means the maximum result set is bounded and manageable for current Node.js heap sizes.
2. **Typical result sizes are small.** Most report runs cover 100–1,000 shows with 1–3 tasks each. Peak memory is not a practical concern at this scale.
3. **Batching adds complexity.** Cursor-based iteration requires ordered queries, batch state tracking, and careful handling of the row merge map across batches. This complexity is not justified until memory pressure is observed.

## Decision Gates for Promotion

Promote to a PRD/implementation when **any** of these are true:

1. **P95 memory usage** for report generation exceeds a concerning threshold (e.g., > 500 MB per request).
2. **The row cap is raised** beyond 10,000, making unbounded single-query fetches impractical.
3. **Async generation (BullMQ)** is implemented — batching becomes more natural in a worker context where streaming results is possible.

## Sketch

```typescript
// Cursor-based batch iteration
const BATCH_SIZE = 500;
let cursor: bigint | undefined;

while (true) {
  const batch = await this.repository.findSubmittedTasksBatch(studioUid, filters, {
    cursor,
    take: BATCH_SIZE,
  });

  if (batch.length === 0) break;

  for (const task of batch) {
    // merge into row map (same logic as current buildRows)
  }

  cursor = batch[batch.length - 1].id;
}
```

Key considerations:
- Query must be ordered by a stable cursor column (e.g., `id ASC`)
- Row merge map (`showRowMap`) persists across batches
- Duplicate detection (`duplicateSourceCount`) persists across batches
- Column metadata collection persists across batches
