# Workflow: Creator Operations

End-to-end flow for how a studio manages its creator talent — from role setup through show assignment and cost visibility.

## Actors

| Actor          | Role             | Key Capability                                  |
| -------------- | ---------------- | ----------------------------------------------- |
| Studio Admin   | `ADMIN`          | Manages memberships, assigns roles, full access |
| Talent Manager | `TALENT_MANAGER` | Browses creators, maps to shows                 |
| Manager        | `MANAGER`        | Same as Admin except membership management      |

## Flow Overview

```
1. Admin assigns TALENT_MANAGER role to a studio member
       ↓
2. Admin maintains creator roster defaults and active state
       ↓
3. Talent Manager browses creator catalog / checks availability
       ↓
4. Talent Manager bulk-assigns creators to shows (with optional compensation override)
       ↓
5. Wave 2 economics service (2.3) reads assignment snapshots and line items using the cost model in 2.1
```

## Step-by-Step

### 1. Role assignment

An admin assigns the `TALENT_MANAGER` role to a studio membership via the admin API or system UI. This unlocks access to creator catalog, roster, availability, and show assignment endpoints.

- Feature: [RBAC Roles](../features/rbac-roles.md)
- Technical: [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md)

### 2. Creator roster management

The studio admin maintains the studio's creator roster at `GET /studios/:studioId/creators` and the matching write APIs:

- `POST /studios/:studioId/creators`
- `PATCH /studios/:studioId/creators/:creatorId`

Business effect:

- `StudioCreator.defaultRate/defaultRateType/defaultCommissionRate` become the maintained studio-scoped fallback cost inputs
- inactive studio creators are excluded from availability discovery and rejected by bulk assign writes
- full `NOT_IN_ROSTER` enforcement is still deferred to creator-availability hardening

### 3. Creator discovery

The talent manager uses two discovery surfaces:

- **Catalog** (`GET /studios/:studioId/creators/catalog`) — all creators (rostered and non-rostered), searchable by name. Use this for browsing.
- **Availability** (`GET /studios/:studioId/creators/availability?date_from=...&date_to=...`) — creators not booked for shows in the given window. Use this when looking for free creators for a slot.

> Note: Availability is currently in **loose/discovery mode** — it filters out creators already booked for overlapping shows and excludes inactive studio roster rows, but does not yet enforce full roster membership policy. Strict mode is the creator-availability hardening scope.

### 4. Show assignment

The talent manager assigns one or more creators to a show via bulk assign:

```
POST /studios/:studioId/shows/:showId/creators/bulk-assign
{
  "creators": [
    { "creator_id": "creator_abc", "agreed_rate": 500, "compensation_type": "FIXED" },
    { "creator_id": "creator_xyz", "compensation_type": "COMMISSION", "commission_rate": 5 }
  ]
}
```

- Idempotent: existing active assignments are skipped.
- Per-show compensation overrides (`agreed_rate`, `compensation_type`, `commission_rate`) are stored on `ShowCreator` and take precedence over creator defaults.
- Response: `{ assigned, skipped, failed }`.

Feature: [Creator Mapping](../features/creator-mapping.md)

### 5. Cost visibility

Once Wave 2 ships (2.1 cost model + 2.2 line items + 2.3 economics service), a finance or admin user will be able to see per-show cost composed from assignment snapshots, shift labor, actuals/planned time, and show-scoped line items. `COMMISSION` and the `HYBRID` commission portion remain unresolved until a future revenue workflow.

Reference: [Economics Cost Model (2.1)](../prd/economics-cost-model.md) · [Compensation Line Items (2.2)](../prd/compensation-line-items.md) · [Economics Service (2.3)](../prd/economics-service.md)

## Data Flow

```
StudioMembership.role = TALENT_MANAGER
        ↓ guards
GET/POST/PATCH /creators
        ↓
GET /creators/catalog|availability
        ↓
POST /shows/:id/creators/bulk-assign
        ↓
ShowCreator { agreedRate, compensationType, commissionRate }
        ↓  [economics merge target]
GET /shows/:id/economics  →  { cost, base_subtotal, line_item_subtotal, unresolved_reasons }
```

## Key Business Rules

- Creators are not studio-scoped — the same creator can be assigned to shows across different studios.
- `ShowCreator.agreedRate` overrides `StudioCreator.defaultRate`; `ShowCreator.compensationType` overrides `StudioCreator.defaultRateType`.
- `metadata` on `ShowCreator` is for audit context only (`source`, `operator_note`, `tags`) — not executable compensation logic.
- `FIXED` and `HOURLY` creator base components are computable from snapshots and time. `COMMISSION` and the commission portion of `HYBRID` require future revenue input.

## Related Docs

| Layer                     | Document                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Feature (RBAC)            | [docs/features/rbac-roles.md](../features/rbac-roles.md)                                               |
| Feature (Creator Mapping) | [docs/features/creator-mapping.md](../features/creator-mapping.md)                                     |
| Phase 4 backend index     | [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md)                             |
| Phase 4 frontend index    | [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md)                       |
| Role visibility model     | [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md) |
