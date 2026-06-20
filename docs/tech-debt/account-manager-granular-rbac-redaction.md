# Tech Debt: ACCOUNT_MANAGER Broad-Membership Money Exposure

## Current Issue

PR #149 adds `account_manager` to the shared studio role enum so the client-mechanic catalog can authorize `ACCOUNT_MANAGER` alongside `ADMIN` and `MANAGER`.

The current authorization model still treats several studio routes with bare `@StudioProtected()` as "any studio member." Once an admin grants `account_manager`, that role can reach broad member read routes before the planned granular RBAC and redaction gates exist. Some of those responses include money or operational cost fields, such as shift `hourly_rate`, `planned_cost`, and `actual_cost`.

## Why It Matters

`ACCOUNT_MANAGER` is intended to manage client mechanics and later review non-financial operational context. It is not intended to see studio money fields. Allowing the role through broad all-member routes widens access to financial data until route-level redaction or permission checks are introduced.

## Accepted Risk

Accepted for PR #149. The role is needed as a shared contract foundation for client mechanics, and granular role/module access is intentionally deferred to the Phase 6 RBAC enhancement rather than patched piecemeal in this foundation PR.

## Desired Direction

- Replace broad "any studio member" access with granular module permissions where money-bearing routes can explicitly exclude `ACCOUNT_MANAGER`.
- Add role-aware response projections for routes that remain shared but include sensitive fields for higher-privilege roles.
- Keep frontend route visibility and backend route guards tied to the same access policy source.

## Trigger To Fix

Fix during Phase 6 granular role and module access work, or earlier if `ACCOUNT_MANAGER` is enabled for live studio users before that Phase 6 RBAC slice starts.

## Acceptance Criteria

- `ACCOUNT_MANAGER` cannot read rate, commission, compensation, cost, or revenue fields unless a future product decision explicitly permits it.
- Backend tests enumerate blocked money fields for representative all-member routes.
- Role assignment, route guards, response serializers, and frontend navigation agree on the same permission policy.

## Related Context

- [PHASE_6.md](../roadmap/PHASE_6.md) Track D
- [client-mechanics PRD](../prd/client-mechanics.md)
- [CLIENT_MECHANICS_MANAGEMENT_DESIGN.md](../../apps/erify_studios/docs/design/CLIENT_MECHANICS_MANAGEMENT_DESIGN.md)
