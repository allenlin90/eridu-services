# Tech Debt: Schedule Publish's Active-Task Check Disagrees With the Cancellation Gate's

## Current Issue

`PublishingService`'s remove-path active-task check (used to decide whether a removed show goes straight to `CANCELLED` or to `CANCELLED_PENDING_RESOLUTION`) is an inline query:

```ts
const hasActiveTaskTarget = await tx.taskTarget.findFirst({
  where: { showId: removed.id, deletedAt: null, task: { deletedAt: null } },
  select: { id: true },
});
```

`ShowCancellationGateService`'s active-task guard (used when resolving a pending cancellation to `CANCELLED`) instead excludes terminal task statuses too — it treats a task as "active" only if it is non-deleted **and** not `COMPLETED`/`CLOSED`.

These are two different definitions of "active task" answering the same underlying question (does this show still have real production work attached?) in two different code paths.

## Why It Matters

A show with only `COMPLETED`/`CLOSED` tasks attached is, by the gate's definition, eligible for `CANCELLED` (no active work remains). By publish's definition, the same show is treated as having active work and gets parked `CANCELLED_PENDING_RESOLUTION` instead of cancelled directly. The two paths can disagree about whether the same show needs human sign-off, which is confusing for whoever is reading the resulting status and not obviously documented anywhere.

## Desired Direction

`TaskTargetRepository.countActiveByShowId` / `TaskTargetService.countActiveByShowId` already exist and already implement the correct definition (excludes `COMPLETED`/`CLOSED`) for `ShowCancellationGateService`. `PublishingService` should call this same helper instead of its own inline `tx.taskTarget.findFirst` query, so the two paths cannot drift.

## Trigger To Fix

- `publishing.service.ts`'s remove-path logic changes again.
- A studio reports a show parked pending-resolution by publish that the gate would have let resolve straight to `CANCELLED`.
- The schedule-publish-to-gate unification (see [`docs/ideation/schedule-publish-gate-unification.md`](../ideation/schedule-publish-gate-unification.md)) is picked up — fixing this becomes nearly free at that point, since both paths end up calling the same gate primitive.

## Acceptance Criteria

- `PublishingService` and `ShowCancellationGateService` use the same active-task definition (same exclusion list, same soft-delete handling) via one shared helper.

## Related Context

[`docs/ideation/schedule-publish-gate-unification.md`](../ideation/schedule-publish-gate-unification.md), [`schedule-publish-removal-no-audit.md`](./schedule-publish-removal-no-audit.md).
