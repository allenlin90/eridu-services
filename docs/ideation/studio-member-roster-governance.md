# Ideation: Studio Member Roster / Membership Governance

> **Status**: Deferred from Phase 4 feature branch merge
> **Origin**: Phase 4 feature branch merge gap (`feat/phase-4-p-and-l`), March 2026
> **Related**: [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md), [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md)

## What

Add a studio-scoped member roster workflow at `/studios/:studioId/members` that allows studio managers and admins to invite, search, update roles, remove members, and toggle helper eligibility. Currently, membership management is admin-only via `/system/memberships`. This would bring roster governance into the studio-operator surface.

## Why It Was Considered

- The Phase 4 feature branch implemented a dedicated studio-scoped member roster with invite/search, role updates, removal, and helper eligibility toggles.
- Studio operators (ADMIN, MANAGER) currently rely on system admins for any membership management — creating operational friction for day-to-day team changes.
- A studio-scoped roster surface aligns with the studio-operator ownership model established in Phase 4.

## Why It Was Deferred

1. The current `/system/memberships` coverage is sufficient for the launch period with a single studio.
2. The API contract scope for `/studios/:studioId/studio-memberships` requires explicit decisions: whether to include/exclude `user-catalog`, create, role update, helper toggle, and delete operations.
3. Route guard and sidebar policy alignment for studio-scoped member mutations has not been settled.
4. Role matrix documentation needs updating to reflect which roles can manage which membership operations.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Studio operators are blocked from a time-sensitive team change because system-admin access is not available.
2. The studio count grows beyond one and per-studio roster self-management becomes operationally necessary.
3. The helper eligibility toggle is needed as a studio-operator workflow (currently tied to system-admin access).
4. Role policy documentation is ready to define the full CRUD permission matrix for studio-scoped membership mutations.

## Implementation Notes (Preserved Context)

### Scope decisions needed before PRD

- Decide whether studio membership management remains system-admin-only (`/system/memberships`) or should also ship as a studio-scoped roster surface.
- Reconcile API contract scope for `/studios/:studioId/studio-memberships`, including/excluding `user-catalog`, create, role update, helper toggle, and delete operations.
- Align route guards/sidebar policy and role matrices for any retained member-roster route.

### Verification items (when promoted)

- Add BE/FE tests for membership mutation paths and role-based access.
- Update role-policy documentation to reflect the final source of truth.
