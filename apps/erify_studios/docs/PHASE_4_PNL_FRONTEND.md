# Phase 4 P&L Frontend Feature Description

> **Status**: Completed for creator mapping foundation; economics deferred to next phase redesign
> **Phase scope**: Phase 4 P&L workstreams
> **Owner app**: `apps/erify_studios`

## Purpose

Define frontend route/UI behavior for Phase 4 mapping and baseline economics flows, aligned to backend creator-first contracts.

## Scope

### Mapping + Assignment Foundation

- Creator mapping UX for studio operations.
- Assignment flows that feed economics inputs.
- Creator-first contract adoption in query keys, route loaders, and form payloads.

### Economics Baseline

- Deferred to next phase redesign.
- Preserve forward-compatible compensation inputs without executing complex profit rules.

## Route + Screen Plan

### Mapping surfaces

| Route | Purpose | Access | Status |
| --- | --- | --- | --- |
| `/studios/$studioId/shows` | Show list with assignment entry points | ADMIN, MANAGER | Active baseline |
| `/studios/$studioId/shows/$showId/tasks` | Task assignment and execution workflow | ADMIN, MANAGER | Active baseline |
| `/studios/$studioId/creator-mapping` | Creator mapping show list with scope + creator-centric filters | ADMIN, MANAGER, TALENT_MANAGER | Active baseline |
| `/studios/$studioId/creator-mapping/$showId` | Creator mapping workflow (show-level add/remove) | ADMIN, MANAGER, TALENT_MANAGER | Active baseline |
| `/system/creators` | System creator management baseline | System admin only | Active baseline |

Implemented UI additions:

- Bulk creator assignment dialog from creator mapping show list (multi-show selection).
- Creator mapping list selection UI follows the shows bulk-action pattern (desktop floating action bar + mobile action sheet).
- Creator mapping list supports date scope defaults (next 7 days), search, and creator-centric filters (`creator_name`, `has_creators`, `show_status_name`).
- Creator list row navigation is anchored on show-name links (no per-row `Manage` action button column).
- Creator picker is backed by studio catalog + availability endpoints; roster workflows remain deferred.
- Creator picker currently uses a loose availability discovery endpoint (search-first); strict overlap enforcement is deferred.
- Compensation input fields in assignment flows where needed by economics.
- Creator mapping detail route uses the same page-shell style as show task management for consistent single-show operations.

### Economics surfaces

| Route | Purpose | Status |
| --- | --- | --- |
| `/studios/$studioId/economics` | Grouped economics summary | Deferred (next phase redesign) |
| `/studios/$studioId/performance` | Grouped performance summary | Deferred (next phase redesign) |
| `/studios/$studioId/shows/$showId` | Show-level economics drill-in | Deferred (next phase redesign) |

## API Integration Contract

Client integrations (mapping):

- `GET /studios/:studioId/creators/catalog`
- `GET /studios/:studioId/creators/roster`
- `GET /studios/:studioId/creators/availability?date_from=...&date_to=...`
- `GET /studios/:studioId/shows/:showUid/creators`
- `POST /studios/:studioId/shows/:showUid/creators/bulk-assign`
- `DELETE /studios/:studioId/shows/:showUid/creators/:creatorUid`
- `POST/PATCH /admin/show-creators` (compensation fields included)

Client integrations (economics, deferred):

- `GET /studios/:studioId/shows/:showUid/economics`
- `GET /studios/:studioId/economics`
- `GET /studios/:studioId/performance` (deferred)

## State + Query Keys

- Keep creator-first keys only (`creators`, `show-creators`, `economics`, `performance`).
- Query keys must include studio/show scope to avoid cache bleed.
- Mutation success must invalidate dependent list and detail queries.

## UX/Behavior Rules

- Assignment actions should be idempotent-safe in UI (surface skipped duplicates cleanly).
- Bulk assign result handling should map API summary fields directly: `assigned`, `skipped`, `failed[]`.
- Compensation input fields must validate ranges before submit.
- Financial values should display with consistent formatting rules across tables/cards.
- Loading/error states must be explicit for all economics cards and filters.
- Do not encode bonus/tiered/hybrid business rules in FE metadata or form glue.
- `metadata` in assignment forms is optional descriptive context only and must not drive FE calculation behavior.

## Verification Gate (frontend)

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios test`
- Manual smoke for:
  - creator assignment flows
  - creator roster/catalog driven picker behavior
  - economics/performance filters and grouping views

## Traceability

- Product intent: `docs/prd/creator-mapping.md`, `docs/prd/show-economics.md`
- Backend feature contract: `apps/erify_api/docs/PHASE_4_PNL_BACKEND.md`
- Phase tracker: `docs/roadmap/PHASE_4.md`
