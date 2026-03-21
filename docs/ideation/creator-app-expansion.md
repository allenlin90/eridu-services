# Ideation: Creator App Expansion

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md), [pwa-push-notifications.md](./pwa-push-notifications.md)

## What

Expand `erify_creators` capabilities so creator users can view assignments, schedules, and tasks grouped and scoped per studio. Align with the studio-scoped/grouped structures introduced in Phase 4 and finish remaining creator-first naming compatibility cleanup.

## Why It Was Considered

- Phase 4 introduced studio-scoped structures and the creator-first terminology shift. The creator app (`erify_creators`) should reflect this model.
- Creator users currently have a limited view of their assignments and schedule context — expanding this increases operational self-service.
- Role-aware visibility (what a creator sees vs. what a studio operator sees) supports a cleaner separation of concerns in the UI.

## Why It Was Deferred

1. Current creator app scope is intentionally minimal — expanding prematurely adds maintenance burden before user needs are validated.
2. Creator-first naming cleanup (`creator-naming-mc-deprecation`) is a prerequisite — expanding app capabilities while naming is inconsistent would compound technical debt.
3. Role-aware visibility for creator-facing views (assignments, schedules, tasks) needs product definition before UX work begins.
4. Studio-scoped data grouping for creator users requires API changes not yet designed.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Creator users are actively requesting access to assignment, schedule, or task information they currently cannot see in the app.
2. Creator-first naming cleanup (`creator-naming-mc-deprecation`) is complete and the naming inconsistency no longer blocks expansion.
3. A specific studio-scoped creator workflow (e.g. self-service availability, assignment review) is identified as operationally valuable.
4. The creator app is being evaluated as a self-service surface that reduces studio-operator coordination burden.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Expand creator app capabilities for creator users by studio scope.
- Keep data and actions grouped/scoped per studio as defined in Phase 4.
- Add role-aware visibility and operational views for assignments, schedules, and tasks.

### Prerequisite: naming cleanup

This item depends on `creator-naming-mc-deprecation.md` being complete or at least in progress. Expanding the creator app while `mc`/`creator` naming is mixed will create a confusing user-facing experience and add to the renaming scope.
