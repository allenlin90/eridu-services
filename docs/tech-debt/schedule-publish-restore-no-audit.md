# Tech Debt: Schedule Publish Restore Writes Show Status Without an Audit Row

## Current Issue

`PublishingService.publishDiffUpsert`'s `toUpdate` loop (`apps/erify_api/src/schedule-planning/publishing.service.ts`) restores a previously `CANCELLED`/`CANCELLED_PENDING_RESOLUTION` show whenever a republish's incoming payload matches it by `(client_id, external_id)` again. It sets `show_status_id` directly via a plain `tx.show.update` and increments `publishSummary.shows_restored` — no `Audit` row is written for the status change itself.

This is the mirror-image gap of the bug fixed in PR #233 for the removal direction (`toRemove` loop, finalizing an already-pending gate to `CANCELLED` once active tasks cleared — see `apps/erify_api/docs/SHOW_CANCELLATION_GATE.md`). That fix routed the removal-finalize case through `ShowCancellationGateService.resolvePending` so a system-actor `Audit` row is always written. This `toUpdate` restore case still bypasses the gate entirely, regardless of *why* the show was cancelled — a Manager's deliberate `cancel_with_resolution` (a real business reason, e.g. client cancellation) is silently reverted with the same lack of audit trail as a system-driven `schedule_publish_removal` gate.

## Confirmed Product Decision (2026-06-27)

Restoring **any** cancelled show that reappears in a republish is correct, deliberate behavior — do not gate it on *why* the show was cancelled, and do not require a human to re-resolve it. Rationale (from the product owner):

- Google Sheet/API publish is a **bulk** process. The Sheet is the input signal; this system's own status + audit trail is the source of truth.
- There is no notification system, so requiring a human to notice and re-act on every reappearing show is impractical and easily missed at bulk-upload scale.
- The expected operational discipline is: confirm and clear the Sheet content *before* triggering the publish/Google API call — the system should not need to defensively second-guess a confirmed bulk upload.

So the fix here is **not** "stop auto-restoring" — it's "write an audit row when auto-restoring," matching the rest of this PR's principle that every status-changing transition in/out of cancellation states leaves an `Audit` entry, never a silent write.

## Desired Direction

- When `toUpdate` flips a show's status away from `CANCELLED`/`CANCELLED_PENDING_RESOLUTION` back into the plan, write an `Audit` row recording the restoration (old status, new status, system actor `null`, a note identifying the schedule republish as the trigger) — independent of whether the show is currently fully `CANCELLED` (terminal, no pending gate to resolve) or still `CANCELLED_PENDING_RESOLUTION`.
- `ShowCancellationGateService.resolvePending` doesn't fit a fully `CANCELLED` (non-pending) show — its guarded `updateStatusIfPending` precondition requires the current status to already be `CANCELLED_PENDING_RESOLUTION`. This needs either a new lightweight audit-write method on the gate service (parallel to `writeGateAudit` but not gated on a pending precondition), or a direct `AuditService.create()` call from `publishing.service.ts` using the same `GateAuditMetadata`-shaped payload for consistency with the gate's other entries.
- Keep this scoped to the status-change audit only — do not add new criteria/blockers to the restore itself (no active-task check, no role check); the confirmed decision is to restore unconditionally and just stop doing it silently.

## Trigger To Fix

Fix this before or during any PR that:

- Changes `publishing.service.ts`'s diff/restore logic again;
- Adds reporting or analytics over cancellation/restoration rates (the missing audit row is the first thing that breaks such a report);
- Extends `ShowCancellationGateService` with another system-actor write path (natural place to add this alongside it).

## Acceptance Criteria

- Every status-changing write in the `toUpdate` restore path produces an `Audit` row, regardless of the show's prior cancellation reason (Manager-driven `show_cancellation` or system-driven `schedule_publish_removal`).
- The audit entry is queryable through the same `AuditService.findForTargets` path the cancellation gate already uses, so a future "restoration history" view doesn't need a second data source.
- Regression test confirms a Manager-cancelled show (gate kind `show_cancellation`) that reappears in a republish is restored *and* audited the same way a system-cancelled (`schedule_publish_removal`) show is.
