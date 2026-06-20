# Tech Debt: ACCOUNT_MANAGER Granular RBAC and Client Scope

## Current Issue

PR #149 adds `account_manager` to the shared studio role enum so the client-mechanic catalog can authorize `ACCOUNT_MANAGER` alongside `ADMIN` and `MANAGER`.

The current authorization model still treats several studio routes with bare `@StudioProtected()` as "any studio member." Once an admin grants `account_manager`, that role can reach broad member read routes before the planned granular RBAC and redaction gates exist. Some of those responses include money or operational cost fields, such as shift `hourly_rate`, `planned_cost`, and `actual_cost`.

The same foundation PR also exposes client-mechanic catalog routes under `studios/:studioId/clients/:clientId/mechanics` before the studio-client linkage gate exists. `StudioGuard` validates membership in `:studioId`, and the controller validates only that `:clientId` is a globally existing client. The service calls are then scoped by `clientUid` alone, so a member of one studio can access another client's global mechanic catalog if they know the client UID.

## Why It Matters

`ACCOUNT_MANAGER` is intended to manage client mechanics and later review non-financial operational context. It is not intended to see studio money fields. Allowing the role through broad all-member routes widens access to financial data until route-level redaction or permission checks are introduced.

Client mechanics are global client-owned instructions. Without a studio-client authorization boundary, catalog reads and writes can cross studio/client relationships before Phase 6 introduces the access model that should own those rules.

## Accepted Risk

Accepted for PR #149. The role and catalog routes are needed as a shared contract foundation for client mechanics, and granular role/module access plus client-scope linkage are intentionally deferred to the Phase 6 RBAC enhancement rather than patched piecemeal in this foundation PR.

## Desired Direction

- Replace broad "any studio member" access with granular module permissions where money-bearing routes can explicitly exclude `ACCOUNT_MANAGER`.
- Add role-aware response projections for routes that remain shared but include sensitive fields for higher-privilege roles.
- Add a studio-client authorization policy for client-owned surfaces, including client-mechanic catalog routes, so catalog access is restricted to studios linked to that client.
- Keep frontend route visibility and backend route guards tied to the same access policy source.

## Trigger To Fix

Fix during Phase 6 granular role and module access work, or earlier if `ACCOUNT_MANAGER` is enabled for live studio users or client-mechanic catalog routes are exposed to production users before that Phase 6 RBAC slice starts.

## Acceptance Criteria

- `ACCOUNT_MANAGER` cannot read rate, commission, compensation, cost, or revenue fields unless a future product decision explicitly permits it.
- Client-mechanic catalog reads and writes require a validated studio-client relationship or an explicit privileged bypass.
- Backend tests enumerate blocked money fields for representative all-member routes.
- Backend tests cover cross-studio/client catalog access denial.
- Role assignment, route guards, response serializers, and frontend navigation agree on the same permission policy.

## Related Context

- [PHASE_6.md](../roadmap/PHASE_6.md) Track D
- [client-mechanics PRD](../prd/client-mechanics.md)
- [CLIENT_MECHANICS_MANAGEMENT_DESIGN.md](../../apps/erify_studios/docs/design/CLIENT_MECHANICS_MANAGEMENT_DESIGN.md)
