# Ideation: Creator Availability Logic Hardening

> **Status**: Deferred from Phase 4/5 planning — creator-mapping parity stabilization
> **Origin**: Creator-mapping parity stabilization, March 2026
> **Related**: [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md), [studio-creator-roster-crud.md](./studio-creator-roster-crud.md)

## What

Tighten the semantics of `/studios/:studioId/creators/availability` from the current intentionally-loose discovery mode to a well-defined dual-mode API: a broad discovery mode for creator-mapping search and a strict-assignable mode that enforces overlap conflicts, roster policy, and eligibility constraints.

## Why It Was Considered

- The current availability endpoint is intentionally loose to support creator-mapping flows (broad searchable list for discovery). This means it does not enforce assignment conflicts or roster requirements.
- Strict assignability semantics (overlap conflicts, roster policy, currently-assigned handling) are needed before availability data can be trusted as a definitive "can assign" signal.
- Adding conflict metadata to the API response (e.g. `is_conflicted`, `conflict_reason`) would enable better UX in the creator-mapping flow.

## Why It Was Deferred

1. Requirements for strict-mode semantics are still ambiguous — the product has not decided what "conflicted" means in all cases.
2. Roster membership policy (optional, required, or policy-driven by studio settings) has not been settled.
3. Strict mode behavior for creators already assigned to the target show vs. assigned to overlapping shows needs separate handling.
4. The creator roster CRUD item (`studio-creator-roster-crud.md`) needs to stabilize before availability can enforce roster membership requirements.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Assignment conflicts (same creator on overlapping shows) are causing operational problems that loose availability does not prevent.
2. Roster membership policy is formally defined and needs enforcement in the availability endpoint.
3. The creator roster CRUD item is promoted and the availability endpoint needs to reflect roster state.
4. A specific creator-mapping UX improvement requires conflict metadata in the availability response.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Define explicit endpoint semantics for discovery mode (broad searchable list) and strict-assignable mode (enforced overlap/eligibility constraints).
- Decide conflict handling for creators already assigned to the target show vs. assigned to overlapping shows.
- Decide whether roster membership should be optional, required, or policy-driven by studio settings.
- Coordinate strict-mode behavior with creator roster activation/defaults decisions from the merge-gap carry-over item.
- Add conflict metadata contract for FE (for example `is_conflicted`, `conflict_reason`) if strict mode is introduced.
- Align FE add-creator UX to chosen mode(s), including copy, filtering behavior, and empty-state messaging.
- Add BE/FE tests that lock expected behavior for search + assignment edge cases.

### Proposed dual-mode API shape

- `discovery_mode=true` (default): returns broad creator list without conflict enforcement, optimized for search UX.
- `discovery_mode=false` (strict): enforces roster membership, overlap conflicts, and eligibility — returns `is_conflicted` + `conflict_reason` per creator.

This allows the creator-mapping flow to keep its broad search behavior while enabling downstream enforcement when the product is ready.
