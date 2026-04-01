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
- soft-delete shows with role-aware access and explicit impact warnings
- satisfy the PRD's optimistic-concurrency requirement with a real show version column

## Current-State Evaluation

The current backend is close on persistence primitives, but not on studio-owned write flow:

- `POST/PATCH/DELETE /admin/shows` already exist and reuse `ShowOrchestrationService`.
- `GET /studios/:studioId/shows*` is read-only plus creator assignment operations.
- `Show` does **not** have a `version` column, so optimistic locking is impossible today.
- `GET /studios/:studioId/shows/:id` returns the base show DTO only; it does not include platform assignments needed for editing.
- `GET /studios/:studioId/show-lookups` omits `clients` and `studio_rooms`, so studio-side forms still depend on admin/global lookups.
- The shared `@eridu/api-types/shows` contract is admin-shaped and does not express studio-scoped write DTOs.
- The PRD marks `client`, `type`, `standard`, and `status` as optional on create, but the current `Show` model requires all four relations at the database level.

## Final Design Decisions

1. `Show.version` is added in this slice.
   This is required to make the PRD's version-guarded update acceptance criteria real.

2. Studio show writes get their own DTOs.
   Do not reuse the admin `createShowWithAssignments` / `updateShowWithAssignments` payloads for studio routes.

3. Studio show management does **not** own creator assignment.
   Creator assignment remains on the existing creator-mapping surfaces. The studio show create/edit form manages metadata and platform membership only.

4. Studio platform editing is folded into the general studio show update payload.
   We will not add a separate studio-only `PATCH .../platforms/replace` endpoint in v1 because the form edits the entire show document at once.

5. Create-time required fields follow the current DB constraints, not the original PRD wording.
   Final create requirements: `name`, `start_time`, `end_time`, `client_id`, `show_type_id`, `show_standard_id`, `show_status_id`.
   Optional: `studio_room_id`, `metadata`, `platform_ids`.

6. Delete warnings use an explicit preflight endpoint.
   `DELETE` stays `204 No Content`. A separate `GET .../delete-impact` endpoint provides the counts the UI needs before confirming deletion.

7. Studio detail becomes an enriched superset response.
   `GET /studios/:studioId/shows/:showId` will include `version` and current platform assignments, while staying compatible with current read consumers that only use the base show fields.

## API Surface

| Endpoint | Purpose | Roles |
| --- | --- | --- |
| `GET /studios/:studioId/show-lookups` | Studio-safe lookup bundle for show forms | All studio members |
| `GET /studios/:studioId/shows/:showId` | Enriched show detail for read + edit | All studio members |
| `GET /studios/:studioId/shows/:showId/delete-impact` | Warning counts for delete confirmation | `ADMIN` |
| `POST /studios/:studioId/shows` | Create a studio-scoped show | `ADMIN`, `MANAGER` |
| `PATCH /studios/:studioId/shows/:showId` | Update show metadata + platform assignments with optimistic locking | `ADMIN`, `MANAGER` |
| `DELETE /studios/:studioId/shows/:showId` | Soft-delete a show | `ADMIN` |

## Shared Contract Plan

### `packages/api-types/src/shows/`

Add or update shared show contracts:

- extend `showApiResponseSchema` with `version`
- add `studioShowPlatformSummarySchema`
- add `studioShowDetailSchema`
- add `createStudioShowInputSchema`
- add `updateStudioShowInputSchema`
- add `studioShowDeleteImpactSchema`

Recommended wire shapes:

```typescript
createStudioShowInputSchema = z.object({
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
  version: z.number().int().positive(),
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
- `version` is required on update.
- `client_id`, `show_type_id`, `show_standard_id`, and `show_status_id` stay required on create because the DB model still requires them.

### `packages/api-types/src/task-management/task.schema.ts`

Extend the existing `studioShowLookupsDto` so the studio app can create/edit shows without touching admin endpoints:

- add `clients`
- add `studio_rooms`

This preserves the existing lookup route and cache family instead of adding multiple form-only endpoints.

## Database And Model Plan

### Prisma

Update `apps/erify_api/prisma/schema.prisma`:

```prisma
model Show {
  // ...
  version Int @default(1)
  // ...
}
```

Implementation note:

- generate the migration with Prisma tooling
- backfill existing rows to `1` through the generated migration
- do not hand-write the migration

### `apps/erify_api/src/models/show/schemas/show.schema.ts`

Add:

- `version` to `showSchema`
- `version` to `showDto`
- new studio-specific detail DTO that extends the base show DTO with `platforms`

Recommended response shape:

```typescript
studioShowDetailDto = showWithPlatformsSchema.transform((obj) => ({
  ...showDto.parse(obj),
  version: obj.version,
  platforms: obj.showPlatforms.map((item) => ({
    id: item.platform.uid,
    name: item.platform.name,
  })),
}));
```

## Repository And Service Plan

### `ShowRepository`

Add:

- `updateWithVersionCheck(uid, version, data, include?)`

Behavior:

1. resolve the active show first
2. `updateMany` with `where: { id, deletedAt: null, version }`
3. increment `version`
4. if `count === 0`, load current version and throw `VersionConflictError`

This should mirror the existing optimistic-locking pattern already used in `StudioCreatorRepository`.

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
- update shows through repository-level optimistic locking
- replace platform membership
- fetch enriched studio show detail
- compute delete preflight counts
- soft-delete the show and soft-delete active `ShowPlatform` / `ShowCreator` join rows

Why a dedicated service:

- studio write behavior is not the same contract as admin CRUD
- creator assignment must remain excluded from this slice
- studio scope checks should not be duplicated across controller methods

## Delete-Impact Preflight

Add a small studio-only preflight endpoint instead of overloading `DELETE`.

Recommended response:

```json
{
  "active_task_count": 3,
  "submitted_report_count": 2
}
```

Computation rules:

- `active_task_count`: tasks linked to the show and not soft-deleted, with status not in terminal states
- `submitted_report_count`: count based on the same submitted-task semantics already used by task-reporting, via a dedicated helper or repository method instead of copy-pasting status logic

If both counts are zero, the endpoint still returns `200` with zero values.

## Controller Plan

### `apps/erify_api/src/studios/studio-show/studio-show.controller.ts`

Keep existing reads. Add:

- `@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])` on create/update handlers
- `@StudioProtected([STUDIO_ROLE.ADMIN])` on delete and delete-impact handlers

Recommended handler list:

- `createShow()`
- `updateShow()`
- `getDeleteImpact()`
- `deleteShow()`

Keep read routes unchanged in path to avoid frontend route churn.

## Ordered Task List

### BE-1 Shared Contracts

- [ ] Add `version` to `showApiResponseSchema`.
- [ ] Add `createStudioShowInputSchema`.
- [ ] Add `updateStudioShowInputSchema`.
- [ ] Add `studioShowDetailSchema`.
- [ ] Add `studioShowDeleteImpactSchema`.
- [ ] Extend `studioShowLookupsDto` with `clients` and `studio_rooms`.

### BE-2 Prisma And Model Wiring

- [ ] Add `version Int @default(1)` to `Show`.
- [ ] Generate Prisma migration.
- [ ] Update `showSchema` / `showDto` transforms.
- [ ] Add studio detail DTO with platform summary.

### BE-3 Repository And Services

- [ ] Add `ShowRepository.updateWithVersionCheck()`.
- [ ] Extract shared show-platform replacement logic from the admin path.
- [ ] Add `StudioShowManagementService`.
- [ ] Add delete-impact aggregation helper.

### BE-4 Controller Wiring

- [ ] Add studio create endpoint.
- [ ] Add studio update endpoint.
- [ ] Add studio delete-impact endpoint.
- [ ] Add studio delete endpoint.
- [ ] Enrich `GET /studios/:studioId/shows/:showId`.
- [ ] Extend `GET /studios/:studioId/show-lookups`.

### BE-5 Tests

- [ ] Contract tests in `@eridu/api-types`.
- [ ] Controller tests for create/update/delete/delete-impact guards and payloads.
- [ ] Service tests for studio scope enforcement.
- [ ] Repository test for optimistic-locking conflict path.
- [ ] Regression tests proving platform sync preserves unchanged rows and restores soft-deleted rows.

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
- Admin show update remains non-versioned in the current implementation; this design adds the reusable repository primitive so admin parity can be adopted later without redesign.
- Studio room lookup support is bundled into `show-lookups` to minimize new endpoints. If room lists become too large later, split room search into a dedicated studio endpoint in a follow-up.
