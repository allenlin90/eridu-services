# Tech Debt: Schedule Publish Restore Has No Audit Trail

## Current Issue

When a schedule republish re-includes a show that was previously cancelled or parked pending resolution (it reappears in the incoming payload after being missing from an earlier publish), `PublishingService`'s `toUpdate` path writes `show_status_id` back to an active status directly. This bypasses `ShowCancellationGateService` and writes no `Audit` row, the mirror-image gap of the remove-path issue tracked in [`schedule-publish-removal-no-audit.md`](./schedule-publish-removal-no-audit.md).

## Why It Matters

`STUDIO_SHOW_MANAGEMENT.md`'s confirmed product decision is that schedule/Google Sheet republish is a bulk **input signal**, not the authoritative record — this system's `Show.status` + `Audit` trail is supposed to be authoritative. A show that reappears after being cancelled (whether the cancellation was a Manager's business decision or an earlier system-driven removal) is restored unconditionally, by design — there's no notification system, so requiring a human to notice and re-resolve every reappearance at bulk-publish scale is impractical.

The restore behavior itself (unconditional restore) is correct and intentional. The gap is narrower: the restore writes no audit record, so there's no durable trace of "this show was cancelled, then schedule publish brought it back" — the same blind spot the remove-path gap creates, just in the other direction.

## Desired Direction

Once the remove-path fix lands (see [`schedule-publish-removal-no-audit.md`](./schedule-publish-removal-no-audit.md)), extend the same mechanism to the restore direction so reappearance writes an `Audit` row instead of a raw status update. Do not add any approval/blocking step to the restore itself — the unconditional-restore policy is a confirmed product decision, not part of this gap.

## Trigger To Fix

- `publishing.service.ts`'s diff/restore logic changes again.
- Cancellation/restoration reporting is added and needs reliable history for every status flip, not just manually-driven ones.

## Acceptance Criteria

- A show restored by schedule publish after being cancelled or pending-resolution writes an `Audit` row recording the transition, without changing the unconditional-restore policy.

## Related Context

[`STUDIO_SHOW_MANAGEMENT.md`](../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md) (source-of-truth policy), [`schedule-publish-removal-no-audit.md`](./schedule-publish-removal-no-audit.md), [`docs/ideation/schedule-publish-gate-unification.md`](../ideation/schedule-publish-gate-unification.md).
