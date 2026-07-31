# Ideation: Material Management

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [docs/domain/BUSINESS.md](../../docs/domain/BUSINESS.md), [Scene Quality Control](../features/scene-qc.md)

## What

Build a `Material` / `MaterialType` / `ShowMaterial` data model and CRUD workflows to support production quality, traceability, and attachment workflows. Materials would be immutably versioned with a current-alias pointer and linkable to shows and ad-hoc tasks.

Scene QC promotes a narrower Client-owned reference-material slice inside the Scene QC capability. That slice supports reusable expected-scene composition without introducing a general Material domain, ShowMaterial lifecycle, or cross-workflow attachment system.

## Why It Was Considered

- Production workflows require material traceability — which assets were used for which show.
- Material attachments on ad-hoc tickets (cross-functional ticketing) need a first-class model.
- A dedicated material UI would replace ad-hoc attachments via task content fields.

## Why It Was Deferred

1. Scene QC needs reusable expected-scene references, but its first release can own the narrow reference-material lifecycle locally.
2. The material model design (versioning strategy, type taxonomy, relationship to shows and tasks) has not been scoped.
3. Cross-functional ticketing (which would use material attachments) is itself deferred.
4. File upload infrastructure (presigned R2 flow) exists but material lifecycle on top of it has not been designed.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. A second workflow needs to consume the same material identities and version lifecycle outside Scene QC.
2. Cross-functional ticketing is promoted and material attachments are identified as a required dependency.
3. The material model design (versioning, type taxonomy, show linkage) is agreed with stakeholders.
4. Audit requirements necessitate formal material traceability beyond what task content fields provide.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- `Material` / `MaterialType` / `ShowMaterial` data model and CRUD.
- Immutable versioning with current-alias pointer.
- Material-ticket integration (attachments on ad-hoc tasks).
- Show-material linking and dedicated material UI.
- Scene QC reference materials remain capability-local until one of the promotion gates above requires a shared Material domain.

## Scene QC PRD Stage 2 — Forwarded Scope

[Scene Quality Control](../features/scene-qc.md) Stage 1 shipped a single mutable Client-owned Scene Profile with no revision history or composition. The PRD's Stage 2 ("Governance and Advanced Profile Operations") is forwarded here rather than dropped, since its profile/material scope belongs with this ideation topic:

- Reusable, versioned Scene Materials distinct from a Client's single Stage 1 reference, ordered multi-reference composition, and per-Studio/per-platform applicability.
- Per-Show or per-platform Scene Profile overrides beyond the Stage 1 Client-wide default.
- Record detail with a revision timeline.

### Confirmed-Result Amendment Workflow (Stage 2)

A separate but co-scheduled Stage 2 item — not a Material Management concern itself, forwarded here only because it shares Stage 2 sequencing with the profile/material work above:

- Confirmed Scene QC results can be amended through an explicit command.
- An amendment requires a reason and preserves the original result.
- Amendments increment the effective revision and remain visible in record detail.
- Manager reports identify amended data and use the latest effective confirmed revision.
- No Scene QC history is publicly deletable.

Promote either forwarded item to its own PRD/design doc under the same decision-gate discipline as the rest of this document, rather than reusing Stage 1's now-closed [docs/features/scene-qc.md](../features/scene-qc.md).
