# Ideation: Cancellation Gate Notification Seam

> **Status**: Deferred from #239 (built and reviewed, then closed without merging), June 2026
> **Origin**: Follow-up split off PR #236, after #233 shipped the manual cancellation gate
> **Related**: [Show Cancellation Gate](../../apps/erify_api/docs/SHOW_CANCELLATION_GATE.md), [`show-change-notification-audit-ledger.md`](./show-change-notification-audit-ledger.md), `docs/roadmap/PHASE_5.md` items 13 and 17

## What

A narrow seam — e.g. `GateNotificationService.notifyGateOpened` / `notifyGateResolved` — that `ShowCancellationGateService` calls on every open/resolve, so that when a real notification mechanism exists, it has exactly one place to plug into instead of new logic getting threaded through the gate service itself.

## Why It Was Considered

No notification system exists anywhere in `erify_api` today (no `EventEmitter2`/domain-event pattern). When a Duty Manager opens a pending cancellation, or schedule publish auto-cancels a show, nobody is told — a Manager only finds out by actively checking the Shows list. A notification seam was proposed as a low-risk way to "future-proof" the gate service against an eventual notification system, without committing to what that system looks like yet.

## Why It Was Deferred

1. With no real notification channel to call, the seam is a no-op (structured-log-only) — it ships zero functional value today.
2. PHASE_5.md already reserves this exact scope: item 13 (issue-event notifications) and item 17 (state-transition notifications) are explicitly blocked/candidate until the issue model and state machine exist. Building a parallel, narrower seam for just the cancellation gate ahead of that risks two notification entry points that need to be reconciled later instead of one.
3. Speculative seams designed before the consuming system exists tend to guess wrong about the shape future code actually needs (sync vs. async, what context to pass, batching). Better to design the seam when the first real consumer (item 13 or 17) is being built.

## Decision Gates for Promotion

Promote when:

1. PHASE_5.md item 8 (show-level issue ownership) lands and item 13 (issue-event notifications) is picked up — at that point, decide whether the cancellation gate's open/resolve events should feed the same notification mechanism as issue events, rather than building a second one.
2. Or, independently, a studio reports that not being notified when a show is auto-cancelled/parked-pending is causing missed cancellations or delayed sign-off.

## Implementation Notes (Preserved Context)

A working no-op implementation existed in PR #239 (closed without merging): `GateNotificationService` with `notifyGateOpened(show, gateKind, reason, actor)` / `notifyGateResolved(show, gateKind, outcome, actor)`, both `Logger.debug`-only, both accepting a nullable actor (system-generated gates have none). Wired into `ShowCancellationGateService.openPending` / `resolveAtomic` / `resolvePending`. Useful as a starting shape if/when item 13 or 17 needs a similar interface, but should be designed against the real notification mechanism rather than copied verbatim.
