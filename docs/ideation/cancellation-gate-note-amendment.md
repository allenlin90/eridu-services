# Ideation: Note Amendment for an Open Pending Cancellation

> **Status**: Deferred from #240 (built and reviewed, then closed without merging), June 2026
> **Origin**: Follow-up split off PR #236, after #233 shipped the manual cancellation gate
> **Related**: [Show Cancellation Gate](../../apps/erify_api/docs/SHOW_CANCELLATION_GATE.md)

## What

Let the Duty Manager who opened a pending cancellation amend the reason note while it's still open (before a Manager/Admin signs off), instead of the note being fixed at open time. Proposed as `PATCH /studios/:studioId/shows/:showId/cancellation-note`, restricted to the current active Duty Manager, writing a `note_updated` `Audit` event (no status change).

## Why It Was Considered

#233's cancellation gate captures a reason category + note exactly once, at open time, from whichever Duty Manager is on shift. If that note is incomplete or turns out to be wrong (e.g. "camera failed" written before the actual cause — "two cameras failed" — was confirmed), there's currently no way to correct it; the Manager signing off only ever sees the original note.

## Why It Was Deferred

1. This is new product scope on top of the cancellation-gate baseline ("cancel with audit trail"), not part of it. PR #233's closure notes already explicitly scoped "broader follow-up ownership... remain outside this item."
2. It reworks `ShowCancellationGateService.getCancellationStatus`'s note-resolution logic (introducing a `latestNote` lookup distinct from the `opened` row used for `gateKind`/`fromStatus`/`reasonCategory`/`openedBy`) — a state-reading change worth validating against a more complete picture of how gate history will be consumed once more gate kinds and the broader state machine exist, rather than in isolation.
3. No product signal yet that note accuracy at open time is actually a problem in practice (no reported incident of a Manager signing off on a stale/wrong note).

## Decision Gates for Promotion

Promote when:

1. A studio reports friction from being unable to correct a pending cancellation's note before sign-off.
2. The broader state-machine/gate-kind design work is happening anyway, so the `getCancellationStatus` history-resolution change can be designed alongside it instead of bolted on separately.

## Implementation Notes (Preserved Context)

A working implementation existed in PR #240 (closed without merging):

- `ShowCancellationGateService.amendPendingNote({ showId, gateKind, reasonNote, actor })` — writes a `note_updated` `Audit` row with `old_value`/`new_value: null` (no status transition).
- `GateAuditMetadata.event` / `CancellationHistoryEntryResult.event` widened to `'opened' | 'note_updated' | 'resolved'`.
- `getCancellationStatus` reworked: `reasonNote` now comes from the latest `opened`-or-`note_updated` row (`latestNote`), while `gateKind`/`fromStatus`/`reasonCategory`/`openedBy` still come from the original `opened` row. Also dropped the `gateKind ?? 'show_cancellation'` fallback in favor of returning a non-pending result when no `opened` row exists — revisit this alongside the schedule-publish-gate-unification work (see [`schedule-publish-gate-unification.md`](./schedule-publish-gate-unification.md)), since that fallback removal assumed every pending show has an opening `Audit` row, which is only true once that unification lands.
- `StudioShowManagementService.amendCancellationNote` — 400s if the show isn't pending, 403s (`NOTE_AMEND_REQUIRES_DUTY_MANAGER`) for any tier other than `duty_manager`.
- Frontend: a "Update note" field + button in `ResolveCancellationDialog`, visible only for the Duty Manager tier; `GateHistory` rendered the new `note_updated` event as "Note updated".
