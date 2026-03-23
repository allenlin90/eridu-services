# PRD: Studio Member Roster Management

> **Status**: Active
> **Phase**: 4 — Extended Scope
> **Workstream**: Studio operator governance — L-side P&L labor cost inputs
> **Depends on**: Studio membership system — ✅ **Exists** (`StudioMembership`, `baseHourlyRate`, studio role system, `GET /studios/:studioId/studio-memberships`)

## Problem

Studio operators (ADMIN) cannot manage their own team without system-admin intervention. All membership mutations today flow through `/system/memberships`, which is only accessible to system admins. This creates operational friction for routine team changes such as onboarding a new shift worker, updating a member's role, or removing a departing team member.

More critically for P&L: `StudioMembership.baseHourlyRate` directly drives shift labor cost in the economics endpoint (`GET /studios/:studioId/shows/:showId/economics`). There is currently no studio-operator workflow to keep these rates accurate — inaccurate rates produce incorrect cost projections in the economics baseline.

A second, interlinked problem: `StudioMembership.isHelper` exists in the schema but is not enforced at the task-assignment layer. Any studio member can currently be assigned as a task helper regardless of their eligibility flag. There is no assignment-level error that distinguishes "user not in studio" from "user not helper-eligible", which makes the flag operationally meaningless until enforcement is added.

Key questions unanswered today:

- *"How does a studio admin add a new team member without filing a request to a system admin?"*
- *"How do we update hourly rates as market rates change without system-admin access?"*
- *"Who has helper eligibility enabled and how do we toggle it without going through a separate admin workflow?"*
- *"Why was a helper assigned to a task when their eligibility flag was disabled?"*

## Users

- **Studio ADMIN** (primary): full CRUD access — invite members, update roles and rates, toggle helper eligibility, remove members
- **Studio MANAGER** (secondary): read-only roster view — see member list with roles and rates for operational awareness

## Existing Infrastructure

| Model / Endpoint | Fields / Behavior | Status |
| --- | --- | --- |
| `StudioMembership` | `baseHourlyRate`, `isHelper`, `role`, `deletedAt` | ✅ Exists |
| `GET /studios/:studioId/studio-memberships` | List only, ADMIN-only, returns `studioMembershipWithRelationsDto` (includes `baseHourlyRate`) | ✅ Exists |
| `StudioShift.projectedCost` / `calculatedCost` | Derived from `baseHourlyRate` via shift service | ✅ Exists |
| Studio role system | `ADMIN`, `MANAGER`, `TALENT_MANAGER`, `MODERATION_MANAGER`, `DESIGNER`, `MEMBER` | ✅ Exists |
| System admin memberships | `/system/memberships` — full CRUD, admin-only | ✅ Exists (will remain as fallback) |

## Requirements

### In Scope

1. **List studio members** — display all non-deleted studio memberships with user name, email, role, `baseHourlyRate`, and `isHelper` flag. ADMIN and MANAGER can view.

2. **Invite / add member** — ADMIN can add a member by email lookup from the user catalog. If the user does not exist, return a clear error (no account creation in scope). The invite creates a new `StudioMembership` with the specified role and an initial `baseHourlyRate`.

3. **Update member role** — ADMIN can change another member's role. An ADMIN cannot demote their own membership (self-demotion guard). Role changes take effect immediately for routing and guard purposes.

4. **Update `baseHourlyRate`** — ADMIN can edit the hourly rate for any member. This is the **L-side economics hook**: the updated rate immediately affects future shift cost projections via the existing shift service. Rate must be a non-negative decimal. Zero is valid (volunteer/intern scenario).

5. **Toggle `isHelper` eligibility** — ADMIN can enable or disable helper eligibility per member. This controls whether the member appears in helper assignment workflows and gates the assignment endpoint (see requirement 7).

6. **Helper eligibility enforcement on task assignment** — The task helper assignment endpoint must check `StudioMembership.isHelper` for the assignee before accepting the assignment. If the flag is `false`, return a typed error (`MEMBER_NOT_HELPER_ELIGIBLE`) distinct from `MEMBER_NOT_IN_STUDIO` and authorization errors. This enforcement makes the toggle operationally meaningful — setting `isHelper=false` actively blocks future assignments without removing the member from the roster.

7. **Remove (soft-deactivate) member** — ADMIN can remove a member from the studio. Removal sets `deletedAt` (soft delete). Removed members no longer appear in roster listings or have studio route access. Historical shift and task records referencing the membership are preserved.

### Out of Scope

- Bulk invite (CSV upload or batch email)
- Permission matrix changes — the existing role hierarchy is not modified by this PRD
- External SSO invite flow (e.g., magic link, email invitation with onboarding)
- Creating new user accounts from the studio roster surface
- Membership audit trail / history view
- Availability-based assignment gating (overlap conflict enforcement belongs in the Creator Availability Hardening PRD)

## L-Side Integration Note

`StudioMembership.baseHourlyRate` is the direct cost-driver input for shift labor in the economics model. The shift service computes `StudioShift.projectedCost` and `calculatedCost` using this rate. Today, these rates can only be set via system-admin tooling.

This PRD's primary economics value: studio operators maintain accurate labor cost inputs without system-admin intervention, keeping economics baseline projections current as compensation rates change.

Rate change behavior: updating `baseHourlyRate` affects **future** shift cost projections only. Historical `calculatedCost` values on completed shifts are not retroactively updated.

## API Contract

### Routes

| Method | Route | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/studios/:studioId/members` | List all active studio memberships with user details | ADMIN, MANAGER |
| `POST` | `/studios/:studioId/members` | Add a member by email lookup | ADMIN only |
| `PATCH` | `/studios/:studioId/members/:membershipId` | Update role, `baseHourlyRate`, or `isHelper` | ADMIN only |
| `DELETE` | `/studios/:studioId/members/:membershipId` | Soft-deactivate (remove) a member | ADMIN only |

Route guards: all routes use `@StudioProtected`. Write routes require `ADMIN` role. Read routes allow `ADMIN` and `MANAGER`.

### Response DTO (GET list)

```json
{
  "membership_id": "mem_abc123",
  "user_id": "user_xyz789",
  "user_name": "Jane Doe",
  "user_email": "jane@example.com",
  "role": "MANAGER",
  "base_hourly_rate": 25.00,
  "is_helper": true,
  "version": 3,
  "created_at": "2026-01-15T08:00:00Z"
}
```

### Request DTO (POST — add member)

```json
{
  "email": "jane@example.com",
  "role": "MANAGER",
  "base_hourly_rate": 25.00,
  "is_helper": false
}
```

### Request DTO (PATCH — update member)

All fields optional except `version` (required for optimistic concurrency).

```json
{
  "role": "ADMIN",
  "base_hourly_rate": 30.00,
  "is_helper": true,
  "version": 3
}
```

Stale `version` returns 409 Conflict. This prevents concurrent overwrites of financial data (`baseHourlyRate`).

### Error Codes

| Code | HTTP Status | Condition |
| --- | --- | --- |
| `MEMBER_NOT_HELPER_ELIGIBLE` | 422 | Task helper assignment attempted for member with `is_helper=false` |
| `SELF_DEMOTION_NOT_ALLOWED` | 422 | ADMIN attempts to demote their own membership |
| `USER_NOT_FOUND` | 404 | Email lookup returns no matching user in system catalog |
| `MEMBER_ALREADY_EXISTS` | 409 | Email already has an active membership in this studio |
| `VERSION_CONFLICT` | 409 | PATCH `version` does not match current record |

All error codes to be defined in `@eridu/api-types`.

### Edge Cases

- **Duplicate invite**: POST with an email that already has an active membership returns 409 `MEMBER_ALREADY_EXISTS` (idempotent-safe — not a server error).
- **Rate change effect**: updating `baseHourlyRate` affects **future** shift cost projections only. Historical `calculatedCost` values on completed shifts are immutable. Economics uses the rate at shift computation time, not retroactively.
- **Re-invite after removal**: POST with an email of a soft-deleted member restores the membership (clears `deletedAt`) with the newly specified role and rate.

### Schema Migration Required

`StudioMembership` needs two new fields (consistent with `StudioCreator` which already has `version`):

```prisma
isHelper  Boolean @default(false) @map("is_helper")
version   Int     @default(1)
```

## Frontend Route

`/studios/$studioId/members`

Listed in the sidebar under the **Studio Settings** group (replaces current "Studio Admin" group — see `SIDEBAR_REDESIGN.md`).

## Sidebar

Appears under a new **Studio Settings** group, alongside Shared Fields. See `apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md` for group restructure rationale and icon choices.

`hasStudioRouteAccess` key to add: `members` — roles: `[ADMIN, MANAGER]` (list visible to MANAGER; write actions gated in UI per operation).

## Acceptance Criteria

- [ ] List endpoint returns all active memberships with `user_name`, `user_email`, `role`, `base_hourly_rate`, `is_helper`.
- [ ] ADMIN can add a member by email; system returns 404 if user is not found in catalog.
- [ ] ADMIN can update member role; self-demotion from ADMIN returns 422 with a clear error.
- [ ] ADMIN can update `base_hourly_rate`; value is validated as non-negative decimal.
- [ ] ADMIN can toggle `is_helper`; change takes effect immediately.
- [ ] Task helper assignment endpoint returns typed `MEMBER_NOT_HELPER_ELIGIBLE` error (distinct from 403) when assignee has `is_helper=false`.
- [ ] Helper assignment error contract is documented in `@eridu/api-types`.
- [ ] ADMIN can remove a member; membership is soft-deleted and no longer appears in roster.
- [ ] MANAGER cannot perform any write operation; PATCH/POST/DELETE return 403.
- [ ] Role guards enforced on all routes via `@StudioProtected`.
- [ ] Removed member's historical shift cost records are not altered.

## Product Decisions

- **Soft delete only** — membership removal uses `deletedAt`, not hard delete, to preserve historical cost data integrity.
- **No self-demotion** — ADMIN cannot demote their own membership to prevent lockout. System admin can still override via `/system/memberships`.
- **Rate-forward only** — `baseHourlyRate` changes are not retroactive; past calculated shift costs are immutable.
- **No new account creation** — the add-member flow is catalog-lookup only. Users must already exist in the system.

## Design Reference

- Backend API design: `apps/erify_api/docs/design/` (to be created when this PRD is promoted to implementation)
- Frontend design: `apps/erify_studios/docs/design/` (to be created when this PRD is promoted to implementation)
- Authorization reference: `apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md`
- Role use cases: `apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md`
