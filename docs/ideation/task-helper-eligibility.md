# Ideation: Task Helper Eligibility and Assignment Gating

> **Status**: Deferred from Phase 4 feature branch merge
> **Origin**: Phase 4 feature branch merge gap (`feat/phase-4-p-and-l`), March 2026
> **Related**: [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md), [studio-member-roster-governance.md](./studio-member-roster-governance.md)

## What

Introduce helper eligibility controls on studio memberships and enforce that eligibility gate during task-assignment workflows. A `isHelperEligible` flag on `StudioMembership` would determine whether a member can be assigned as a helper on tasks. The assignment endpoint would return a typed error if the assignee is not helper-eligible.

## Why It Was Considered

- The Phase 4 feature branch implemented helper eligibility controls and task-assignment eligibility enforcement.
- Not all studio members should be assignable as task helpers — eligibility needs to be explicitly controlled by managers.
- The assignment error contract currently does not distinguish between "user not found", "user not in studio", and "user not helper-eligible" — finer-grained errors improve UX and debugging.

## Why It Was Deferred

1. The decision of whether helper eligibility belongs as studio-membership metadata policy or as a separate permission model has not been finalized.
2. Task-assignment error contracts (including the helper-eligibility case) are not defined in the current API types.
3. The UI workflow for the helper eligibility toggle is tied to the studio member roster governance item, which is also deferred.
4. Policy tests and documentation are not in place for helper-aware assignment workflows.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Studio operators need to restrict which members can be assigned as task helpers, and the current all-or-nothing approach causes operational issues.
2. The studio-member-roster-governance item is promoted and the helper-toggle workflow can be delivered as part of the same surface.
3. The task-assignment endpoint needs to distinguish eligibility errors from authorization errors for frontend UX.
4. Policy enforcement for helper assignment is required for an active business workflow.

## Implementation Notes (Preserved Context)

### Scope decisions needed before PRD

- Decide whether task-helper eligibility remains part of studio-membership metadata policy.
- If retained, define canonical API + UI behavior for helper toggle and conflict-safe updates.
- Define task-assignment error contract when assignee is not helper-eligible.

### Dependency on roster governance

This item is tightly coupled to `studio-member-roster-governance.md`. If the roster governance item is promoted, the helper toggle should be delivered as part of that surface rather than as a separate workflow.

### Verification items (when promoted)

- Add policy tests and documentation updates for helper-aware assignment workflows.
