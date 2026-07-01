# Tech Debt: Schedule Publish Writes Impact Audits One Show at a Time

## Current Issue

`PublishingService.publish` writes one `Audit` row per affected show, sequentially, inside two loops:

- The remove-path loop (`for (const removed of toRemove)`), which awaits `recordSchedulePublishImpact` per confirmed-future show going missing.
- The `confirmedFutureUpdates` loop, which awaits `recordSchedulePublishImpact` per confirmed-future show that changed.

Each call does its own nested `Audit` + `AuditTarget` insert. For a schedule with many affected shows in one publish, this is N sequential round trips inside a single `@Transactional({ timeout: 30_000 })` block, rather than one batched write.

## Why It Matters

This is an efficiency gap, not a correctness bug — schedule publishes are an infrequent, admin/Apps-Script-triggered operation, not a user-latency-sensitive hot path, and affected-show counts per publish are bounded by schedule size (observed: tens, not thousands). At today's scale this comfortably fits inside the 30s transaction timeout.

It becomes worth fixing if publish volume or schedule size grows enough to risk the transaction timeout, or if `AuditRepository` grows a real bulk-insert primitive for other reasons.

## Desired Direction

Do **not** parallelize these writes with `Promise.all` inside the existing `@Transactional()` block — Prisma interactive transactions share a single underlying connection, and issuing concurrent queries against the same transaction client is unsupported and can produce connection contention or interleaved-query errors. The safe fix is a genuine bulk write:

- Add a repository-level bulk-create primitive to `AuditRepository` (batched `audit.createMany` + `auditTarget.createMany`, since `AuditService.create` currently does one nested per-row write).
- Have `PublishingService` collect all `schedule_publish_impact` payloads for a given publish and issue one bulk write at the end of `publish`, instead of one `recordSchedulePublishImpact` call per show.

## Trigger To Fix

- A publish approaches or exceeds the 30s transaction timeout in practice.
- `AuditRepository` grows a bulk-create primitive for an unrelated reason (removing this gap becomes nearly free at that point).
- Schedule sizes or publish frequency materially increase.

## Acceptance Criteria

- `PublishingService.publish` issues a bounded number of DB round trips for impact-audit writes regardless of how many shows are affected in a single publish, without introducing concurrent queries on the same transaction client.

## Related Context

Identified during PR #246 review (`schedule-publish-impact-review` branch). See also [`schedule-publish-removal-no-audit.md`](./schedule-publish-removal-no-audit.md) and [`schedule-publish-active-task-check-mismatch.md`](./schedule-publish-active-task-check-mismatch.md) for other open items in this same code path.
