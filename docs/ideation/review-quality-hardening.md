# Ideation: Review Quality Hardening

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md)

## What

Harden the review governance model as volume and role diversity grow: enforce transition whitelists for admin/manager state changes, require rejection notes, harden review decision audit metadata, and standardize error responses for invalid state transitions.

## Why It Was Considered

- As task volume and role count increase, inconsistent review decisions and missing rejection notes become harder to audit and QC.
- The current state machine does not enforce required metadata (e.g. rejection reason) at the transition layer.
- Error responses for invalid transitions are not standardized, making frontend error handling inconsistent.

## Why It Was Deferred

1. Current review volume is low enough that manual QC is sufficient.
2. The transition whitelist design (which roles can make which transitions) needs product input beyond the current RBAC definition.
3. Standardized error responses require an agreed error contract across all review endpoints, which is a non-trivial cross-cutting change.
4. Required rejection notes may affect moderator UX in ways that need careful product consideration.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Review audit logs show a pattern of invalid transitions or missing rejection notes that affects QC.
2. Role diversity (new roles added beyond current set) requires explicit transition whitelist enforcement.
3. Frontend error handling for invalid transitions is broken or inconsistent across review workflows.
4. Compliance or reporting requirements demand a formal rejection-reason audit trail.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Admin/manager transition whitelist enforcement.
- Required rejection notes.
- Review decision audit metadata hardening.
- Standardized error responses for invalid transitions.
