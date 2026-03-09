# Creator Mapping UI — Shipped Behavior

> **Status**: ✅ Implemented (Phase 4, 2026-03-07)
> **Phase**: 4 — P&L Visibility & Creator Operations

## What It Does

Allows studio staff to assign creators to shows individually or in bulk, view currently assigned creators on a show, and remove assignments — with real-time availability filtering to avoid booking conflicts.

Creators workflows are split into:
- roster management on `/creators`
- show mapping on `/creators/mapping`

## Feature Location

`apps/erify_studios/src/features/studio-show-creators/`

```
api/
  get-show-creators.ts          — GET /studios/:studioId/shows/:showId/creators
  add-show-creator.ts           — POST /studios/:studioId/shows/:showId/creators
  remove-show-creator.ts        — DELETE /studios/:studioId/shows/:showId/creators/:creatorId
  get-creator-availability.ts   — GET /studios/:studioId/creators/availability
  bulk-assign-creators.ts       — PATCH/PUT /studios/:studioId/shows/creator-assignments/bulk (append/replace)
hooks/
  use-show-creators.ts          — composes query + add + remove into one hook
components/
  show-creator-list.tsx          — list of assigned creators with inline remove + confirmation dialog
  add-creator-dialog.tsx         — Creator picker using availability endpoint filtered to show's time window
  bulk-creator-assign-dialog.tsx — multi-show + multi-creator bulk assignment dialog
```

## Routes

| Route | File | Description |
|-------|------|-------------|
| `/studios/$studioId/shows/$showId/creators` | `src/routes/studios/$studioId/shows/$showId/creators.tsx` | Per-show creator management |
| `/studios/$studioId/creators` | `src/routes/studios/$studioId/creators/index.tsx` | Roster onboarding and studio-scoped creator listing |
| `/studios/$studioId/creators/mapping` | `src/routes/studios/$studioId/creators/mapping.tsx` | Bulk creator-to-show mapping |

## Entry Points

- **Creator Roster**: `/studios/$studioId/creators` for onboarding and roster maintenance.
- **Creator Mapping**: `/studios/$studioId/creators/mapping` for bulk mapping workflows.
- **Show creator list**: rendered on the show detail creators route
- **Bulk assign**: triggered from the shows list floating action bar ("Assign Creators" button appears when shows are selected)

Roster page behavior:
- Roster table uses the shared paginated table UX (search + advanced filters).
- Search source for onboarding is global creator catalog (`/studios/:studioId/creators/catalog`).
- Adding from catalog creates/updates studio membership (`StudioMc`) in `/studios/:studioId/creators/roster`.
- Roster onboarding UX shows explicit selected creator state and clear/reset action before submit.
- Table empty states are search-aware (explicit "no results for query" feedback).

## Query Keys

| Key | Invalidated by |
|-----|---------------|
| `['studio-show-creators', studioId, showId]` | add, remove, bulk assign |
| `['creator-availability', studioId, dateFrom, dateTo]` | not invalidated (search-driven) |
| `['studio-shows', studioId]` | bulk assign |

## Availability Filtering

`AddCreatorDialog` passes the show's `start_time` / `end_time` as `date_from` / `date_to` to the availability endpoint. The picker only includes creators who are both:
- active in the selected studio roster
- not booked on overlapping shows

`BulkCreatorAssignDialog` preloads availability + existing assignments and supports two explicit bulk modes:
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
- Show detail canonical route is `/studios/$studioId/shows/$showId/creators`.
- Backend route is `/shows/:showId/creators` (canonical).
- System admin canonical route is `/system/creators`.
