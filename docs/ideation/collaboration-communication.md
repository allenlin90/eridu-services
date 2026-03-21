# Ideation: Collaboration and Communication

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [pwa-push-notifications.md](./pwa-push-notifications.md)

## What

Add in-system collaboration tools: threaded comments on tasks/shows, @mentions with notification triggers, and notification persistence and delivery. This reduces reliance on external channels (WhatsApp, Slack, etc.) for operational coordination.

## Why It Was Considered

- Operational coordination currently happens outside the system, making context hard to trace and audit.
- Comments on tasks would provide a persistent coordination record alongside task execution.
- Mentions and notifications would replace ad-hoc pings and reduce context-switching to external tools.

## Why It Was Deferred

1. External channel coordination is sufficient for current team size and workflow volume.
2. In-system notification delivery requires push notification infrastructure (PWA push), which is also deferred.
3. Comment/thread data modeling needs careful design to avoid table bloat for high-frequency operational comments.
4. Mention resolution requires a user/member search API surface not currently present.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Operational coordination failures are attributed to context loss from external channel reliance.
2. PWA push notification infrastructure is ready to support in-system notification delivery.
3. Audit requirements demand a traceable in-system communication record alongside task execution.
4. Team size reaches a threshold where external channel coordination creates measurable bottlenecks.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Comments and threaded discussion.
- Mentions and notification triggers.
- Notification persistence and delivery.

### Dependency on push notifications

The notification delivery layer depends on the PWA push notification infrastructure from `pwa-push-notifications.md`. Consider promoting both items together or sequencing: comments first (in-app only), then push delivery when push infra is ready.
