# Tech Debt: Schedule Publish Removal Has No Audit Trail

## Current Issue

When a schedule republish removes a show (it's missing from the incoming payload), `PublishingService` writes `show_status_id` directly to `CANCELLED` or `CANCELLED_PENDING_RESOLUTION` depending on whether active tasks remain. Neither transition goes through `ShowCancellationGateService`, so neither writes an `Audit` row.

This is the one cancellation/pending-resolution transition in the system that does not produce an audit record — every manual path (`cancel-with-resolution`, `resolve-cancellation`, via the gate shipped in #233) does.

`ShowCancellationGateService.getCancellationStatus` already has to defensively handle this: a show parked `CANCELLED_PENDING_RESOLUTION` by publish has no opening `Audit` row, so `gateKind` comes back `null` and the service falls back to assuming `'show_cancellation'` (the only `GateKind` that exists today) rather than reporting an empty, unresolvable gate.

## Why It Matters

- A show auto-cancelled or auto-parked by schedule publish has no recorded reason, actor (there is none — it's system-triggered), or timestamp beyond the row's own `updated_at`. Studio staff investigating "why is this show cancelled" have no audit history to read for these.
- The `gateKind ?? 'show_cancellation'` fallback in `getCancellationStatus` is a workaround for this gap, not a real fix — it only works because there's currently exactly one `GateKind`. It would silently mis-attribute the gate kind if a second kind is ever introduced without also fixing this gap.
- `StudioShowManagementService.resolveShowCancellation` carries the equivalent fallback for the same reason.

## Desired Direction

Route schedule publish's remove-path status transitions through `ShowCancellationGateService.openPending` / a system-actor-aware resolve path instead of writing `show_status_id` directly, so the transition gets a real `Audit` row and the `gateKind` fallback can be removed.

This needs a `GateKind` that represents a system/schedule-publish-triggered gate (distinct from the manual `show_cancellation` kind) and a way for the gate service to accept a `null` actor for system-generated transitions.

## Trigger To Fix

- `publishing.service.ts`'s diff/remove logic changes again.
- A second `GateKind` is introduced for any other reason (removing this gap becomes nearly free at that point).
- Cancellation/restoration reporting or auditing work needs reliable history for every pending-resolution show, not just manually-opened ones.

## Acceptance Criteria

- Every transition into or out of `CANCELLED` / `CANCELLED_PENDING_RESOLUTION` — manual or schedule-publish-triggered — writes an `Audit` row.
- `ShowCancellationGateService.getCancellationStatus` and `StudioShowManagementService.resolveShowCancellation` no longer need the `gateKind ?? 'show_cancellation'` fallback.

## Related Context

A first implementation of this fix (unifying schedule-publish onto the gate primitive, plus a `RESTORE_PREVIOUS` outcome for the reappearance direction) was built and reviewed in PR #238, then deferred — see [`docs/ideation/schedule-publish-gate-unification.md`](../ideation/schedule-publish-gate-unification.md) for the preserved design reasoning. Revisit together with the state-machine/mechanism design rather than landing in isolation, since the fix reaches into `publishing.service.ts`'s transactional remove/restore loop.
