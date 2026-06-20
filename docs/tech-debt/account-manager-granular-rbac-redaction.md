# Tech Debt: ACCOUNT_MANAGER Granular RBAC and Client Scope

## Current Issue

PR #149 added `account_manager` to the shared studio role enum so the client-mechanic catalog can authorize `ACCOUNT_MANAGER` alongside `ADMIN` and `MANAGER`. PR #215 (20.3) and its codex-review follow-up since resolved most of what this doc originally flagged:

- **Resolved**: client-mechanic catalog studio-client linkage gate (`ensureStudioClientLinkage`, 20.3) — closes the cross-studio/client catalog read documented below.
- **Resolved**: money-field redaction on task templates, shows, show creators/platforms, and submitted-task content for `ACCOUNT_MANAGER` (allow-list `projectAllowList()` projection + a gate on `/shows/:id/tasks`, since submitted task `content` is an unstructured JSON blob with no fixed money-field shape to allow-list against).

**Still open**: `StudioShiftController`'s list/detail GET routes (`@Get()`, `@Get(':id')`, `@Get('duty-manager')`) still inherit the bare class-level `@StudioProtected()` ("any studio member") guard and return `studioShiftDto`, which includes `hourlyRate`. The frontend never routes `ACCOUNT_MANAGER` to the Shifts page (`STUDIO_ROUTE_ACCESS.shifts` excludes it), but the backend endpoint itself has no role check, so it's reachable by direct API call.

## Why It Matters

`ACCOUNT_MANAGER` is intended to manage client mechanics and review non-financial operational context, not to see studio money fields. The shift money-rate exposure is the one remaining all-member route from the original finding.

## Accepted Risk

Accepted through PR #215. The shift-rate gap is narrower than the original finding (one controller, three GET routes) and tracked here rather than patched as a drive-by in a PR scoped to task templates/shows/creator-mapping.

## Desired Direction

- Add an explicit `@StudioProtected` role list (or an allow-list projection on `studioShiftDto`) to `StudioShiftController`'s GET routes that excludes `ACCOUNT_MANAGER`, mirroring the pattern already shipped for shows/creators/task templates.
- Keep frontend route visibility and backend route guards tied to the same access policy source (already true for the Shifts page; needs to also be true for the underlying API).

## Trigger To Fix

Fix before `ACCOUNT_MANAGER` is enabled for live studio users, or whenever `StudioShiftController` is next touched.

## Acceptance Criteria

- `ACCOUNT_MANAGER` cannot read `hourlyRate` (or any other rate/cost field) from `StudioShiftController`'s GET routes, by guard or by allow-list projection.
- A backend test locks the guard or the allow-list, following the `account-manager-redaction.golden.spec.ts` pattern.

## Related Context

- [PHASE_6.md](../roadmap/PHASE_6.md) Track D
- [client-mechanics PRD](../prd/client-mechanics.md)
- [CLIENT_MECHANICS_MANAGEMENT_DESIGN.md](../../apps/erify_studios/docs/design/CLIENT_MECHANICS_MANAGEMENT_DESIGN.md)
