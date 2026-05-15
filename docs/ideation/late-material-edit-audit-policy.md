# Ideation: Late Material Edit Audit Policy

> **Status**: Deferred from compensation line items Phase 2.2 actuals and snapshot readiness, May 2026
> **Origin**: Actuals and snapshot audit policy discussion
> **Related**: [show-change-notification-audit-ledger.md](./show-change-notification-audit-ledger.md), [Phase 4 roadmap (compensation line items PRs)](../roadmap/PHASE_4.md), [Economics cost model](../prd/economics-cost-model.md)

## What

Define a shared audit policy for material operational edits that happen near or after the work they describe. The policy should preserve routine planning flexibility before a show or shift happens, while recording suspicious or compensation-relevant changes once operational facts should be stable.

The first target domain is show and shift editing, with later reuse for schedules, assignments, task timing, and compensation line-item inputs.

## Why It Was Considered

- Pre-event planning needs to stay lightweight; auditing every ordinary schedule adjustment creates noisy metadata and makes meaningful audit history harder to read.
- Post-start or post-actual edits carry higher operational and financial risk because they can rewrite the record after the work has begun.
- A naive "audit only when the new start time is in the past" rule allows a postponement loophole: a show can be repeatedly pushed forward before each scheduled start and never produce an audit record.
- Compensation readiness already records snapshot overrides; broader late-edit audit policy would cover non-snapshot changes such as schedule, status, assignment, cancellation, and actual timestamp edits.
- The same actor identity convention should apply across audit families: `currentUser.ext_id` is recorded as the external actor identifier, while internal database IDs remain private implementation details.

## Why It Was Deferred

1. The current Phase 2.2 slice is scoped to actual timestamp fields and compensation snapshot readiness, not a full operational audit ledger.
2. Late-edit policy needs product agreement on which changes are material enough to audit, which require a reason, and which should notify stakeholders.
3. A general policy should be implemented once through shared helper/service boundaries instead of adding one-off checks to each controller.
4. The notification/audit ledger topic is still deferred; late-edit auditing can ship independently, but it should not conflict with the future ledger model.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Operators need to explain or reconcile changes made after a show, shift, assignment, or task has started.
2. Product requires reason capture for schedule, status, assignment, compensation, or actual-time edits near execution time.
3. Repeated postponements or late rescheduling create trust, payout, or reporting concerns.
4. The show change notification/audit ledger is promoted and needs a concrete policy for material-change thresholds.
5. Finance or operations needs a user-visible change history for late edits before payout review.

## Implementation Notes (Preserved Context)

### Recommended Policy

Do not audit every edit. Audit when the previous persisted state indicates the record is operationally sensitive.

Audit a material edit when any of these conditions are true:

1. `actual_start_time` is already set.
2. The previous scheduled start time is less than or equal to the current time.
3. The previous scheduled start time is inside a configured late-change window and the edit changes schedule, status, assignment, cancellation, compensation-relevant fields, or actual timestamps.
4. A compensation snapshot field is manually overridden.

The key rule is to evaluate timing against the **previous persisted schedule**, not only the incoming replacement schedule. This catches late postponements while still allowing normal planning changes well before execution.

### Suggested Windows

Use a configurable late-change window with a conservative default, for example:

- show schedule/status/assignment: 24 hours before previous scheduled start
- shift block actuals and labor-related edits: shift start or actual start boundary
- compensation snapshot overrides: always audited

The first implementation can store the window as a service-level constant. Promote it to studio-level policy only when studios need different governance.

### Reason Capture

Reason capture should scale with sensitivity:

- before the late-change boundary: no reason required
- inside the late-change window: optional reason, visible in audit if supplied
- after scheduled start or after `actual_start_time`: reason required for material edits
- compensation snapshot overrides: optional reason in the current API, with a future option to require it after operational start

### Event Shape Direction

Use a normalized audit entry that can later feed a general mutation journal:

```json
{
  "entity_type": "Show",
  "entity_id": "show_...",
  "field": "scheduled_start_time",
  "old_value": "2026-05-12T12:00:00.000Z",
  "new_value": "2026-05-13T12:00:00.000Z",
  "actor_ext_id": "user_...",
  "reason": "Client requested postponement",
  "trigger": "late_change_window",
  "recorded_at": "2026-05-12T11:30:00.000Z"
}
```

For JSON metadata audit entries, keep snake_case payload fields to match API metadata conventions.

### Material Field Starting Set

Start with fields that affect operations, payout, or reporting:

- show schedule start/end
- show actual start/end
- show status/cancellation
- creator assignments and compensation snapshots
- studio shift start/end and shift-block actual start/end
- shift hourly rate snapshots

Avoid logging cosmetic metadata, notes, and non-operational display fields in the first version unless product explicitly classifies them as auditable.

### Relationship to Notification Ledger

This policy defines **when** a mutation is auditable. The show change notification/audit ledger defines **where durable events live** and how stakeholder notifications are delivered.

The safe sequence is:

1. add shared late-edit audit decision helper
2. write audit entries into existing metadata or a narrow audit table
3. promote the broader mutation journal only when notification or cross-domain query needs justify it
