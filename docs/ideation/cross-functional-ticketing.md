# Ideation: Cross-Functional Ticketing

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md), [docs/domain/BUSINESS.md](../../docs/domain/BUSINESS.md)

## What

Extend the task system beyond template-driven studio operations to support ad-hoc cross-functional work: tasks created without templates, targeted at shows or clients, accessible to commerce, design, and moderation managers. Includes a potential client self-service ticketing surface via a separate frontend app similar to `erify_creators`.

## Why It Was Considered

- Current task flows are template-driven and optimized for studio operations. Ad-hoc cross-functional work (requests from commerce, designers, moderation) still happens outside the system.
- Snapshot repurposing could support requirement versioning on ad-hoc tasks without requiring full template machinery.
- A client self-service surface would reduce operational coordination overhead for show-related requests.

## Why It Was Deferred

1. The template-driven model covers the highest-volume operational workflows. Ad-hoc ticketing is lower frequency and does not block current operations.
2. Cross-functional access roles (commerce, designers, moderation managers) are not yet fully defined in the authorization model.
3. Client self-service would require a new frontend app and authentication surface — significant scope for uncertain demand.
4. Snapshot repurposing for ad-hoc tasks needs design work to avoid confusion between template-versioned snapshots and ad-hoc requirement versioning.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. A cross-functional team (commerce, design, moderation) is blocked from coordinating work because ad-hoc task creation is not available in the system.
2. Client self-service ticketing is identified as a business-critical requirement with a committed timeline.
3. The authorization model for cross-functional roles is defined and approved.
4. Ad-hoc task creation volume justifies the engineering investment in a non-template workflow.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Ad-hoc task creation without templates (show-targeted and client-targeted).
- Cross-functional access for commerce, designers, and moderation managers.
- Snapshot repurposing for requirement versioning on ad-hoc tasks.
- Client self-service ticketing via separate FE app (similar to `erify_creators`).
