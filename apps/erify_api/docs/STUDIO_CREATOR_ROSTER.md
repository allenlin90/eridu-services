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
| `GET /studios/:studioId/creators/:creatorId/compensations` | List one creator's per-show compensation over a date range |
| `PATCH /studios/:studioId/shows/:showId/creators/:showCreatorId` | Update one `ShowCreator` assignment compensation snapshot |

Shared contracts come from `packages/api-types/src/studio-creators/schemas.ts`.

### Validation invariants

`updateStudioCreatorRosterInputSchema` and `updateStudioShowCreatorInputSchema` enforce the cross-field rule between compensation type and the rate fields via `superRefine`:

- `compensation_type === 'FIXED'` → `commission_rate` (and `default_commission_rate`) must be `null`.
- `compensation_type` is `'COMMISSION'` or `'HYBRID'` → commission rate cannot be `null`.
- `compensation_type === null` → commission rate must be `null`.

These mirror the calculator assumptions documented in [`docs/domain/economics-cost-model.md`](../../../docs/domain/economics-cost-model.md#cross-field-validation-invariants). FE forms must clear the irrelevant rate field on type change rather than submitting stale `0`/`0.00` values; canonical helpers live at `apps/erify_studios/src/features/studio-show-creators/lib/show-creator-assignment-terms.ts` and `apps/erify_studios/src/features/studio-creator-roster/lib/studio-creator-compensation.ts`. The `frontend-ui-components` skill has the form pattern.

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
- Roster/default write routes use `@StudioProtected([ADMIN, MANAGER, TALENT_MANAGER])`.
- Use shared Zod DTOs plus `UidValidationPipe` for `studioId` and `creatorId`.
- `GET /creators` returns paginated roster results using the existing list query DTO (`search`, `is_active`, `default_rate_type`, pagination).
- `POST /creators` accepts the shared add payload, then returns the roster item DTO for the created or reactivated row.
- `PATCH /creators/:creatorId` accepts the shared update payload and returns the updated roster item DTO.
- `GET /creators/:creatorId/compensations` accepts `date_from` / `date_to`, verifies the creator belongs to the studio roster, and returns show assignment rows with base, adjustment, total, and unresolved reason fields. Mirrors the noun sub-resource shape used by `GET /members/:memberId/compensations` (see `backend-controller-pattern-nestjs`).
- `PATCH /shows/:showId/creators/:showCreatorId` validates studio/show scope before updating `ShowCreator.note`, `agreedRate`, `compensationType`, `commissionRate`, and override audit entries.

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
- Per-show assignment edits update only `ShowCreator` snapshot fields and write standard override audit entries when monetary terms change.
- Re-adding a previously inactive creator should restore the existing roster association instead of creating a second row.
- No compatibility alias is retained for `/creators/roster`.

## Google Sheets Roster Sync (Read-Only Export)

- `GET google-sheets/studios/:studioId/creators` (`src/google-sheets/creators/google-sheets-creator.controller.ts`) exports the active roster, one row per active `StudioCreator`, for the Apps Script `syncMCRoster()` job (`manual-test/apps-script/SyncMCRoster.js`) to write into the `mc_users` sheet tab and the `config` sheet's MC dropdown list.
- Uses the shared `google-sheets/*` API-key auth (`@GoogleSheets()` / `BaseGoogleSheetsController`), same as `GoogleSheetsScheduleController` — no JWT, no `@StudioProtected`.
- `StudioCreatorService.listActiveRosterWithLinkedUsers(studioUid)` owns the mapping/business logic (camelCase payload); the controller only renames keys to the sheet's snake_case columns and formats dates. `StudioCreatorRepository.findActiveRosterWithUser(studioUid)` holds the query (active roster + non-deleted studio/creator, with the creator's linked `user`).
- A soft-deleted linked `User` is nulled out in the service (not filterable at the query level — Prisma does not support `where` inside `include`/`select` for the to-one `Creator.user` relation), so their PII never reaches the sheet.
- The export is scoped to fields `erify_api` itself owns: `ext_id`, `name`, `email`, `image`, `created_at`, `updated_at`, `banned` (`User.isBanned`), `mc_name`, `mc_id`, `user_id`. `role`, `email_verified`, `ban_reason`, and `ban_expires` live in `eridu_auth`'s own schema — `erify_api` has no access to them, so they are intentionally not part of this contract rather than faked or read from `User.metadata` guesswork.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke: add, duplicate add, restore inactive, version conflict, default-rate validation, inactive creator excluded from availability, inactive creator rejected by bulk assign
