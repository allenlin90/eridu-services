# Ideation: Schedule Publish / Cancellation Gate Unification

> **Status**: Deferred from #238 (built and reviewed, then closed without merging), June 2026
> **Origin**: Follow-up split off PR #236, after #233 shipped the manual cancellation gate
> **Related**: [`schedule-publish-removal-no-audit.md`](../tech-debt/schedule-publish-removal-no-audit.md), [`schedule-publish-restore-no-audit.md`](../tech-debt/schedule-publish-restore-no-audit.md), [Show Cancellation Gate](../../apps/erify_api/docs/SHOW_CANCELLATION_GATE.md)

## What

Route schedule publish's auto-cancel/auto-pending/restore status transitions through `ShowCancellationGateService` (the same primitive the manual cancel-with-resolution/resolve-cancellation endpoints use), instead of `PublishingService` writing `Show.status` directly. Add a `schedule_publish_removal` `GateKind` and a `RESTORE_PREVIOUS` outcome so a republish that un-removes a show can revert through the gate to its captured prior status.

## Why It Was Considered

Schedule publish is currently the only place that moves a show into or out of `CANCELLED` / `CANCELLED_PENDING_RESOLUTION` without writing an `Audit` row — every manual path does, since #233. Unifying onto one primitive means:

- Every cancellation-adjacent transition gets the same audit trail, with no special-cased exception.
- The `gateKind ?? 'show_cancellation'` fallback in `getCancellationStatus` (a workaround for publish-opened gates having no opening `Audit` row) becomes unnecessary.
- The shared active-task helper remains the single definition for remove-path disposition and manual `CANCELLED` resolution.
- A show parked pending-resolution by publish, then resolved by publish itself once active tasks clear, can go through `resolvePending` (system actor, `null`) instead of a second special-cased raw status write.

## Why It Was Deferred

1. The fix reaches into `PublishingService`'s transactional remove/restore loop — a high-traffic, correctness-sensitive path that isn't otherwise broken — to route it through a different service's write path. That's real regression surface for a unification, not a bug fix in isolation.
2. `ShowCancellationGateService` was designed for two human-driven authorization tiers (Manager/Admin atomic, Duty Manager flag-and-defer). Bolting a third, system-driven gate kind onto it ad hoc, before the state machine and its mechanism are properly scoped, risks baking in assumptions (nullable actor everywhere, a `RESTORE_PREVIOUS` outcome only one `GateKind` uses) that a deliberate state-machine design might shape differently.
3. The two tech-debt gaps this would close (no audit trail on remove and restore) are real but pre-existing and non-regressing — safe to leave open one more round rather than fix via a larger mechanism change.
4. Better to design schedule publish's relationship to the cancellation gate (and any future broader lifecycle state machine) once, holistically, than to extend the gate twice — once now for schedule-publish, once later for the state machine.

## Decision Gates for Promotion

Promote to a PRD/implementation when:

1. The broader show lifecycle state machine (PHASE_5.md items 14/15) is being designed, and schedule publish's status transitions need to be reconciled with it anyway.
2. A second `GateKind` is needed for an unrelated reason — at that point the `gateKind` fallback removal and the active-task-check unification become low-incremental-cost to include.
3. A studio reports confusion from the audit-trail gap (e.g. "why is this show cancelled and who/what cancelled it" with no recorded answer) often enough to justify fixing it ahead of the full state machine.

## Implementation Notes (Preserved Context)

A working implementation existed in PR #238 (closed without merging). Summary of what it did, for reference when this is picked back up:

- Added `schedule_publish_removal` to `CANCELLATION_GATE_CONFIG` (`@eridu/api-types/shows`): `allowedOutcomes: ['CANCELLED', 'RESTORE_PREVIOUS']`, `outcomesRequiringNoActiveTasks: ['CANCELLED']`, `reasonOptions: ['REMOVED_FROM_REPUBLISHED_SCHEDULE']`.
- Added `RESTORE_PREVIOUS` to `resolveShowCancellationSchema`'s outcome enum.
- Made `ShowCancellationGateService.openPending` / `resolvePending` / `writeGateAudit` accept `actor: null` for system-generated gates.
- `resolvePending` gained a `fromStatusSystemKey` param; when `outcome === 'RESTORE_PREVIOUS'`, the target status becomes `fromStatusSystemKey` instead of treating the outcome name as a status key.
- `PublishingService.publish`'s remove loop: showed with active tasks → `openPending({ gateKind: 'schedule_publish_removal', actor: null, ... })`; show with no active tasks → direct status write (kept, since there's no gate cycle to open); show already pending with tasks now cleared → `resolvePending({ outcome: 'CANCELLED', actor: null, ... })` instead of a raw status write.
- `StudioShowManagementService.resolveShowCancellation` started 404ing (`ShowCancellationGate` not found) instead of falling back to `'show_cancellation'` when `getCancellationStatus` returned no `gateKind`/`fromStatus` — this assumed every pending show now has an opening `Audit` row, which is only true once the remove-path fix above lands everywhere.

Did **not** implement: the restore-direction audit-trail fix (the `toUpdate` reappearance path still wrote status directly) — see the restore tech-debt entry for that half.
