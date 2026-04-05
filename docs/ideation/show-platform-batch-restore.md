# Ideation: Show Platform Batch Restore in replaceShowPlatforms

> **Status**: Active ideation
> **Origin**: Phase 4 show management PR review, April 2026
> **Related**: [studio-show-management.service.ts](../../apps/erify_api/src/studios/studio-show/studio-show-management.service.ts), [show-platform.repository.ts](../../apps/erify_api/src/models/show-platform/show-platform.repository.ts)

## What

`StudioShowManagementService.replaceShowPlatforms` handles platform assignment changes when a show is updated. It batches new creates (`createManyAssignments`) and soft-deletes (`softDeleteByPlatformIds`) but restores soft-deleted assignments one row at a time via individual `restoreAndUpdateAssignment` calls in a `Promise.all`. For N platforms being restored, this issues N individual `UPDATE` statements.

```typescript
// Current: one UPDATE per restored platform
...toRestore.map((item) =>
  this.showPlatformRepository.restoreAndUpdateAssignment(item.id, { ... })
),
```

## Why It Was Considered

For shows with many platforms being re-added after prior removal, the N individual UPDATEs introduce unnecessary round-trips to the database. This runs inside a `@Transactional()` block, so all round-trips are within a single connection, but the statement count still scales linearly with the number of restored platforms.

## Why It Was Deferred

1. A show rarely has more than 5–10 active platforms. The N-update cost is negligible at current scale.
2. Each restored assignment carries per-row field data (`liveStreamLink`, `platformShowId`, `viewerCount`, `metadata`) that varies per row. Batch-updating rows with heterogeneous field values requires a `CASE WHEN` or `updateMany`-with-loop pattern in Prisma, which is more complex than the current individual-update approach.
3. Prisma does not natively support batch updates with per-row heterogeneous data; the implementation would require either raw SQL or multiple `updateMany` calls grouped by common field combinations — both add significant complexity for a currently invisible bottleneck.

## Decision Gates (Promote When Any Are True)

1. A show reaches **20+ platforms** being restored in a single update operation and the transaction time is measurable (target: restore path should complete in under 100ms).
2. Query logs (enabled via the `observability-logging` skill) show `replaceShowPlatforms` transactions exceeding **500ms** under normal load.
3. A bulk-import or migration tool is needed that updates platform assignments for many shows at once — at that scale, the per-row UPDATE pattern would be a hard blocker.
4. The `ShowPlatform` model gains additional per-row mutable fields that make the CASE-WHEN approach worth the complexity investment.

## Implementation Notes (Preserved Context)

### What a batch restore would look like

Add `batchRestoreAndUpdate(items: Array<{ id: bigint; data: UpdatePayload }>)` to `ShowPlatformRepository`. Internally this can use a Prisma `$transaction` with mapped individual updates, or a raw SQL `UPDATE ... SET ... FROM (VALUES ...) AS v(id, field1, ...) WHERE show_platforms.id = v.id` for true batch execution.

### Why per-row data prevents a simple `updateMany`

Prisma's `updateMany` applies the same `data` object to all matched rows. Since each restored assignment has different field values, `updateMany` cannot replace the current approach without grouping rows by identical field combinations — which is fragile and requires N `updateMany` calls in the worst case anyway.

### Current performance profile

- Typical case: 1–3 platforms restored → 1–3 UPDATEs, immeasurable overhead.
- Edge case threshold: 20+ platforms restored → starts to be worth optimizing.
- All queries run within the same transaction and connection, so the overhead is statement parse/plan time only (no connection pool pressure).
