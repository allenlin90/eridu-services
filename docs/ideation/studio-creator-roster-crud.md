# Ideation: Studio Creator Roster Management (CRUD + Defaults)

> **Status**: Deferred from Phase 4 feature branch merge
> **Origin**: Phase 4 feature branch merge gap (`feat/phase-4-p-and-l`), March 2026
> **Related**: [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md), [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md)

## What

Promote full creator roster CRUD as a first-class studio workflow at `/studios/:studioId/creators`. This extends the current read-oriented coverage (`catalog`, `roster`, `availability`) with write operations: onboarding from catalog, active/inactive management, studio-specific default compensation fields, and optimistic-version updates.

## Why It Was Considered

- The Phase 4 feature branch implemented creator roster CRUD patterns: add from catalog, activate/deactivate, set default compensation defaults, and version-guarded updates.
- Creator mapping (shipped in Phase 4) depends on roster state — inconsistency between roster state and mapping behavior creates product confusion.
- Default compensation fields (`defaultRate`, `defaultRateType`, `defaultCommissionRate` on `Creator`) are already in the schema but have no write workflow beyond admin tooling.

## Why It Was Deferred

1. Current read-only roster coverage is sufficient for the launched creator-mapping flow.
2. The canonical write contract for roster mutation (`add`, `update`, `remove`) and version-conflict handling semantics has not been defined.
3. The relationship between creator roster UX and creator-mapping UX needs alignment to prevent inconsistency in roster state vs. mapping behavior.
4. The compensation-default propagation behavior (how studio defaults interact with show-level overrides) needs explicit product definition.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Studio operators are blocked from onboarding new creators to the studio roster without system-admin intervention.
2. Creator roster state (active/inactive) needs to gate assignment workflows (creator-mapping or show assignment).
3. Default compensation fields need to be set via studio-operator workflow rather than admin tooling.
4. Version-conflict handling for concurrent roster edits becomes a production incident.

## Implementation Notes (Preserved Context)

### Scope decisions needed before PRD

- Decide whether Phase 5 should promote full creator roster CRUD as a first-class studio workflow (`/studios/:studioId/creators`).
- Define canonical write contract for roster mutation (`add`, `update`, `remove`) and version-conflict handling semantics.
- Align creator roster UX with creator-mapping UX so roster state and mapping behavior remain consistent.

### Verification items (when promoted)

- Add BE/FE tests for roster mutation, optimistic concurrency conflicts, and compensation-default propagation behavior.
