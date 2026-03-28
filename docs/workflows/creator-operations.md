# Workflow: Creator Operations

End-to-end flow for how a studio manages its creator talent — from role setup through show assignment and cost visibility.

## Actors

| Actor | Role | Key Capability |
| --- | --- | --- |
| Studio Admin | `ADMIN` | Manages memberships, assigns roles, full access |
| Talent Manager | `TALENT_MANAGER` | Browses creators, maps to shows |
| Manager | `MANAGER` | Same as Admin except membership management |

## Flow Overview

```
1. Admin assigns TALENT_MANAGER role to a studio member
       ↓
2. Talent Manager browses creator catalog / checks availability
       ↓
3. Talent Manager bulk-assigns creators to shows (with optional compensation override)
       ↓
4. Show economics surface: creator costs computed per show  [Phase 5]
```

## Step-by-Step

### 1. Role assignment

An admin assigns the `TALENT_MANAGER` role to a studio membership via the admin API or system UI. This unlocks access to creator catalog, roster, availability, and show assignment endpoints.

- Feature: [RBAC Roles](../features/rbac-roles.md)
- Technical: [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md)

### 2. Creator discovery

The talent manager uses two discovery surfaces:

- **Catalog** (`GET /studios/:studioId/creators/catalog`) — all creators (rostered and non-rostered), searchable by name. Use this for browsing.
- **Availability** (`GET /studios/:studioId/creators/availability?date_from=...&date_to=...`) — creators not booked for shows in the given window. Use this when looking for free creators for a slot.

> Note: Availability is currently in **loose/discovery mode** — it filters out creators already booked for overlapping shows but does not enforce roster membership or eligibility policy. Strict mode is Phase 5 scope.

### 3. Show assignment

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

### 4. Cost visibility (Phase 5)

Once economics endpoints are built, a finance or admin user will be able to see:

- Per-show baseline cost = sum of FIXED creator costs + shift labor costs
- `COMMISSION`/`HYBRID` creators appear in the response with `null` cost (pending GMV input)

PRD: [Show Economics](../prd/show-economics.md)

## Data Flow

```
StudioMembership.role = TALENT_MANAGER
        ↓ guards
GET /creators/catalog|availability
        ↓
POST /shows/:id/creators/bulk-assign
        ↓
ShowCreator { agreedRate, compensationType, commissionRate }
        ↓  [Phase 5]
GET /shows/:id/economics  →  { creator_cost, shift_cost, total_cost }
```

## Key Business Rules

- Creators are not studio-scoped — the same creator can be assigned to shows across different studios.
- `ShowCreator.agreedRate` overrides `Creator.defaultRate`; `ShowCreator.compensationType` overrides `Creator.defaultRateType`.
- `metadata` on `ShowCreator` is for audit context only (`source`, `operator_note`, `tags`) — not executable compensation logic.
- Only `FIXED` type creators have a computable baseline cost; `COMMISSION`/`HYBRID` requires GMV input (full P&L, Phase 5 parking lot).

## Related Docs

| Layer | Document |
| --- | --- |
| Feature (RBAC) | [docs/features/rbac-roles.md](../features/rbac-roles.md) |
| Feature (Creator Mapping) | [docs/features/creator-mapping.md](../features/creator-mapping.md) |
| PRD (Economics) | [docs/prd/show-economics.md](../prd/show-economics.md) |
| Phase 4 backend index | [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md) |
| Phase 4 frontend index | [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md) |
| Role visibility model | [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md) |
