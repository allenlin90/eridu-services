# PRD: Operational Notifications and PWA Push

> **Status**: Active requirements — implementation not started
> **Workstream**: Notification center foundation; Phase 5 items 15 and 21; PWA delivery channel
> **Related**: [Frontend PWA App Shell](../features/frontend-pwa-app-shell.md), [Phase 5](../roadmap/PHASE_5.md), [Collaboration and Communication](../ideation/collaboration-communication.md)

## Summary

Build two related but distinct product capabilities:

1. **Notification center** — a persistent, user-specific inbox where people can review operational notifications, see unread status, mark items read or unread, and open the relevant work.
2. **PWA push delivery** — an optional browser and operating-system channel that alerts a user about an existing notification and brings them back to the app.

The notification center is the product source of truth. Push availability, permission, or delivery success never determines whether a notification exists or whether it remains unread.

## Terminology and Layer Boundaries

| Layer | Meaning |
| --- | --- |
| Notification | A user-visible operational record in the Erify notification center |
| Push notification | An optional device alert that points to an existing notification |
| Worker | A runtime that performs background delivery work |
| Queue | A transport and coordination mechanism, such as BullMQ, that a worker may consume |

This PRD defines the first two product layers. Worker deployment and queue selection are separate engineering decisions that must preserve the product behavior below.

## Problem

Operational changes are silent unless a user revisits the affected screen or receives an external message. This creates avoidable misses around assignments, cancellations, issues, schedule changes, and show lifecycle transitions.

Both frontend apps already have installable PWA shells, but neither app has a conventional notification center or push delivery. Notification requirements are needed before selecting detailed delivery infrastructure.

## Goals

- Give each eligible user a persistent notification history independent of push.
- Make new and unread work visible through a familiar notification-center experience.
- Let users review, mark, and revisit notifications across sessions and devices.
- Bring users back to action-required work through safe, contextual deep links.
- Allow users to opt into push separately from their in-app notification history.
- Define reusable business rules for assignments, cancellations, issues, schedule impacts, shifts, lifecycle transitions, and future mentions.
- Keep notification visibility aligned with current permissions and studio membership.

## Non-Goals

- Replacing `Audit` / `AuditTarget` as the record of what business data changed and why.
- Defining database tables, API route shapes, queue topology, worker deployment, or provider-specific integration.
- Building comments, threaded discussion, watchers, or @mentions in this workstream.
- Sending verification, password-reset, magic-link, or invitation secrets from `eridu_auth`.
- Adding marketing campaigns, SMS, or offline mutation replay.
- Notifying users about every audit entry, draft edit, or automated bookkeeping change.

## Users

| User | Need |
| --- | --- |
| Assigned operator | Know when work is assigned, reassigned, blocked, returned, or ready for review |
| Studio admin or manager | See operational exceptions, cancellations, escalations, and important lifecycle changes |
| Creator | Receive relevant assignment, schedule, or show updates without seeing studio-only details |
| Multi-device user | Keep one consistent read state while using Erify on more than one browser or device |

## User Stories

- As a user, I can open a notification center and see my newest notifications first.
- As a user, I can see an accurate unread badge without opening the notification center.
- As a user, I can distinguish unread and read notifications and filter to unread items.
- As a user, I can mark one notification read or unread and mark all notifications read.
- As a user, I can select a notification and open the relevant task, show, issue, shift, or review surface.
- As a user, my read state stays consistent across sessions and devices.
- As a user, I can use the notification center even when push is unsupported, denied, disabled, or temporarily failing.
- As a user, I can enable or disable push without deleting or changing my in-app notification history.

## Notification Center Requirements

### Entry Point and List

- `erify_studios` and `erify_creators` expose a consistent notification entry point with an unread badge.
- The notification center shows notifications newest first with server-backed pagination.
- Users can switch between **All** and **Unread** views.
- New notifications update the unread badge during normal app use without requiring the user to find and reload the affected feature page.
- Notification history remains available after an item is read. Delete and archive actions are outside the first release.

### Notification Content

Each notification shows:

- a clear title and short summary;
- its category and urgency when relevant;
- when the event occurred;
- the actor or system source when that information is useful and safe;
- its read or unread state;
- the work item or destination it opens.

Content is written for the recipient. It does not expose raw audit metadata, private evidence, secret links, compensation values, or details the recipient could not see on the destination screen.

### Read Status

- A new notification starts as unread for each recipient.
- Selecting a notification marks it read and attempts to open its destination.
- Users can explicitly mark an item read or unread without opening it.
- **Mark all as read** clears the user's current unread count.
- Read state belongs to the user, not one browser installation, and remains consistent across supported apps and devices.
- Showing, delivering, or dismissing a push alert does not mark its notification read. Explicitly opening it from the notification center or through an authenticated push selection marks it read.

### Navigation and Access

- Selecting a notification opens the most specific relevant destination available to that user.
- The destination rechecks current authorization; a notification never grants access.
- If the record was deleted, the user's access changed, or the destination is unavailable, the app opens a safe fallback and explains that the item is no longer available.
- A user can read only their own notifications. Studio roles do not grant access to another user's inbox.

### Grouping and Duplication

- One business event produces at most one notification for the same recipient unless product policy explicitly defines a follow-up reminder.
- Retries or repeated processing never create duplicate user-visible items.
- Batch workflows create a useful summary instead of flooding recipients. Schedule publishing, for example, groups related changes by publish run and recipient.
- Draft edits, cosmetic changes, automated bookkeeping, and high-volume fact writes remain quiet unless a product rule explicitly promotes them.

## Notification Preferences

- The notification center records every notification for which the user is an eligible recipient in the first release.
- Push preferences are separate from notification-center eligibility.
- Users can disable push globally or by event family without deleting notification history.
- Push preference, browser permission, and device availability are presented as distinct states.
- No notification can bypass an operating-system denial or the user's disabled push preference.

## PWA Push Requirements

- A push alert is created only for an existing notification that is eligible for push.
- Push is off until the user takes an explicit action to enable it for the current app and browser installation.
- Permission requests explain the benefit and current notification scope before opening the browser prompt.
- Unsupported, denied, dismissed, enabled, expired, and revoked states have clear, non-blocking UX. The app does not repeatedly prompt after denial or dismissal.
- Users can enable push on multiple devices. Each app and browser installation can be managed independently.
- Push content is brief and privacy-safe. Sensitive detail is available only after the authenticated app opens.
- Selecting a push opens or focuses the correct app, marks the associated notification read after authentication, and routes to its destination.
- Dismissing a push has no effect on the notification or its unread state.
- Disabled or failed push delivery has no effect on notification-center availability.
- Signing out prevents that browser installation from showing future push intended for the previous user.

## Business Rules

- Recipient rules are defined per event family and use current roles, assignments, ownership, and studio context.
- The actor is excluded by default unless a self-notification has a clear user benefit.
- The notification center records who should know; audit history records what changed and why. A business action may produce both records, but they remain separate.
- A failed push attempt never reverses a completed business action or removes its in-app notification.
- Erify owns notification identity, recipient visibility, read status, and preferences. An external provider may deliver a channel but does not become the source of truth for the user's notification center.
- `eridu_auth` continues to own credential and account-lifecycle messages. Authentication secrets never appear in operational notifications or push payloads.
- Future comments and mentions publish through this notification capability rather than creating another inbox or delivery system.

## Event Catalog

The catalog defines the initial reusable business policies. Activation remains phased with the owning workflow.

| Event family | Trigger | Default recipients | Push eligibility |
| --- | --- | --- | --- |
| Task assignment | Assign, reassign, or remove an assignee | New assignee; previous assignee on removal | Eligible; first-release pilot |
| Task workflow | Submission required, blocked, returned, or review completed | Assignee and relevant reviewer | Action-required states |
| Cancellation | Pending cancellation opened or resolved | Managers and directly affected assignees | Pending cancellation and urgent outcomes |
| Show issue | Issue opened, assigned, escalated, or materially raised in severity | Owner and relevant managers | Action-required or high-severity events |
| Schedule publish impact | One publish run changes shows or assignments | Affected users and managers | Grouped summary only |
| Shift assignment | Shift assigned, materially changed, or cancelled | Assigned member | Eligible |
| Show lifecycle | Confirmed or later transition, cancellation, or urgent near/on-air change | Stakeholders selected by lifecycle role | Important and urgent transitions |
| Audited operational override | A manager changes a recipient-visible protected value | Directly affected user when product policy marks it visible | Action-required changes only |
| Mention | A future comment mentions a user | Mentioned user | Eligible when collaboration ships |

## Delivery Phases

### 1. Notification Center Foundation

- Ship the notification entry point, unread badge, All/Unread views, read actions, history, and authorized deep links in both apps.
- Use task assignment and reassignment as the first direct-recipient event family.
- Verify consistent read state across sessions and devices before adding push.

### 2. PWA Push Delivery

- Add push opt-in, permission status, device management, and event-family preferences.
- Deliver task-assignment notifications through push without changing their notification-center behavior.
- Verify click-through, dismissal, logout, expiry, multiple-device, and disabled-delivery behavior.

### 3. Operational Event Families

- Add cancellation and grouped schedule-publish notifications from existing workflows.
- Activate issue notifications with Phase 5 item 15 after issue ownership lands.
- Add shift and audited-override policies when their recipient rules are approved.
- Activate lifecycle notifications with Phase 5 item 21 after the state machine owns status transitions.

### 4. Collaboration

- Let comments and @mentions publish through the same notification center when collaboration is promoted.
- Add other delivery channels only when product demand justifies them.

## Acceptance Criteria

### Notification Center

- [ ] Both apps expose a notification entry point with an accurate unread badge.
- [ ] Users can view newest-first All and Unread lists with persistent history.
- [ ] Users can mark one item read or unread and mark all items read.
- [ ] Read state remains consistent across sessions, apps, and devices.
- [ ] Selecting a notification marks it read and opens an authorized destination or safe fallback.
- [ ] One event creates no more than one user-visible notification per recipient.
- [ ] Batch events are grouped according to their business policy.
- [ ] Notification content never exposes data unavailable on the authorized destination.

### PWA Push

- [ ] Push is optional, explicitly enabled, and configurable independently from notification history.
- [ ] Both apps can deliver and open an eligible task-assignment push.
- [ ] A push click marks the associated notification read and opens its destination; delivery or dismissal alone does not change read state.
- [ ] Unsupported, denied, disabled, expired, and failed push states do not affect the notification center.
- [ ] Users can manage multiple device subscriptions without duplicate inbox items.
- [ ] Signing out prevents future push intended for the previous user on that browser installation.
- [ ] Push content contains no credential secret or recipient-inaccessible operational detail.

### Business Boundaries

- [ ] Audit history and notification read state remain separate concepts.
- [ ] `eridu_auth` credential messages operate independently and never enter the operational notification center.
- [ ] New event families can reuse the same notification-center and optional push behaviors.
- [ ] External delivery providers cannot become authoritative for notification identity, recipient access, read state, or preferences.

## Engineering Handoff Boundary

Implementation planning may choose service placement, persistence, API contracts, worker deployment, queue transport, and provider adapters after these business requirements are accepted.

Worker runtime and queue transport must remain separate layers. If BullMQ is selected, BullMQ jobs are consumed by workers; there is no product-level “worker first, BullMQ later” migration. Those details belong in implementation design, not this PRD.
