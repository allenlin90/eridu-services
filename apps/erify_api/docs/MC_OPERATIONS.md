# MC Operations — Shipped Behavior

> **Status**: ✅ Implemented (Phase 4, 2026-03-07)
> **Phase**: 4 — P&L Visibility & MC Operations

## What It Does

Enables studio-scoped MC management: assigning MCs to shows individually or in bulk, querying MC availability against the show schedule, and tracking per-show compensation agreements.

## Access Scope Clarification

- `TALENT_MANAGER` can use MC staffing and compensation endpoints (assignment, bulk assignment, availability, compensation fields on `ShowMC`).
- `TALENT_MANAGER` cannot access full financial overview endpoints (`/studios/:studioId/shows/:showId/economics`, `/studios/:studioId/economics`, `/studios/:studioId/performance`), which are manager/admin scoped in `SHOW_ECONOMICS.md`.
- Canonical role policy lives in `docs/product/ROLE_ACCESS_MATRIX.md`.

## Manager E2E (Talent + Economics)

For a manager, Phase 4 usually runs in this order:

1. Staffing
   - Assign MCs per show or in bulk.
   - Use availability API to avoid double-booking in overlapping show windows.
2. Compensation setup
   - Set MC defaults on `MC` (`defaultRateType`, `defaultRate`, `defaultCommissionRate`).
   - Override per-show values on `ShowMC` when needed (`compensationType`, `agreedRate`, `commissionRate`).
3. Performance input
   - Enter show outcomes (`gmv`, `sales`, `orders`, `viewer_count`) on ShowPlatform.
4. Financial readout
   - Per-show: `GET /studios/:studioId/shows/:showId/economics`
   - Grouped: `GET /studios/:studioId/economics?...`

`MC_OPERATIONS.md` covers staffing + compensation inputs.
`SHOW_ECONOMICS.md` covers reporting outputs and formulas.

## New Roles (RBAC)

Three roles added to `STUDIO_ROLE` in `packages/api-types/src/memberships/schemas.ts`:

| Role | Value |
|------|-------|
| `TALENT_MANAGER` | `'talent_manager'` |
| `DESIGNER` | `'designer'` |
| `MODERATION_MANAGER` | `'moderation_manager'` |

Guard usage: `@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])`

## MC Compensation Model

New nullable fields on the `MC` Prisma model (`prisma/schema.prisma`):
- `defaultRate Decimal?` — base fixed or hybrid rate
- `defaultRateType String?` — one of `FIXED | COMMISSION | HYBRID`
- `defaultCommissionRate Decimal?` — default commission percentage

New nullable fields on `ShowMC`:
- `agreedRate Decimal?` — per-show override of the MC's default rate
- `compensationType String?`
- `commissionRate Decimal?`

Compensation type constants: `packages/api-types/src/mcs/schemas.ts` (`MC_COMPENSATION_TYPE`)

Decimal fields serialize as `string | null` via `decimalToStringOrNull` (`apps/erify_api/src/lib/utils/decimal.util.ts`).

## API Endpoints

### Studio MC Show Endpoints

`apps/erify_api/src/studios/studio-show/studio-show-mc.controller.ts`

| Method | Path | Access |
|--------|------|--------|
| GET | `/studios/:studioId/shows/:showId/mcs` | All members |
| POST | `/studios/:studioId/shows/:showId/mcs` | ADMIN, MANAGER, TALENT_MANAGER |
| DELETE | `/studios/:studioId/shows/:showId/mcs/:mcId` | ADMIN, MANAGER, TALENT_MANAGER |

POST body accepts optional compensation fields: `agreed_rate`, `compensation_type`, `commission_rate`.

### Bulk MC Assignment

`apps/erify_api/src/studios/studio-show/studio-show.controller.ts`

| Method | Path | Access |
|--------|------|--------|
| PATCH | `/studios/:studioId/shows/mc-assignments/bulk` | ADMIN, MANAGER, TALENT_MANAGER |
| PUT | `/studios/:studioId/shows/mc-assignments/bulk` | ADMIN, MANAGER, TALENT_MANAGER |

Request: `{ show_ids: string[], mc_ids: string[] }`
Response: `{ created: N, skipped: N, removed: N, errors: [{ show_id, mc_id, reason }] }`

Semantics:
- `PATCH` append mode: keep existing mappings and add selected creators.
- `PUT` replace mode: overwrite selected shows to the selected creator set (remove non-selected active mappings).

Both modes are idempotent for already-matching assignments; soft-deleted assignments are restored when selected.

Orchestration service: `apps/erify_api/src/studios/studio-show/studio-show-mc.orchestration.service.ts`

### MC Availability

`apps/erify_api/src/studios/studio-mc/studio-mc.controller.ts`

| Method | Path | Access |
|--------|------|--------|
| GET | `/studios/:studioId/mcs/availability` | All members |
| GET | `/studios/:studioId/mcs/catalog` | ADMIN, MANAGER, TALENT_MANAGER |
| GET | `/studios/:studioId/mcs/roster` | ADMIN, MANAGER, TALENT_MANAGER |
| POST | `/studios/:studioId/mcs/roster` | ADMIN, MANAGER, TALENT_MANAGER |
| PATCH | `/studios/:studioId/mcs/roster/:mcId` | ADMIN, MANAGER, TALENT_MANAGER |
| DELETE | `/studios/:studioId/mcs/roster/:mcId` | ADMIN, MANAGER, TALENT_MANAGER |

Query params: `date_from`, `date_to` (ISO datetime, validated `date_to > date_from`)

Returns MCs that satisfy both constraints:
1. In active studio roster (`StudioMc`) for `:studioId`
2. Not booked on any overlapping show (`startTime < date_to AND endTime > date_from`)

Implemented in `apps/erify_api/src/models/mc/mc.repository.ts` (`findAvailableMcs`).

Catalog endpoint:
- `GET /studios/:studioId/mcs/catalog` lists searchable creator candidates.
- Default behavior excludes creators already in the studio roster.
- Optional query: `include_rostered=true`.

Roster list endpoint:
- `GET /studios/:studioId/mcs/roster` is paginated and filterable.
- Query params:
  - `page`, `limit`
  - `search` (matches MC uid/name/alias)
  - `is_active` (`true|false`)
  - `default_rate_type` (`FIXED|COMMISSION|HYBRID|NONE`)

Roster onboarding flow:
1. Search in global MC catalog (`/mcs/catalog`).
2. Add selected MC into studio roster (`POST /mcs/roster`), creating `StudioMc`.
3. Manage studio-scoped status/default compensation via roster update endpoints.

## Key Files

| File | Purpose |
|------|---------|
| `src/studios/studio-show/studio-show-mc.controller.ts` | Per-show MC endpoints |
| `src/studios/studio-show/studio-show-mc.orchestration.service.ts` | Bulk assignment orchestration |
| `src/studios/studio-mc/studio-mc.controller.ts` | Availability endpoint |
| `src/studios/studio-mc/studio-mc.module.ts` | Studio MC module |
| `src/models/mc/mc.repository.ts` | `findAvailableMcs` method |
| `src/models/show-mc/show-mc.repository.ts` | `createByUids`, `createAssignment`, `restoreAndUpdateAssignment` |
| `src/models/show-mc/show-mc.service.ts` | Service layer (calls `createByUids`) |
| `packages/api-types/src/mcs/schemas.ts` | `MC_COMPENSATION_TYPE`, `mcApiResponseSchema` |
| `packages/api-types/src/memberships/schemas.ts` | `STUDIO_ROLE` with new roles |

## Phase 4 Re-baseline Note

During verification, two gaps were identified and moved into Phase 4 close criteria:

1. Studio-scoped creator roster (`StudioMc`) is required to avoid global talent leakage in availability and staffing.
2. A dedicated creator onboarding workflow is required so studios can explicitly manage roster membership and default compensation.

Roadmap reference: `docs/roadmap/PHASE_4.md`.

## Local Iteration Workflow (Phase 4 Extension)

For schema-affecting Phase 4 iterations, use the deterministic cycle:

1. `pnpm --filter erify_api db:local:refresh`
2. Optional cross-app auth mapping:
   - `pnpm --filter erify_api db:extid:sync`
