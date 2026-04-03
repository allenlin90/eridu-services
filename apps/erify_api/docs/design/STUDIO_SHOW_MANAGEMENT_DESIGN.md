# Studio Show Management — Backend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 1+
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/studio-show-management.md`](../../../../docs/prd/studio-show-management.md)
> **Depends on**: Existing studio show reads ✅, existing admin show CRUD ✅

## Purpose

Ship studio-owned show lifecycle management without reusing `/admin/shows`:

- create studio-scoped shows from the studio workspace
- update show metadata and platform assignments inside the same studio boundary
- soft-delete shows before start time under a simple studio-side business rule
- keep the write flow simple while accepting last-write-wins behavior for this slice

## Current-State Evaluation

The current backend is close on persistence primitives, but not on studio-owned write flow:

- `POST/PATCH/DELETE /admin/shows` already exist and reuse `ShowOrchestrationService`.
- `GET /studios/:studioId/shows*` is read-only plus creator assignment operations.
- `GET /studios/:studioId/shows/:id` returns the base show DTO only; it does not include platform assignments needed for editing.
- `GET /studios/:studioId/show-lookups` omits `clients` and `studio_rooms`, so studio-side forms still depend on admin/global lookups.
- The shared `@eridu/api-types/shows` contract is admin-shaped and does not express studio-scoped write DTOs.
- The PRD marks `client`, `type`, `standard`, and `status` as optional on create, but the current `Show` model requires all four relations at the database level.
- The current dominant show-write path is still schedule-driven batch publishing from Google Sheets, so manual studio CRUD is not the primary concurrency hotspot today.

## Final Design Decisions

1. Studio show updates use last-write-wins in this slice.
   We will not add a `Show.version` column or `updated_at` compare-and-swap token for v1 studio CRUD.

2. Studio show writes get their own DTOs.
   Do not reuse the admin `createShowWithAssignments` / `updateShowWithAssignments` payloads for studio routes.

3. Studio show management does **not** own creator assignment.
   Creator assignment remains on the existing creator-mapping surfaces. The studio show create/edit form manages metadata and platform membership only.

4. Studio platform editing is folded into the general studio show update payload.
   We will not add a separate studio-only `PATCH .../platforms/replace` endpoint in v1 because the form edits the entire show document at once.

5. Create-time required fields follow the current DB constraints, not the original PRD wording.
   Final create requirements: `name`, `start_time`, `end_time`, `client_id`, `show_type_id`, `show_standard_id`, `show_status_id`.
   Optional: `external_id`, `studio_room_id`, `metadata`, `platform_ids`.

6. Studio delete uses a hard time gate, not a warning/preflight flow.
   A studio admin can delete a show only when `now < show.startTime`. If the show has started, the delete call returns a business error.

7. Create restores by external identity.
   If create receives an `external_id` and a soft-deleted show already exists under the same unique identity, restore that row and apply the latest payload instead of inserting a new show record.

8. Studio detail becomes an enriched superset response.
   `GET /studios/:studioId/shows/:showId` will include current platform assignments needed by the edit form, while staying compatible with current read consumers that only use the base show fields.

## API Surface

| Endpoint | Purpose | Roles |
| --- | --- | --- |
| `GET /studios/:studioId/show-lookups` | Studio-safe lookup bundle for show forms | All studio members |
| `GET /studios/:studioId/shows/:showId` | Enriched show detail for read + edit | All studio members |
| `GET /studios/:studioId/shows` | Shared show list/read model for CRUD and operations surfaces | All studio members |
| `POST /studios/:studioId/shows` | Create a studio-scoped show | `ADMIN`, `MANAGER` |
| `PATCH /studios/:studioId/shows/:showId` | Update show metadata + platform assignments | `ADMIN`, `MANAGER` |
| `DELETE /studios/:studioId/shows/:showId` | Soft-delete a pre-start show | `ADMIN`, `MANAGER` |

Design note:

- the backend does **not** split CRUD and operations into separate endpoint families
- FE may present separate pages, but both pages should reuse the same studio show read APIs and cache families
- `GET /studios/:studioId/shows` stays a shared superset read model; page-specific filters, defaults, and presentation rules stay in FE route state rather than creating a second backend list endpoint

## Shared Contract Plan

### `packages/api-types/src/shows/`

Add or update shared show contracts:

- add `studioShowPlatformSummarySchema`
- add `studioShowDetailSchema`
- add `createStudioShowInputSchema`
- add `updateStudioShowInputSchema`

Recommended wire shapes:

```typescript
createStudioShowInputSchema = z.object({
  external_id: z.string().min(1).optional(),
  name: z.string().min(1),
  start_time: z.iso.datetime(),
  end_time: z.iso.datetime(),
  client_id: clientUidSchema,
  show_type_id: showTypeUidSchema,
  show_standard_id: showStandardUidSchema,
  show_status_id: showStatusUidSchema,
  studio_room_id: studioRoomUidSchema.nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  platform_ids: z.array(platformUidSchema).default([]),
});

updateStudioShowInputSchema = z.object({
  name: z.string().min(1).optional(),
  start_time: z.iso.datetime().optional(),
  end_time: z.iso.datetime().optional(),
  client_id: clientUidSchema.optional(),
  show_type_id: showTypeUidSchema.optional(),
  show_standard_id: showStandardUidSchema.optional(),
  show_status_id: showStatusUidSchema.optional(),
  studio_room_id: studioRoomUidSchema.nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  platform_ids: z.array(platformUidSchema).optional(),
});
```

Notes:

- `platform_ids` is final for the studio contract. This keeps the studio form scoped to assignment membership, not admin-only platform metadata.
- `external_id` is optional. When present, it is used for restore-on-create identity matching.
- `client_id`, `show_type_id`, `show_standard_id`, and `show_status_id` stay required on create because the DB model still requires them.

### `packages/api-types/src/task-management/task.schema.ts`

Extend the existing `studioShowLookupsDto` so the studio app can create/edit shows without touching admin endpoints:

- add `clients`
- add `studio_rooms`

This preserves the existing lookup route and cache family instead of adding multiple form-only endpoints.

## Model Plan

### `apps/erify_api/src/models/show/schemas/show.schema.ts`

Add:

- new studio-specific detail DTO that extends the base show DTO with `platforms`

Recommended response shape:

```typescript
studioShowDetailDto = showWithPlatformsSchema.transform((obj) => ({
  ...showDto.parse(obj),
  platforms: obj.showPlatforms.map((item) => ({
    id: item.platform.uid,
    name: item.platform.name,
  })),
}));
```

## Repository And Service Plan

### `ShowRepository`

Add:

- `updateStudioManagedShow(uid, data, include?)`
- `findDeletedByExternalIdentity(clientUid, externalId, studioUid?)`
- `restoreByUid(uid, data, include?)`

Behavior:

1. resolve the active studio-scoped show
2. update the mutable show fields directly
3. return the latest persisted row

Non-goal:

- this slice does not attempt to detect concurrent overwrite conflicts for manual studio edits

### Restore-On-Create Rule

Create flow should support soft-delete recovery by external identity.

Recommended rule:

```text
createShow(studioUid, payload)
1. if payload.externalId is absent -> normal create
2. look up a soft-deleted show by the external identity key
3. if not found -> normal create
4. if found -> restore that row, clear deletedAt, and overwrite mutable fields from the latest payload
5. sync platform assignments from the latest payload
```

Identity key:

- existing schema suggests `clientId + externalId` as the stable unique pair
- studio scoping should still be validated during restore so a studio route cannot restore a show into a different studio

Mutable fields updated on restore:

- `name`
- `startTime`
- `endTime`
- `studioId`
- `studioRoomId`
- `showTypeId`
- `showStatusId`
- `showStandardId`
- `metadata`

Non-goal:

- this is restore-on-create for deleted rows, not a general upsert for active rows

### `ShowPlatformService` Or Shared Platform Sync Helper

Extract or add a reusable platform-replacement path that accepts:

- `showId`
- `platformIds`

Required semantics:

- keep unchanged assignments intact
- restore previously soft-deleted assignments when re-added
- soft-delete removed assignments
- create new assignments with empty metadata and null link fields

This logic should become reusable by both admin and studio flows so platform sync behavior does not diverge.

### New `StudioShowManagementService`

Add a studio-scoped orchestration service under `apps/erify_api/src/studios/studio-show/`.

Responsibilities:

- resolve and validate studio scope
- create shows with `studioId` forced from the route
- restore soft-deleted shows by `external_id` when applicable
- update shows through a simple last-write-wins path
- replace platform membership
- fetch enriched studio show detail
- soft-delete the show and soft-delete active `ShowPlatform` / `ShowCreator` join rows when the show has not started yet

Why a dedicated service:

- studio write behavior is not the same contract as admin CRUD
- creator assignment must remain excluded from this slice
- studio scope checks should not be duplicated across controller methods

## Delete Rule

Studio delete is allowed only when the show has not started yet.

Recommended service rule:

```text
deleteShow(studioUid, showUid)
1. load the studio-scoped show
2. if show.startTime <= now, throw SHOW_ALREADY_STARTED
3. soft-delete the show
4. soft-delete active ShowPlatform and ShowCreator join rows
```

Why this rule:

- it matches the current business decision cleanly
- it avoids ambiguous warning UX
- it aligns with the idea that historical or in-progress shows should not be studio-deleted

## Controller Plan

### `apps/erify_api/src/studios/studio-show/studio-show.controller.ts`

Keep existing reads. Add:

- `@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])` on create/update handlers
- `@StudioProtected([STUDIO_ROLE.ADMIN])` on delete handlers

Recommended handler list:

- `createShow()`
- `updateShow()`
- `deleteShow()`

Keep read routes unchanged in path to avoid frontend route churn.

## Ordered Task List

### BE-1 Shared Contracts

- [ ] Add `createStudioShowInputSchema`.
- [ ] Add `updateStudioShowInputSchema`.
- [ ] Add `studioShowDetailSchema`.
- [ ] Extend `studioShowLookupsDto` with `clients` and `studio_rooms`.
- [ ] Add optional `external_id` to the studio create contract.

### BE-2 Model Wiring

- [ ] Update `showSchema` / `showDto` transforms.
- [ ] Add studio detail DTO with platform summary.

### BE-3 Repository And Services

- [ ] Add `ShowRepository.updateStudioManagedShow()`.
- [ ] Add repository helpers for restore-by-external-identity.
- [ ] Extract shared show-platform replacement logic from the admin path.
- [ ] Add `StudioShowManagementService`.
- [ ] Add pre-start delete validation with `SHOW_ALREADY_STARTED`.
- [ ] Add restore-on-create behavior for soft-deleted shows with matching `external_id`.

### BE-4 Controller Wiring

- [ ] Add studio create endpoint.
- [ ] Add studio update endpoint.
- [ ] Add studio delete endpoint.
- [ ] Enrich `GET /studios/:studioId/shows/:showId`.
- [ ] Extend `GET /studios/:studioId/show-lookups`.

### BE-5 Tests

- [ ] Contract tests in `@eridu/api-types`.
- [ ] Controller tests for create/update/delete guards and payloads.
- [ ] Service tests for studio scope enforcement.
- [ ] Repository tests for last-write-wins update behavior.
- [ ] Regression tests proving platform sync preserves unchanged rows and restores soft-deleted rows.
- [ ] Delete tests proving started shows return `SHOW_ALREADY_STARTED`.
- [ ] Create tests proving a soft-deleted show is restored by `external_id` and updated from the latest payload.

## Verification

- `pnpm --filter @eridu/api-types lint`
- `pnpm --filter @eridu/api-types typecheck`
- `pnpm --filter @eridu/api-types test`
- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api test`
- `pnpm --filter erify_api build`

## Risks And Follow-Ups

- The PRD's original "name/time-only create" wording is intentionally narrowed here to match the current non-null schema. If product still wants ultra-light create, that needs a separate reference-data/defaults decision.
- Studio show updates intentionally use last-write-wins. A manual studio edit can be overwritten by another later studio edit or by a schedule-driven publish/import flow while Google Sheets remains the dominant source of show records.
- If manual studio editing becomes common enough to create real overwrite pain, revisit this slice with a dedicated concurrency token strategy rather than retrofitting hidden heuristics.
- Studio room lookup support is bundled into `show-lookups` to minimize new endpoints. If room lists become too large later, split room search into a dedicated studio endpoint in a follow-up.
