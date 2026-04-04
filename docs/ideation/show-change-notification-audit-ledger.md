# Ideation: Show Change Notification and Audit Ledger

> **Status**: Deferred from studio show management follow-up, April 2026
> **Origin**: Studio show CRUD direction update, April 2026
> **Related**: [collaboration-communication.md](./collaboration-communication.md), [pwa-push-notifications.md](./pwa-push-notifications.md), [studio-show-management.md](../prd/studio-show-management.md)

## What

Add a dedicated module that records show mutations as immutable domain events and fans those events out to stakeholder-facing notification channels.

Primary scope:

- show `create`
- show `update`
- show `delete` / cancellation-style removal
- later: show-to-schedule reassignment and possibly publish-time schedule-driven show changes

The module should behave more like a statement/audit ledger than a best-effort toast system:

- every material show mutation produces a durable audit event
- stakeholders can be notified from that event stream
- delivery status is tracked separately from the business mutation itself
- notification delivery can later integrate with in-app inbox and PWA push without coupling those concerns into show CRUD services

## Why It Was Considered

- Show CRUD is becoming a true studio-owned write surface, so silent mutations create coordination risk.
- Show changes often affect multiple stakeholders: studio admins/managers, assigned operators, creators, and eventually client-facing users.
- The operational expectation is closer to bank-ledger semantics than casual UI notifications: once a statement-changing action happens, there should be a durable record and traceable downstream notifications.
- PWA push notifications need a concrete domain-notification model; show mutation events are one of the clearest early use cases.

## Why It Was Deferred

1. The current show CRUD slice needed to ship flexible schedule linkage first without pulling in a full notification/eventing architecture.
2. Notification delivery channels are not ready yet: no in-app notification center, no PWA push subscription pipeline, no delivery-preference model.
3. Audit/event modeling needs explicit product policy before implementation:
   - which fields count as material changes,
   - which stakeholders should be notified for each change type,
   - which events are user-visible versus audit-only.
4. The module should be designed once for reuse across other auditable domains (tasks, schedules, comments, approvals), not hard-coded only for show CRUD.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Stakeholders report misses or confusion because show changes are happening silently.
2. PWA push/in-app notification infrastructure is selected for active implementation.
3. Product requires immutable mutation history and stakeholder notification for studio-operated show changes.
4. Client-facing or creator-facing surfaces begin consuming show mutation alerts.

## Implementation Notes (Preserved Context)

### Recommended module boundary

Do **not** put notification side effects directly inside `StudioShowManagementService`.

Preferred split:

1. `show` domain performs the mutation
2. domain emits a `ShowChanged` event (or writes a journal row inside the same transaction)
3. a separate notification/audit module consumes that event
4. delivery adapters fan out to:
   - audit log / mutation journal
   - in-app notification center
   - PWA push notifications
   - optional email / external webhook later

### Safe-first data model direction

Treat this as two layers, not one table:

1. **Mutation journal / audit event**
   - immutable event row
   - actor, studio, show, change type, timestamp
   - normalized diff summary or metadata payload
   - source (`studio_crud`, `schedule_publish`, `admin`, etc.)
2. **Notification delivery**
   - recipient(s)
   - channel (`in_app`, `push`, later `email`)
   - delivery status / attempts
   - deep-link target

This keeps audit truth separate from delivery concerns.

### Product-policy questions to resolve later

- Which show updates are material enough to notify?
  - all field changes,
  - schedule/time/status changes only,
  - delete always,
  - platform/metadata changes maybe audit-only
- Who are the default stakeholders?
  - studio admins/managers,
  - assigned members,
  - assigned creators,
  - client contacts,
  - watchers/subscribers
- Should create/update/delete generate one canonical event schema, or separate event types?
- Should schedule publish emit the same show-change events when it mutates shows, or a different planning event family?
- Should unread notifications be per-user only, while audit events remain organization-scoped?

### Likely safe-first implementation shape

If promoted, the safest first version is likely:

1. durable mutation journal first
2. in-app notification inbox second
3. PWA push third

That sequence prevents push delivery from becoming the source of truth for auditability.
