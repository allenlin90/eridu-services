# PRD: Operational Notifications and PWA Push

> **Status**: Active requirements — implementation not started
> **Workstream**: Phase 5 items 15 and 21; reusable frontend platform capability
> **Related**: [Frontend PWA App Shell](../features/frontend-pwa-app-shell.md), [Phase 5](../roadmap/PHASE_5.md), [System Architecture Overview](../engineering/ARCHITECTURE_OVERVIEW.md), [Collaboration and Communication](../ideation/collaboration-communication.md)

## Summary

Build one operational notification capability for `erify_api`, `erify_studios`, and `erify_creators`. The in-app inbox is the durable user experience; PWA push is an optional delivery channel that brings a user back to the relevant record.

The product model, recipient policy, preferences, and delivery history remain internal. Delivery runs asynchronously in a separate worker runtime that shares the `erify_api` modules and PostgreSQL database. A managed notification platform is not required for the first implementation, but channel adapters may use an external provider later without moving domain policy or inbox ownership out of Erify.

## Problem

Operational changes are currently silent unless a user revisits the affected screen or receives an external message. This creates avoidable misses around assignments, cancellations, issues, schedule changes, and show lifecycle transitions.

The repository already has:

- installable PWA shells in `erify_studios` and `erify_creators`;
- authenticated users, studio membership, assignments, and role policies in `erify_api`;
- standard `Audit` / `AuditTarget` history for selected semantic changes;
- a planned private worker runtime for asynchronous jobs.

It does not yet have a notification event model, inbox, preferences, push subscriptions, or delivery worker. Auth credential email callbacks in `eridu_auth` are also placeholders, but they are a separate security-message concern.

## Goals

- Give every eligible recipient a reliable in-app record independent of push permission or delivery success.
- Notify the correct stakeholders from domain state changes without coupling push calls into model services.
- Support both frontend PWAs with one event taxonomy and API contract.
- Keep audit history, user inbox state, and channel delivery attempts separate and queryable.
- Make delivery retryable and idempotent without rolling back a successful business mutation.
- Allow new domain event families to register recipient and channel policies without creating another notification subsystem.
- Preserve a path to managed delivery adapters or a separate service if scale and ownership later justify them.

## Non-Goals

- Replacing `Audit` / `AuditTarget` as the record of who changed business data.
- Building a global CQRS or application-wide event bus.
- Shipping comments, threads, watchers, or @mentions in this workstream.
- Sending verification, reset-password, magic-link, or invitation secrets from `eridu_auth`.
- Adding marketing campaigns, SMS, or offline mutation replay.
- Guaranteeing that every audit entry produces a user notification.

## Users

| User | Need |
| --- | --- |
| Assigned operator | Know when work is assigned, reassigned, blocked, or ready for review |
| Studio admin or manager | See operational exceptions, cancellations, escalations, and important lifecycle changes |
| Creator | Receive relevant assignment, schedule, or show updates without access to studio-only details |
| System operator | Diagnose delivery failures without reading private notification content from logs |

## Decisions of Record

| Decision | Requirement |
| --- | --- |
| Product ownership | `erify_api` owns operational notification events, recipients, inbox state, preferences, and delivery records because it already owns the domain data and authorization needed to calculate them. |
| Deployment | Start as an internal capability in the `erify_api` codebase. Run HTTP APIs in the REST runtime and asynchronous delivery in a private worker runtime sharing the same services, repositories, and database. |
| Source of truth | PostgreSQL is authoritative for events and per-user inbox state. Push is a best-effort delivery channel, never the only record. |
| Event boundary | Domain orchestration explicitly records a typed notification event in the same transaction as the business mutation. Do not add a speculative global event bus. |
| External systems | Do not adopt a managed notification platform for the first version. Preserve a channel-adapter boundary so a provider can later handle delivery without owning domain policy or inbox truth. |
| Push transport | Start with standards-based Web Push. Push payloads contain minimal display data and an allow-listed, same-origin deep link. |
| Audit | Audit answers what changed and why. Notifications answer who should know and whether delivery was attempted. A mutation may write both, but neither record substitutes for the other. |
| Authentication | `eridu_auth` continues to own credential and account-lifecycle messages. Operational recipients are `erify_api` users mapped from the Better Auth JWT subject through `User.extId`. |

## Why Not a Microservice Yet

Recipient calculation depends directly on studio membership, roles, assignments, issue ownership, and show state. Moving the first version outside `erify_api` would introduce duplicated authorization data, a cross-service identity contract, and distributed consistency before there is an independent scaling or ownership need.

Extract a notification service only when at least one of these conditions is real:

- several backend services outside `erify_api` must publish operational events;
- delivery needs independent availability, scaling, deployment, or data-retention ownership;
- the event and recipient contracts are stable enough to version across services;
- notification operations need a dedicated team or service-level objective.

An extraction must preserve the internal event contract and user identity mapping. It must not turn an external provider's identifier into the product's canonical user or notification ID.

## Internal Versus Managed Platform

| Option | Fit | Decision |
| --- | --- | --- |
| Internal capability plus worker | Keeps transactions, authorization, inbox, and stakeholder policy close to the owning domains; requires operating retries and push credentials | **Selected** |
| Managed orchestration platform | Can reduce multi-channel delivery work, but introduces a second user/event model and vendor dependency before channel volume warrants it | Defer; evaluate as a delivery adapter if operational burden grows |
| Dedicated notification microservice | Provides isolation, but requires versioned cross-service events and distributed identity/authorization immediately | Defer until extraction triggers are met |
| Direct push calls from domain services | Smallest initial code path, but loses transactional durability, retry isolation, and a channel-independent inbox | Rejected |

## Product Model

The implementation must provide these concepts without exposing database IDs:

| Concept | Responsibility |
| --- | --- |
| Notification event | Immutable typed fact accepted with a domain mutation; includes actor, studio, subject, template data, deep-link target, idempotency key, and occurrence time |
| Recipient | One stable per-user inbox record for an event, including read state and recipient-specific visibility-safe content |
| Preference | User choice per event family and channel; in-app eligibility remains available even when push is disabled |
| Push subscription | One browser/app installation endpoint associated with one authenticated user, app, locale, and lifecycle status |
| Delivery attempt | Channel-specific status, retry count, timestamps, and provider-safe error classification |

Recipient identities are resolved and persisted when the event is accepted so later membership changes do not rewrite notification history. The actor is excluded by default unless the event policy explicitly requires a self-notification.

## Audit and State-Change Contract

Notification policy is registered per typed event family. Each policy defines:

1. which semantic state change is eligible;
2. which recipients can see the subject;
3. whether events are grouped or deduplicated;
4. the default channels and urgency;
5. the safe deep-link target and fallback route.

Do not generate notifications by polling or blindly replaying `Audit` rows. Audit metadata may be too detailed, noisy, or sensitive for recipients. The orchestration path that performs a mutation writes its required audit entry and notification event together, then the worker delivers only after commit.

Delivery failure never reverses the business mutation. Event creation failure inside the domain transaction does roll back a mutation that promises a notification, preventing a silent partial write.

## Event Catalog

The catalog defines reusable policy families. Activation remains phased with the owning domain.

| Event family | Trigger | Default audience | Delivery rule |
| --- | --- | --- | --- |
| Task assignment | Assign, reassign, or remove an assignee | New assignee; previous assignee on removal | In-app; push when enabled; first implementation pilot |
| Task workflow | Submission requested, blocked, returned, or review completed | Assignee and relevant reviewer | In-app; push for action-required states |
| Cancellation gate | Pending cancellation opened or resolved | Managers and directly affected assignees | In-app; push for opened pending cancellation; no speculative no-op seam |
| Show issue | Issue opened, assigned, escalated, or severity materially raised | Owner and managers selected by issue policy | Phase 5 item 15; push for action-required or high-severity events |
| Schedule publish impact | A `PublishRun` changes multiple shows or assignments | Affected users and managers | One grouped event per recipient and publish run, not one push per changed row |
| Shift assignment | Shift assigned, materially changed, or cancelled | Assigned member | In-app; push when enabled |
| Show lifecycle | Confirmed or later transition, cancellation, or urgent near/on-air change | Stakeholders selected by lifecycle state and role | Phase 5 item 21 after the state machine owns transitions |
| Audited operational override | Manager changes an actual, snapshot, or other recipient-visible protected value | Directly affected user when product policy marks it visible | In-app by default; push only for action-required changes |
| Mention | A future comment mentions a user | Mentioned user | Owned by the collaboration workstream; publishes through this capability |

Draft edits, cosmetic changes, automated bookkeeping, and high-volume fact writes remain quiet unless an event policy explicitly promotes them. Batch-producing workflows must aggregate notifications around their existing batch identity where available.

## In-App Experience

- Both apps expose a notification inbox with unread count, newest-first pagination, read/unread state, and mark-all-read.
- Selecting an item opens an authorized deep link to the relevant record. If the record is gone or access changed, the app opens a safe fallback and explains that the item is unavailable.
- The inbox renders from typed event data and recipient-safe template arguments; it does not expose raw audit diffs.
- In-app notifications are available regardless of browser push support.
- Duplicate retries do not create duplicate inbox items.
- A user sees only their own recipient records. Studio roles do not grant access to another user's inbox.

## Preferences

- In-app records are on for every eligible event in the first version.
- Push is off until the user explicitly enables it for the current app/browser installation.
- Users can disable push globally or by event family without deleting inbox history.
- The system distinguishes application preference, browser permission, subscription health, and delivery status.
- No event can bypass an operating-system denial or a user's disabled push preference.

## PWA Push Experience

Both frontend apps already use prompt-based PWA updates and `NetworkOnly` API handling. Push implementation must preserve those invariants.

- Request browser permission only after an explicit user action that explains the benefit and current event scope.
- Handle unsupported, denied, dismissed, subscribed, expired, and revoked states without repeated permission prompts.
- Support multiple active devices per user and keep subscriptions separated by app.
- Move each app to a custom service worker strategy that can handle `push` and `notificationclick` while retaining current Workbox precache, navigation fallback, update, recovery, and API caching behavior.
- Open or focus the correct app window on click and navigate only to validated same-origin routes.
- Deactivate the server association before logout so another user of the same browser cannot receive the previous user's notifications.
- Remove invalid endpoints after permanent Web Push responses and allow clean resubscription.
- Store the app's supported locale with the subscription so server-rendered push text can use the correct notification template language.

Push content is deliberately brief. Sensitive diffs, reasons, compensation values, and private issue evidence are fetched after the user opens the authenticated app.

## API Outcomes

The authenticated `me` surface must support:

- paginated notification list and unread count;
- mark one notification read or unread and mark all read;
- read and update notification preferences;
- register, refresh, list, and revoke the current user's push subscriptions.

Contracts use snake_case Zod schemas from `@eridu/api-types`, UID-based external identifiers, and idempotent subscription registration. Studio-scoped deep links do not weaken the destination route's existing membership and role guards.

## Delivery and Operations

1. A domain orchestration service writes the business mutation, required audit, notification event, and recipients in one transaction.
2. The worker claims committed, available deliveries and calls the selected channel adapter.
3. Attempts use at-least-once processing with an idempotency key so retries do not duplicate user-visible notifications.
4. Transient failures retry with bounded backoff; permanent subscription failures deactivate the endpoint.
5. Structured logs and metrics include event type, channel, status, attempt count, and correlation IDs, but exclude message bodies, endpoint tokens, audit diffs, and credential links.
6. Operators can inspect aggregate queued, delivered, failed, and permanently invalid counts without impersonating a user's inbox.

The first implementation may introduce BullMQ with the private `erify_api` worker entrypoint described in the architecture overview. Queue transport remains an adapter; product rules stay in services and repositories.

## `eridu_auth` Boundary

`eridu_auth` does not use an operational notification system today. Its Better Auth callbacks for verification, password reset, email change, magic link, and organization invitation are placeholders.

Those credential and account-lifecycle messages remain owned by `eridu_auth` and its future email-provider adapter because they may contain secrets, must work independently of operational domain data, and have different security and delivery requirements. They must never be copied into `NotificationEvent` payloads or PWA push.

A later security-alert policy may publish sanitized facts such as “account role changed” or “new organization invitation created” through an explicit service contract. Such events contain no token, reset URL, session ID, or provider payload. Operational recipient mapping uses the Better Auth user ID from the JWT and the existing `erify_api.User.extId` association.

## Delivery Phases

### 1. Foundation and Pilot

- Add the typed event catalog, recipient policy registry, durable event/recipient records, preferences, inbox APIs, and worker boundary.
- Ship task assignment/reassignment as the direct-user pilot.
- Add observability, idempotency, and retry behavior before enabling push.

### 2. PWA Push

- Add subscription and preference UX to both apps.
- Add custom service-worker push/click behavior while preserving existing shell behavior.
- Deliver pilot events through Web Push and verify multiple-device, logout, expiry, and deep-link behavior.

### 3. Operational Policy Packs

- Add cancellation gate and grouped schedule-publish events from existing workflows.
- Activate issue-event notifications with Phase 5 item 15 after issue ownership lands.
- Add shift and audited-override policies when their stakeholder rules are approved.
- Activate lifecycle notifications with Phase 5 item 21 after the state machine owns status transitions.

### 4. Collaboration and Channel Expansion

- Let comments and @mentions publish through the same event contract when collaboration is promoted.
- Evaluate managed delivery, email, or other channels only from measured delivery volume, reliability burden, or product demand.

## Acceptance Criteria

### Foundation

- [ ] A pilot assignment mutation atomically writes one typed event and one recipient record for each eligible user.
- [ ] A retry or repeated idempotency key does not create another inbox item.
- [ ] Users can list only their notifications, see an accurate unread count, and update read state.
- [ ] Audit entries remain separate and notification payloads contain no raw audit metadata.
- [ ] Delivery failure does not reverse the completed domain mutation.
- [ ] Domain tests cover each activated event's trigger, recipient, actor exclusion, deduplication, and rollback behavior.

### Push

- [ ] Push can be enabled only through explicit user action and works independently per app/browser installation.
- [ ] Both apps receive and open a pilot push through a validated same-origin deep link.
- [ ] Existing PWA update/recovery behavior and `NetworkOnly` API handling pass regression checks after the service-worker change.
- [ ] Logout deactivates the current user association before another user can use the browser profile.
- [ ] Invalid subscriptions are deactivated and can be registered again without duplicate active records.
- [ ] Push payloads and logs contain no secret, private audit diff, or credential link.

### Extensibility

- [ ] Cancellation, issue, publish-run, shift, lifecycle, override, and mention policies can reuse the same event/recipient/delivery contracts.
- [ ] A managed provider can be introduced behind a channel adapter without migrating inbox ownership or changing domain publishers.
- [ ] `eridu_auth` credential email can operate without the operational notification worker, and no auth secret enters the event store.
