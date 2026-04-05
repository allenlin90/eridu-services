# Feature: Studio Show Management

> **Status**: ✅ Implemented — Phase 4 Wave 1+
> **Workstream**: Studio self-service — show lifecycle management
> **Depends on**: None (no prerequisite features required)
> **Blocks**: Studio Schedule Management, Show Planning Export, full studio autonomy
> **Implementation refs**: [BE canonical doc](../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md), [BE controller](../../apps/erify_api/src/studios/studio-show/studio-show.controller.ts), [FE design](../../apps/erify_studios/docs/design/STUDIO_SHOW_MANAGEMENT_DESIGN.md)

## Problem

Shows are the core operational unit of every studio — they drive creator assignment, shift scheduling, task creation, and cost aggregation. Yet studios had no ability to create, update, or delete shows. Every show setup required a system admin operating through `/admin/shows`.

Studios could assign creators to shows and read show details, but could not control the show's own lifecycle — creating a confusing authority model where the studio workspace appeared to "own" shows but had no write authority over them.

## Users

| Role           | Need                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Studio Admin   | Create, update, and soft-delete shows within their studio; manage platform assignments                    |
| Studio Manager | Create and update shows as a routine operational task; cannot delete                                      |
| System Admin   | Retains cross-studio governance via `/admin/shows`; no longer required for routine studio show management |

## What Was Delivered

- `POST /studios/:studioId/shows` — studio-scoped show creation (ADMIN, MANAGER)
- `PATCH /studios/:studioId/shows/:showId` — update show metadata and platform assignments (ADMIN, MANAGER)
- `DELETE /studios/:studioId/shows/:showId` — soft-delete a pre-start show (ADMIN only)
- `GET /studios/:studioId/shows/:showId` — enriched show detail including platform assignments and schedule summary for the edit form
- `GET /studios/:studioId/shows` — shared list with orphan-friendly filtering (has_schedule signal)
- `GET /studios/:studioId/show-lookups` — extended to include clients, studio rooms, and schedules for the create/edit form
- Restore-on-create: if create includes an `external_id` matching a soft-deleted show, that record is restored and updated from the latest payload without reviving old workflow state
- Pre-start delete clears disposable task workflow records so restore behaves like a new lifecycle
- Schedule linkage validated for same-studio and same-client consistency

## Key Product Decisions

- **Studio-scoped creation** — shows are always created within the studio context; the studio FK is forced from the route, not from the request body.
- **Restore by `externalId`** — when create includes an `external_id` that matches a soft-deleted show identity, the system restores that row, applies the latest payload, and treats the record as a new operational lifecycle rather than reviving old workflow state.
- **Last-write-wins for v1** — no optimistic locking while studio CRUD and Google Sheets publish coexist. If concurrent edits become common, revisit with a concurrency token strategy.
- **Schedule is a frontend constraint, not a DB rule** — `scheduleId` stays nullable in the backend contract; the studio CRUD UX should require schedule selection in the normal flow and expose orphan-show detection/repair in the shows table.
- **Schedule linkage preserves client consistency** — a show can only attach to schedules owned by the same studio and the same client.
- **Schedule publish can reclaim restored rows** — schedule publish matches active rows by external identity, adopts valid restored/manual rows, and replaces creator/platform assignments from schedule data when available.
- **Platform assignment at studio level** — platforms are operational metadata that studios manage day-to-day; no reason to keep this admin-only.
- **Pre-start delete only, pre-start workflow state is disposable** — the show row is soft-deleted and pre-start task workflow records are removed so restore does not revive stale tasks.
- **Separate FE purpose-built views** — show CRUD lives on a dedicated show-management list page; task generation/readiness/assignment stay on the existing show-operations page. Both reuse the same backend endpoints and cache families.
- **No show transfer** — shows belong to one studio; cross-studio movement is a governance action for system admins only.

## Acceptance Record

- [x] Studio ADMIN and MANAGER can create shows scoped to their studio from `/studios/$studioId/shows`.
- [x] Studio create/update API accepts optional `schedule_id`, while the studio app requires a schedule in the normal create/edit UX.
- [x] Studio create restores a soft-deleted show when the payload carries the same `external_id`, and the restored record follows the latest payload for mutable fields and schedule linkage.
- [x] Restore treats the show as a new lifecycle: old task workflow state is not resumed.
- [x] Studio ADMIN and MANAGER can update show details (name, times, client, type, standard, status, room, metadata).
- [x] Studio ADMIN can soft-delete shows before start time.
- [x] Studio ADMIN and MANAGER can manage platform assignments on shows.
- [x] Studio ADMIN and MANAGER can assign a show to a same-studio, same-client schedule, move it between schedules, or clear its schedule linkage.
- [x] The studio shows page can identify orphan shows with no schedule so operators can repair schedule linkage.
- [x] Shows are automatically scoped to the studio from the route — no cross-studio creation.
- [x] Studio update follows explicit last-write-wins behavior in v1, and the known overwrite risk is documented.
- [x] Schedule status is visible in studio show responses, but does not hard-block same-studio show reassociation.
- [x] Pre-start studio delete removes dependent workflow records so restore does not revive stale tasks/targets.
- [x] All existing read endpoints and creator assignment flows remain unchanged.
- [x] `/admin/shows` retains full capability for system admins.
- [x] MEMBER role cannot create/update/delete shows (403).
- [x] Soft-deleted shows are excluded from studio show list.

## Forward References

- Backend canonical doc: [STUDIO_SHOW_MANAGEMENT.md](../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md)
- Related feature: [Studio Schedule Management](../prd/studio-schedule-management.md) (planned — reuses the show-to-schedule relation)
- Related feature: [Show Planning Export](../prd/show-planning-export.md) (planned — studio-owned shows feed into planning export)
