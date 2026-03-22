# Ideation: Material Management

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [docs/domain/BUSINESS.md](../../docs/domain/BUSINESS.md)

## What

Build a `Material` / `MaterialType` / `ShowMaterial` data model and CRUD workflows to support production quality, traceability, and attachment workflows. Materials would be immutably versioned with a current-alias pointer and linkable to shows and ad-hoc tasks.

## Why It Was Considered

- Production workflows require material traceability — which assets were used for which show.
- Material attachments on ad-hoc tickets (cross-functional ticketing) need a first-class model.
- A dedicated material UI would replace ad-hoc attachments via task content fields.

## Why It Was Deferred

1. No active production workflow is currently blocked by the absence of a material model.
2. The material model design (versioning strategy, type taxonomy, relationship to shows and tasks) has not been scoped.
3. Cross-functional ticketing (which would use material attachments) is itself deferred.
4. File upload infrastructure (presigned R2 flow) exists but material lifecycle on top of it has not been designed.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. A production workflow is blocked because there is no system-of-record for production assets.
2. Cross-functional ticketing is promoted and material attachments are identified as a required dependency.
3. The material model design (versioning, type taxonomy, show linkage) is agreed with stakeholders.
4. Audit requirements necessitate formal material traceability beyond what task content fields provide.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- `Material` / `MaterialType` / `ShowMaterial` data model and CRUD.
- Immutable versioning with current-alias pointer.
- Material-ticket integration (attachments on ad-hoc tasks).
- Show-material linking and dedicated material UI.
