# MC Mapping UI — Shipped Behavior

> **Status**: ✅ Implemented (Phase 4, 2026-03-07)
> **Phase**: 4 — P&L Visibility & MC Operations

## What It Does

Allows studio staff to assign MCs to shows individually or in bulk, view currently assigned MCs on a show, and remove assignments — with real-time availability filtering to avoid booking conflicts.

Creators workflows are split into:
- roster management on `/creators`
- show mapping on `/creators/mapping`

## Feature Location

`apps/erify_studios/src/features/studio-show-mcs/`

```
api/
  get-show-mcs.ts          — GET /studios/:studioId/shows/:showId/creators
  add-show-mc.ts           — POST /studios/:studioId/shows/:showId/creators
  remove-show-mc.ts        — DELETE /studios/:studioId/shows/:showId/creators/:creatorId
  get-mc-availability.ts   — GET /studios/:studioId/creators/availability
  bulk-assign-mcs.ts       — PATCH/PUT /studios/:studioId/shows/mc-assignments/bulk (append/replace)
hooks/
  use-show-mcs.ts          — composes query + add + remove into one hook
components/
  show-mc-list.tsx          — list of assigned MCs with inline remove + confirmation dialog
  add-mc-dialog.tsx         — MC picker using availability endpoint filtered to show's time window
  bulk-mc-assign-dialog.tsx — multi-show + multi-MC bulk assignment dialog
```

## Routes

| Route | File | Description |
|-------|------|-------------|
| `/studios/$studioId/shows/$showId/mcs` | `src/routes/studios/$studioId/shows/$showId/mcs.tsx` | Per-show MC management |
| `/studios/$studioId/creators` | `src/routes/studios/$studioId/creators/index.tsx` | Roster onboarding and studio-scoped creator listing |
| `/studios/$studioId/creators/mapping` | `src/routes/studios/$studioId/creators/mapping.tsx` | Bulk creator-to-show mapping |

## Entry Points

- **Creator Roster**: `/studios/$studioId/creators` for onboarding and roster maintenance.
- **Creator Mapping**: `/studios/$studioId/creators/mapping` for bulk mapping workflows.
- **Show MC list**: rendered on the show detail MCs route
- **Bulk assign**: triggered from the shows list floating action bar ("Assign MCs" button appears when shows are selected)

Roster page behavior:
- Roster table uses the shared paginated table UX (search + advanced filters).
- Search source for onboarding is global creator catalog (`/studios/:studioId/creators/catalog`).
- Adding from catalog creates/updates studio membership (`StudioMc`) in `/studios/:studioId/creators/roster`.
- Roster onboarding UX shows explicit selected creator state and clear/reset action before submit.
- Table empty states are search-aware (explicit "no results for query" feedback).

## Query Keys

| Key | Invalidated by |
|-----|---------------|
| `['studio-show-mcs', studioId, showId]` | add, remove, bulk assign |
| `['mc-availability', studioId, dateFrom, dateTo]` | not invalidated (search-driven) |
| `['studio-shows', studioId]` | bulk assign |

## Availability Filtering

`AddMcDialog` passes the show's `start_time` / `end_time` as `date_from` / `date_to` to the availability endpoint. The picker only includes creators who are both:
- active in the selected studio roster
- not booked on overlapping shows

`BulkMcAssignDialog` preloads availability + existing assignments and supports two explicit bulk modes:
- `Append` (`PATCH`) keeps existing mappings and adds selected creators.
- `Replace` (`PUT`) overwrites selected shows to the selected creator set.

The dialog includes:
- mode selector (append vs replace)
- existing creator summary grouped by mode context (append/replace), with concise per-creator show counts
- selected creator badges
- impact preview (`Add`, `Unchanged`, and `Remove` in replace mode)

## Member Roster UX (Task Assignment Domain)

`/studios/$studioId/members` uses the same paginated table pattern for consistency:
- invite member flow (search existing system users via combobox and add into studio membership with role)
- searchable member list (name/email)
- role management (`Change Role`) for existing studio members (admin-only, explicit confirm action)
- explicit role-default state for `ADMIN`/`MANAGER`
- explicit helper-eligibility toggle actions (`Enable Helper` / `Disable Helper`) for eligible non-default roles

Known issue:
- Invite flow currently requires `user_id` (`usr_*`) input instead of searchable user lookup.
- Keep current approach for now; defer optimization/refactor (indexed search/cache/fulltext strategy) to follow-up iteration.
Legacy compatibility:
- Show detail route currently remains `/studios/$studioId/shows/$showId/mcs` (UI path compatibility).
- Backend accepts both `/shows/:showId/creators` (canonical) and `/shows/:showId/mcs` (legacy alias).
- System admin canonical route is `/system/creators`.
- Legacy `/system/mcs` route remains as a redirect alias for compatibility.
