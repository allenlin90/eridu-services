# Ideation: Frontend PWA and Push Notifications

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [pwa-best-practices skill](../../.agent/skills/pwa-best-practices/SKILL.md), [collaboration-communication.md](./collaboration-communication.md), [creator-app-expansion.md](./creator-app-expansion.md)

## What

Roll out PWA shell conventions to `erify_creators` (currently only `erify_studios` has PWA baseline) and build out the push notification delivery pipeline: subscription lifecycle, server-side push delivery, deep-link routing, and permission/preferences handling.

## Why It Was Considered

- `erify_studios` now has an app-shell PWA baseline (manifest, auto-updating service worker, recovery route). Parity for `erify_creators` is the logical next step.
- Push notifications would reduce reliance on external channels for operational coordination and assignment notifications.
- Subscription lifecycle management (subscribe/unsubscribe/refresh) is required before any notification feature can ship.

## Why It Was Deferred

1. In-app notification use cases have not been formally defined — push without a notification model is premature.
2. Server-side push delivery pipeline requires significant backend infrastructure (BullMQ jobs, push API integration, subscription storage).
3. PWA push permission UX is notoriously fragile across browsers and OS permission systems — needs careful design.
4. Validating PWA deployment/update/recovery behavior in production should happen before adding push complexity.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. `erify_creators` PWA rollout is needed for a specific offline/installable workflow.
2. In-system notification use cases are formally defined (e.g. task assignment notifications, review status changes).
3. Production PWA update/recovery behavior in `erify_studios` is validated and stable.
4. The collaboration/communication item is promoted and push delivery is required to complete that feature.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Roll out the same PWA shell conventions to `erify_creators`.
- Validate deployment/update/recovery behavior in production environments after rollout.
- Integrate notification system with push notifications:
  - subscription lifecycle (subscribe/unsubscribe/refresh),
  - server-side push delivery pipeline,
  - deep-link routing into relevant pages,
  - permission/preferences handling.

### PWA rollout sequencing

1. First: validate `erify_studios` PWA in production (update/recovery/install flows).
2. Second: roll out PWA shell to `erify_creators` following the same conventions from `.agent/skills/pwa-best-practices/SKILL.md`.
3. Third: design and implement push notification subscription lifecycle.
4. Fourth: build server-side push delivery and deep-link routing.
