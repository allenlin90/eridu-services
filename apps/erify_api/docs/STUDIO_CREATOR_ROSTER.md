# Studio Creator Roster Backend Reference

> **Status**: ✅ Implemented
> **Phase scope**: Phase 4 Wave 1
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/features/studio-creator-roster.md`](../../../docs/features/studio-creator-roster.md)
> **Depends on**: Creator mapping foundation ✅, economics fallback contract alignment ✅, economics merge to `master` ⏸️ not required

## Purpose

Technical reference for the shipped studio-scoped `StudioCreator` roster surface. This covers the route cutover, DTO contract, persistence rules, optimistic concurrency behavior, and assignment enforcement tied to inactive roster state.

## Route Cutover

- Controller stays at `src/studios/studio-creator/studio-creator.controller.ts` under `Controller('studios/:studioId/creators')`.
- `GET /studios/:studioId/creators/roster` is removed in this workstream.
- Canonical roster surface becomes:
  - `GET /studios/:studioId/creators`
  - `POST /studios/:studioId/creators`
  - `PATCH /studios/:studioId/creators/:creatorId`
- `catalog` and `availability` remain under the same controller namespace:
  - `GET /studios/:studioId/creators/catalog`
  - `GET /studios/:studioId/creators/availability`

## API Surface And DTOs

| Endpoint | Purpose |
| --- | --- |
| `GET /studios/:studioId/creators` | List studio creator roster with compensation defaults |
| `POST /studios/:studioId/creators` | Add creator from catalog to roster |
| `PATCH /studios/:studioId/creators/:creatorId` | Update defaults or active state with optimistic concurrency |

Shared contracts come from `packages/api-types/src/studio-creators/schemas.ts`.

Implemented contract updates:

- add `STUDIO_CREATOR_ROSTER_ERROR`
- make `default_rate` non-negative instead of strictly positive
- require `version` on PATCH only
- remove `is_active` from POST
- enforce compensation cross-field rules:
  - `FIXED` => `default_commission_rate` absent or null
  - `COMMISSION` => `default_commission_rate` required
  - `HYBRID` => `default_commission_rate` required
- extend creator catalog items with `roster_state: 'NONE' | 'ACTIVE' | 'INACTIVE'`
- keep `is_rostered` for compatibility

The list response stays based on the existing studio-creator roster item and may expose both:

- `id` => `StudioCreator.uid`
- `creator_id` => `Creator.uid`

`PATCH :creatorId` is creator-first on the wire. The controller validates a creator UID and the service resolves the unique row by `studioUid + creatorUid`.

## Persistence

- Reuse the existing `StudioCreator` table; no migration required.
- `StudioCreator.defaultRate/defaultRateType/defaultCommissionRate` are the studio-scoped fallback cost inputs.
- `StudioCreator.isActive` is the v1 roster gate for discovery and assignment writes.
- Preserve `ShowCreator` history when a studio creator is deactivated.
- Do not implement full `NOT_IN_ROSTER` enforcement in this PR. That stays in creator-availability hardening.

## Controller

- Read route uses `@StudioProtected([ADMIN, MANAGER, TALENT_MANAGER])`.
- Write routes use `@StudioProtected([ADMIN])`.
- Use shared Zod DTOs plus `UidValidationPipe` for `studioId` and `creatorId`.
- `GET /creators` returns paginated roster results using the existing list query DTO (`search`, `is_active`, `default_rate_type`, pagination).
- `POST /creators` accepts the shared add payload, then returns the roster item DTO for the created or reactivated row.
- `PATCH /creators/:creatorId` accepts the shared update payload and returns the updated roster item DTO.

## Service

Service lives in `src/models/studio-creator/studio-creator.service.ts`.

Required methods:

- `listRoster(params)` => pass-through paginated list, active by default unless `is_active` filter supplied
- `addCreatorToRoster(studioUid, payload)` => validate creator exists, create or reactivate row, detect duplicate active row
- `updateRosterEntry(studioUid, creatorUid, payload)` => resolve current row, apply optimistic lock, update defaults and `isActive`
- `findRosterEntry(studioUid, creatorUid)` => internal lookup for assignment and controller flows

Business rules:

- POST on an inactive row reactivates the existing `StudioCreator` row and updates its defaults instead of creating a duplicate
- active duplicate add returns 409 `CREATOR_ALREADY_IN_ROSTER`
- missing creator catalog record returns 404 `CREATOR_NOT_FOUND`
- version mismatch returns 409 `VERSION_CONFLICT`
- service owns domain error mapping from repository and orchestration failures; controller stays transport-only

## Repository

Repository lives in `src/models/studio-creator/studio-creator.repository.ts`.

Required methods:

- `findByStudioUidPaginated(params)` => existing list method, with default active filter behavior preserved at the service boundary
- `findByStudioUidAndCreatorUid(studioUid, creatorUid)` => include creator relation and current version/isActive/defaults
- `createRosterEntry(data)` => insert new `StudioCreator`
- `reactivateRosterEntry(uid, data)` => update inactive row to `isActive=true`, replace defaults, bump version
- `updateWithVersionCheck(studioUid, creatorUid, version, data)` => atomic update keyed by `(studioId, creatorId, version)` and map zero-row update to `VersionConflictError`

Implementation notes:

- keep Prisma-specific filtering and relation includes inside the repository
- use the existing `@@unique([studioId, creatorId])` for lookup/update targeting
- prefer atomic version checks in the repository over service-side compare-then-update

## Catalog And Availability Alignment

`CreatorRepository.findCatalogForStudio` must:

- keep `is_rostered` for current consumers
- add `roster_state`
- support `include_rostered=true` so the add dialog can show inactive rows as reactivation candidates

`CreatorRepository.findAvailableForStudioWindow` must now exclude creators with an inactive `StudioCreator` row for the studio.

This is still loose/discovery mode:

- overlap conflicts are still the primary availability rule
- creators with no studio roster row are still discoverable
- only inactive studio roster rows are excluded now

## Assignment Write Enforcement

`ShowOrchestrationService.bulkAssignCreatorsToShow` must reject creators whose studio roster row exists but is inactive.

Behavior:

- active roster row => allowed
- no roster row => still allowed in v1
- inactive roster row => reject that creator in the `failed` array with a stable reason/code path

This keeps the API aligned with the product rule that inactive creators cannot be assigned even if the caller bypasses the UI.

## Authorization

- Read: `ADMIN`, `MANAGER`, `TALENT_MANAGER`
- Write: `ADMIN`
- Use `@StudioProtected` with UID-based route params only

## Contract Notes

- API remains creator-first on the wire (`creator_id`), even though the writable record is `StudioCreator`.
- Defaults are studio-scoped fallbacks for economics only; they never overwrite existing `ShowCreator` overrides.
- Re-adding a previously inactive creator should restore the existing roster association instead of creating a second row.
- No compatibility alias is retained for `/creators/roster`.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke: add, duplicate add, restore inactive, version conflict, default-rate validation, inactive creator excluded from availability, inactive creator rejected by bulk assign
