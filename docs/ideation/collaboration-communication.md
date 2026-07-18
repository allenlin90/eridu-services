# Ideation: Collaboration and Communication

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [Operational Notifications and PWA Push](../prd/notification-system.md)

## What

Add in-system threaded comments on tasks and shows, @mentions, and optional watchers. This reduces reliance on external channels for operational coordination while keeping discussion attached to the work.

Notification persistence, preferences, inbox, and PWA push are owned by the [notification PRD](../prd/notification-system.md). This topic defines collaboration records and when a mention or watched-thread event should publish through that capability.

## Why It Was Considered

- Operational coordination currently happens outside the system, making context hard to trace and audit.
- Comments on tasks would provide a persistent coordination record alongside task execution.
- Mentions can create targeted notification events without giving the collaboration model its own delivery subsystem.

## Why It Was Deferred

1. External channel coordination is sufficient for current team size and workflow volume.
2. Comment/thread data modeling needs retention, edit, delete, and moderation policy.
3. Mention resolution requires a user/member search API surface and visibility rules.
4. The product has not selected the first workflow where persistent discussion is more valuable than current external coordination.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Operational coordination failures are attributed to context loss from external channel reliance.
2. The notification PRD foundation is implemented and a workflow needs mention or watcher delivery.
3. Audit requirements demand a traceable in-system communication record alongside task execution.
4. Team size reaches a threshold where external channel coordination creates measurable bottlenecks.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Comments and threaded discussion.
- Mentions, watchers, and the rules that publish typed notification events.

### Notification boundary

Comments remain useful without push. Mentions and watched-thread changes publish through the notification capability; collaboration does not store inbox state, push subscriptions, preferences, or delivery attempts.
