# Phase 4: P&L Visibility & Creator Operations

> **Status**: ✅ Completed (creator mapping + assignment delivered; economics redesign deferred to next phase)
> **Primary tracker**: This file (`PHASE_4.md`)

## Goal

Deliver creator mapping + assignment foundations on top of the creator-first baseline, with economics redesign deferred to next phase.

## Phase 4 Baseline

- Creator naming cutover/renaming/refactoring is a **completed prerequisite inside Phase 4** and is merged to `master`.
- Phase 4 deliverable is the creator mapping + assignment foundation (BE/FE + smoke stabilization).
- Economics implementation is intentionally deferred to next phase redesign scope.

## Phase 4 Delivery Summary

### 1. Creator Mapping + Assignment (Done)

- Studio-level creator mapping contracts and endpoints are implemented.
- Show-level creator assignment flows (single-show and bulk workflows) are implemented.
- Mapping behavior and smoke coverage are stabilized for merge to `master`.

### 2. Economics Baseline (Deferred)

- Economics redesign and implementation moved to next phase.
- Revenue/performance-driven profit logic remains deferred.

### 3. Docs / Agent / Memory Sync (Done)

- Roadmap and app-local design docs aligned with delivered mapping scope and deferred economics scope.

## Architecture Guardrails (Phase 4 Baseline)

- Finance arithmetic must live in dedicated economics domain services/calculators.
- Controllers must stay transport-focused (authz, DTO parsing, response shaping only).
- Orchestration services may coordinate flows but must not own financial formulas.
- `metadata` is not a compensation rule engine and must not store executable bonus logic.
- Complex compensation (bonus, post-show adjustments, tiered/volume commission, hybrid rule sets) is explicitly deferred.

## Canonical Specs (PRD + BE/FE Feature Docs)

| Scope                            | PRD                                             | Backend Doc                                                                       | Frontend Doc                                                                                           |
| -------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Roles & authorization foundation | [rbac-roles.md](../prd/rbac-roles.md)           | [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md) | [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md) |
| Creator mapping & assignment     | [creator-mapping.md](../prd/creator-mapping.md) | [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md)        | [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md)                       |
| Show economics baseline          | [show-economics.md](../prd/show-economics.md)   | [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md)        | [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md)                       |

## Out of Scope for Phase 4

- Economics redesign/implementation (moved to [Phase 5](./PHASE_5.md) planning scope).
- Ticketing/material management and unrelated backlog tracks (see [Phase 5](./PHASE_5.md)).
- Advanced profit engine and complex compensation policies.

## Definition of Done (Phase 4)

- Mapping/assignment flow is stable and merged-ready.
- Creator mapping PRD intent and BE/FE design docs are synced and traceable by route/contract.
- Economics work is explicitly deferred to next phase redesign and tracked in Phase 5 backlog.
