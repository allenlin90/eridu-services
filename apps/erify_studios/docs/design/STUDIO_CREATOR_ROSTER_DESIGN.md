# Studio Creator Roster Frontend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 1
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/studio-creator-roster.md`](../../../../docs/prd/studio-creator-roster.md)
> **Depends on**: Sidebar redesign 🔲, backend roster write APIs 🔲

## Purpose

Add the studio creator roster CRUD page so operators can manage creator roster membership and compensation defaults inside the studio app.

## Route Plan

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/creators` | Creator roster CRUD surface | `ADMIN` write, `MANAGER` + `TALENT_MANAGER` read |

## Data / Query Plan

- Query key family: `studio-creator-roster`.
- GET list uses URL-backed pagination/filter state.
- POST/PATCH mutations invalidate the studio roster list and any dependent availability/mapping queries.
- PATCH flows must send `version` and treat 409 as a refetch-and-review conflict path.

## Component Plan

- Page route container + roster table section.
- Add-from-catalog dialog.
- Inline edit or row dialog for compensation defaults and active state.
- Conflict toast for version mismatch.

## UX Rules

- Hide write actions for non-admin roles, but keep compensation fields visible.
- Keep creator-first naming and identifiers in UI copy.
- Do not expose raw `StudioCreator` bigint IDs; wire contract stays on UIDs only.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke: add, restore inactive, update defaults, version conflict, role-gated actions

