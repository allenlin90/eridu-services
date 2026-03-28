# Studio Creator Roster Backend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 1
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/studio-creator-roster.md`](../../../../docs/prd/studio-creator-roster.md)
> **Depends on**: Creator mapping foundation ✅, economics baseline inputs ✅

## Purpose

Add the studio-scoped write surface for `StudioCreator` so studio operators can manage roster membership and default compensation inputs without system-admin tooling.

## API Surface

| Endpoint | Purpose |
| --- | --- |
| `GET /studios/:studioId/creators` | List studio creator roster with compensation defaults |
| `POST /studios/:studioId/creators` | Add creator from catalog to roster |
| `PATCH /studios/:studioId/creators/:creatorId` | Update defaults or active state with optimistic concurrency |

## Persistence Plan

- Reuse the existing `StudioCreator` table; no migration required.
- Treat `isActive` as the roster gate for assignment and strict availability checks.
- Preserve `ShowCreator` history when a studio creator is deactivated.

## Service / Repository Plan

- Controller lives under `src/studios/studio-creator`.
- Service responsibilities:
  - catalog lookup for `creator_id`
  - duplicate detection / reactivation of an inactive roster row
  - validation of `defaultRate`, `defaultRateType`, `defaultCommissionRate`
  - version-guarded updates that return 409 `VERSION_CONFLICT` on stale writes
- Repository responsibilities:
  - list with creator relation included
  - find active/inactive roster row by `studioId + creatorId`
  - atomic version bump on PATCH

## Authorization

- Read: `ADMIN`, `MANAGER`, `TALENT_MANAGER`
- Write: `ADMIN`
- Use `@StudioProtected` with UID-based route params only

## Contract Notes

- API remains creator-first on the wire (`creator_id`), even though the writable record is `StudioCreator`.
- Defaults are fallbacks for economics only; they never overwrite existing `ShowCreator` overrides.
- Re-adding a previously inactive creator should restore the existing roster association instead of creating a second row.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke: add, duplicate add, restore inactive, version conflict, default-rate validation

