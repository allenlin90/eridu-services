# Tech Debt: Schedule Publish's Active-Task Check Disagrees With the Cancellation Gate's

## Status: Resolved

`PublishingService`'s remove-path active-task check and the apply-time re-evaluation both call `TaskTargetService.countActiveByShowId` — the same helper `ShowCancellationGateService` uses (excludes `COMPLETED`/`CLOSED` tasks, same soft-delete handling). Publish-time and apply-time no longer disagree with each other or with the gate about what counts as an active task.

## Original Issue

`PublishingService`'s remove-path active-task check (used to decide whether a removed show goes straight to `CANCELLED` or to `CANCELLED_PENDING_RESOLUTION`) was an inline query:

```ts
const hasActiveTaskTarget = await tx.taskTarget.findFirst({
  where: { showId: removed.id, deletedAt: null, task: { deletedAt: null } },
  select: { id: true },
});
```

`ShowCancellationGateService`'s active-task guard (used when resolving a pending cancellation to `CANCELLED`) instead excludes terminal task statuses too — it treats a task as "active" only if it is non-deleted **and** not `COMPLETED`/`CLOSED`. A show with only `COMPLETED`/`CLOSED` tasks attached was eligible for `CANCELLED` by the gate's definition but got parked `CANCELLED_PENDING_RESOLUTION` by publish's definition — two different answers to the same question in two different code paths.

## Related Context

[`docs/ideation/schedule-publish-gate-unification.md`](../ideation/schedule-publish-gate-unification.md), [`schedule-publish-removal-no-audit.md`](./schedule-publish-removal-no-audit.md).
