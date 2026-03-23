# PRD: Studio Creator Roster Management

> **Status**: Active
> **Phase**: 4 — Extended Scope
> **Workstream**: Studio operator governance — L-side P&L creator cost inputs
> **Depends on**: Creator Mapping — ✅ **Complete** (deployed to master; `ShowCreator` compensation overrides live), Show Economics baseline — ✅ **Complete** (commit `8de31ffe`)

## Problem

Studio operators (ADMIN) cannot manage their own creator roster without system-admin intervention. Default creator compensation fields (`defaultRate`, `defaultRateType`, `defaultCommissionRate` on `Creator`) can only be set via admin tooling, yet these fields are the **fallback cost inputs** for the economics endpoint when no per-show `ShowCreator` override exists.

Key questions unanswered today:

- *"How does a studio add a new creator to their roster without filing a request to system admin?"*
- *"How do we update a creator's default rate as market rates change?"*
- *"Which creators are currently active in our studio and what are their compensation defaults?"*
- *"A creator has left — how do we deactivate them from our roster without removing their historical data?"*

The existing `GET /studios/:studioId/creators/roster` endpoint is read-only. There is no write surface for studio operators to maintain the roster or the compensation defaults that flow into P&L.

## Users

- **Studio ADMIN** (primary): full CRUD access — add from catalog, update compensation defaults, activate/deactivate
- **Studio MANAGER** (secondary): read-only roster view with compensation fields visible for operational awareness; TALENT_MANAGER also has read access

## Existing Infrastructure

| Model / Endpoint | Fields / Behavior | Status |
| --- | --- | --- |
| `Creator` | `defaultRate`, `defaultRateType`, `defaultCommissionRate`, `deletedAt`, `version` | ✅ Exists |
| `ShowCreator` | `agreedRate`, `compensationType`, `commissionRate` (per-show overrides) | ✅ Exists (deployed) |
| `GET /studios/:studioId/creators/roster` | Read-only roster | ✅ Exists |
| `GET /studios/:studioId/creators/catalog` | System catalog for lookup | ✅ Exists |
| `GET /studios/:studioId/creators/availability` | Availability view | ✅ Exists |
| Economics service | Resolves `ShowCreator.agreedRate` → `Creator.defaultRate` precedence | ✅ Exists |

## Requirements

### In Scope

1. **List studio creator roster** — display all studio-linked creators with name, active status, `defaultRate`, `defaultRateType`, and `defaultCommissionRate`. ADMIN, MANAGER, and TALENT_MANAGER can view.

2. **Add creator from system catalog** — ADMIN can onboard a creator to the studio roster by selecting from the system creator catalog. This creates the studio-creator association (not a new `Creator` record). Creator must exist in the system catalog; no freeform creation in scope.

3. **Update default compensation fields** — ADMIN can update `defaultRate`, `defaultRateType`, and `defaultCommissionRate` for a creator in the studio roster. This is the **L-side economics hook**: these defaults are the fallback used by the economics service for all shows that do not have a `ShowCreator` override. Version-guarded: updates must include the current `version` value; stale updates return 409.

4. **Activate / deactivate creator** — ADMIN can mark a creator as active or inactive within the studio. Inactive creators are excluded from assignment workflows and the roster list by default (filterable). Historical `ShowCreator` records are not affected.

5. **Version-guarded updates** — all PATCH operations on compensation fields use optimistic concurrency. The request must supply the current `version`. If another update has occurred since the client last read, return 409 Conflict.

### Out of Scope

- Creating new creators from scratch — onboarding is catalog-lookup only
- Per-show override edits — those belong in the creator-mapping feature (already shipped)
- Compensation history / audit trail
- Hard deletion of creators — deactivation only
- Bulk import or CSV onboarding

## L-Side Integration Note

`Creator.defaultRate`, `defaultRateType`, and `defaultCommissionRate` are the fallback inputs resolved by the economics service when no `ShowCreator.agreedRate` / `compensationType` override is set:

- **Rate precedence**: `ShowCreator.agreedRate` → `Creator.defaultRate`
- **Type precedence**: `ShowCreator.compensationType` → `Creator.defaultRateType`

Updating these defaults directly changes the economics baseline for all shows that rely on the fallback — typically shows where creator-mapping has been completed but compensation has not been explicitly overridden at the show level.

`FIXED`-type creators with an updated `defaultRate` will see an immediate change in baseline cost projections for future shows without per-show overrides. `COMMISSION` and `HYBRID` types require revenue inputs (tracked in the P&L Revenue Workflow PRD).

## API Contract

### Routes

| Method | Route | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/studios/:studioId/creators` | List roster with compensation defaults | ADMIN, MANAGER, TALENT_MANAGER |
| `POST` | `/studios/:studioId/creators` | Add creator from system catalog | ADMIN only |
| `PATCH` | `/studios/:studioId/creators/:creatorId` | Update compensation defaults or active status | ADMIN only |

Route guards: all routes use `@StudioProtected`. Write routes require `ADMIN` role.

### Response DTO (GET list)

```json
{
  "creator_id": "crt_abc123",
  "name": "Creator Name",
  "is_active": true,
  "default_rate": 500.00,
  "default_rate_type": "FIXED",
  "default_commission_rate": null,
  "version": 2,
  "created_at": "2026-02-01T10:00:00Z"
}
```

### Request DTO (POST — add from catalog)

```json
{
  "creator_id": "crt_abc123",
  "default_rate": 500.00,
  "default_rate_type": "FIXED",
  "default_commission_rate": null
}
```

### Request DTO (PATCH — update defaults)

All fields optional except `version` (required for optimistic concurrency).

```json
{
  "default_rate": 600.00,
  "default_rate_type": "FIXED",
  "default_commission_rate": null,
  "is_active": true,
  "version": 2
}
```

### Error Codes

| Code | HTTP Status | Condition |
| --- | --- | --- |
| `CREATOR_NOT_FOUND` | 404 | Creator ID does not exist in system catalog |
| `CREATOR_ALREADY_IN_ROSTER` | 409 | Creator already has an active roster entry in this studio |
| `VERSION_CONFLICT` | 409 | PATCH `version` does not match current record |

All error codes to be defined in `@eridu/api-types`.

### Validation Rules

- `default_rate`: non-negative decimal (`>= 0`). Zero is valid (unpaid/test scenarios).
- `default_rate_type`: enum — `FIXED`, `COMMISSION`, `HYBRID`.
- `default_commission_rate`: non-negative decimal when `default_rate_type` is `COMMISSION` or `HYBRID`; null when `FIXED`. Percentage value (e.g., `15.0` = 15%).

### Edge Cases

- **Duplicate add**: POST with a `creator_id` that already exists in the studio roster returns 409 `CREATOR_ALREADY_IN_ROSTER`.
- **Re-add after deactivation**: POST with a deactivated creator ID restores the roster entry (sets `is_active=true`) with the newly specified compensation defaults.
- **Rate change cascade**: updating `defaultRate` immediately changes the economics baseline for all shows relying on the fallback. Existing `ShowCreator` overrides are not affected.

## Frontend Route

`/studios/$studioId/creators`

Listed in the sidebar under the **Creators** group alongside Creator Mapping. See `apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md` for group structure.

`hasStudioRouteAccess` key to add: `creatorRoster` — roles: `[ADMIN, MANAGER, TALENT_MANAGER]`.

## Acceptance Criteria

- [ ] List endpoint returns all studio-linked creators with `default_rate`, `default_rate_type`, `default_commission_rate`, and active status.
- [ ] ADMIN can add a creator from the system catalog; system returns 404 if creator is not found in catalog.
- [ ] ADMIN can update `default_rate`, `default_rate_type`, `default_commission_rate`; validated as non-negative decimals where applicable.
- [ ] ADMIN can activate or deactivate a creator; deactivated creators are excluded from assignment workflows.
- [ ] Version-guarded PATCH: stale update (version mismatch) returns 409 Conflict with a clear error.
- [ ] MANAGER and TALENT_MANAGER can view roster with compensation fields; PATCH/POST return 403 for these roles.
- [ ] Economics endpoint reflects updated `defaultRate` for shows without `ShowCreator` overrides.
- [ ] Historical `ShowCreator` records are not modified when creator defaults are updated.

## Product Decisions

- **Catalog-only onboarding** — new creators must exist in the system catalog before they can be added to a studio roster. This maintains the system-of-record integrity for creator identity.
- **Deactivation, not deletion** — inactive status is a flag, not a soft-delete. The creator record and all historical associations are preserved.
- **Compensation defaults are fallbacks** — updating defaults does not override existing `ShowCreator` records. The precedence chain (`ShowCreator` → `Creator` default) is enforced by the economics service and is not modified by this PRD.
- **Optimistic concurrency** — version guards are required for all compensation field updates to prevent silent overwrites in concurrent studio management sessions.

## Design Reference

- Backend API design: `apps/erify_api/docs/design/` (to be created when this PRD is promoted to implementation)
- Frontend design: `apps/erify_studios/docs/design/` (to be created when this PRD is promoted to implementation)
- Economics baseline design: `apps/erify_api/docs/PHASE_4_PNL_BACKEND.md`
- Creator mapping (shipped): `apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md`
