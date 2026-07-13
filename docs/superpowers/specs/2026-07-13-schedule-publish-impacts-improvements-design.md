# Schedule Publish Impacts — Filters, Batch Runs, and Accurate Summaries

**Date**: 2026-07-13
**Status**: Approved design, pending implementation plan
**Scope**: `apps/erify_studios` (`/studios/:studioId/schedule-publish-impacts`), `apps/erify_api` (`studio-show` domain, `Audit`/`AuditRepository`), `packages/api-types`

## Problem

The Schedule Publish Impacts page lets studio managers review shows affected by a schedule republish (typically driven by a Google Sheets sync). Today it has three gaps:

1. **No filters.** The backend already accepts `start_date_from`/`start_date_to` (show time) but the frontend never wires them up. There's no way to filter by change time, impact kind, or resolution status.
2. **Misleading summary cards.** The three KPI cards (total upcoming, updated count, pending-resolution count) are computed client-side from only the current page's 25 rows, not the full filtered result set.
3. **No batch/run concept.** A single Google Sheets publish can touch many shows, each recorded as an independent `Audit` row. There is no persisted notion of "this group of impacts came from the same publish run," and no summary of what a given publish run actually did (created/updated/skipped/cancelled counts) — `PublishingService.publish()` computes this in-memory (`PublishScheduleSummary`) but never persists it.

## Current State (reference)

- Route: `apps/erify_studios/src/routes/studios/$studioId/schedule-publish-impacts.tsx`
- Backend: `GET /studios/:studioId/shows/schedule-publish-impacts`, `StudioShowManagementService.listSchedulePublishImpacts`, `AuditService`/`AuditRepository` querying `Audit`/`AuditTarget` rows tagged `metadata.event = 'schedule_publish_impact'`.
- Row shape: `schedulePublishImpactRowSchema` (`packages/api-types/src/shows/schemas.ts`) — `audit_id`, `impact_kind`, `schedule_id`, `external_id`, `changed_fields[]`, `relation_changes{}`, `conflict_uid`, `conflict_type`, `resolution_status`, `held_back`, `show{...}`, `created_at`.
- No `PublishRun`/`PublishBatch` model exists; publish runs are only implicit clustering of `Audit.createdAt`.
- Shared patterns to follow: `table-view-pattern` (DataTable/`useTableUrlState`/toolbar/pagination mechanics) and `operations-review-surface` (multi-tab composition: route → container → view-model hook → generic tab panel, lean summary + lazy per-tab sub-resource).

## Design

### 1. Backend: persisted `PublishRun`

Add a Prisma model:

```
PublishRun
  id            Int      @id @default(autoincrement())
  uid           String   @unique
  studioId      Int      -> Studio
  scheduleId    Int      -> Schedule
  source        PublishSource   // google_sheets_sync | studio_native_snapshot
  triggeredById Int      -> User
  summary       Json     // mirrors PublishScheduleSummary: created/updated/skipped/preserved/
                          // cancelled/cancelled_pending_resolution/publish_impacts_recorded
  createdAt     DateTime @default(now())
```

Add a nullable `publishRunId` FK on `Audit`. `PublishingService.publish()` creates one `PublishRun` row per invocation (inside the same transaction as the diff+upsert) and stamps its id onto every `schedule_publish_impact` Audit row written during that call. `source` distinguishes the two publish paths the schedule-continuity docs already call out (Google Sheets sync vs. studio-native snapshot) — both create a `PublishRun`, but only Sheets-sourced runs are expected to be large/batchy.

`source` is an **open, extensible enum**, not a permanent assumption that Sheets is the primary input. Google Sheets today is used mainly as a staging/drag-and-drop cache for planning; the product direction is to move planning natively into the app over time. The Runs tab UI must stay source-agnostic (badge + label per source, no Sheets-specific layout) so adding a future trigger type is a one-line enum addition, not a redesign.

Migration name (purpose only, per house rules): `add_publish_run_tracking`.

### 2. Backend: query/aggregate endpoints

- Extend `SchedulePublishImpactQueryDto` with:
  - `impact_kind[]` (existing enum plus the new backfill value: `confirmed_future_updated | confirmed_future_pending_resolution | stale_conflict | past_show_creator_backfilled`)
  - `resolution_status[]` (existing enum: `pending | applied | dismissed | superseded | auto_resolved_no_longer_conflicting`)
  - `changed_from` / `changed_to` (ISO range on `Audit.createdAt` — "change time")
  - `publish_run_id` (optional, filters to one run)
  - existing `start_date_from` / `start_date_to` (show time) — already implemented backend-side, just needs a frontend filter control
- New `GET /studios/:studioId/shows/schedule-publish-impacts/summary`: same filter set, unpaginated, returns counts by `impact_kind`/`resolution_status` for the KPI cards. Counts and table rows must derive from the same repository query builder so they can't drift.
- New `GET /studios/:studioId/shows/publish-runs`: lean paginated list — `run_uid`, `source`, `triggered_by`, `created_at`, `summary` counts. No nested audit rows (avoid the monolithic-payload anti-pattern).

All new list-style params follow existing DTO conventions (Zod-backed query DTO, `page`/`limit` cap, cross-field date refine).

### 3. Backend: past-show creator-mapping backfill (fill-gap only)

Today, `publishing.service.ts` skips relation sync entirely for past/done shows (`isTerminalStatus` against `PRESERVED_STATUS_KEYS`/`UPDATE_PRESERVED_STATUS_KEYS`) — terminal shows never enter `incomingByShowId`, so `relationSyncService.syncShowRelations` never touches their `ShowCreator`/`ShowPlatform` rows. This protection stays as the default.

One narrow, explicit carve-out is added: **if a past/done show currently has zero `ShowCreator` rows**, `publish()` is allowed to create them from the incoming Sheet data as a backfill. This is deliberately scoped to creator mapping only, and only to the empty case — it can never overwrite an existing mapping.

This scope is a direct consequence of a real risk: `ShowCreator` rows can be targeted by a `CompensationLineItem` (via `CompensationLineItemTarget.showCreatorId`), and the system currently has **no settlement/freeze guard** preventing `ShowCreator` mutation after compensation has been recorded (`COMPENSATION_LINE_ITEMS.md` lists freeze-at-settlement as a future extension, not implemented). Allowing Sheets to override an *existing* past-show mapping could silently invalidate a compensation record with nothing today to catch it beforehand. Fill-gap-only avoids this because there's nothing to invalidate when the mapping didn't exist.

Every backfill write is recorded through the same Audit/`PublishRun` mechanism as other impacts, tagged with a new `impact_kind` value: `past_show_creator_backfilled`. It's auto-`applied` (the write already happened, nothing pending) but still surfaces in the Impacts tab so managers can filter to it and confirm the backfilled mapping looks right — this is the "audit and record mechanism ... to allow managers to review what is updated and changed" the product wants, without a separate backfill job or model.

`ShowPlatform` and other relations are explicitly out of scope for this carve-out — only `ShowCreator` backfill is being built now. Extending the same pattern to another relation later is a small addition (new `impact_kind` value + the same zero-rows check), not a redesign.

### 4. Frontend: composition

Route becomes a small composition shell (operations-review-surface pattern) with two URL-synced tabs:

- **`impacts`** (existing table, extended):
  - `DataTableToolbar`-integrated filters: show-time range, change-time range, impact-kind multi-select, resolution-status multi-select — modeled on `my-tasks-toolbar.tsx` / `use-my-tasks-filters.ts`.
  - `page_size` becomes a URL-backed param (currently hardcoded to 25).
  - KPI cards switch from client-side page aggregation to the new `/summary` endpoint.
  - Accepts an optional `publish_run_id` filter (set via navigation from the Runs tab, or manually).
- **`runs`** (new): lean list of `PublishRun` rows — source badge (Google Sheets / Studio-native), actor, timestamp, created/updated/skipped/cancelled counts. Clicking a row navigates to the `impacts` tab with `publish_run_id` pre-filled. This reuses all existing review UI (impact badges, resolve sheet, apply/dismiss mutation) instead of building a second, parallel audit-detail view.

Switching tabs clears the other tab's filter/page params, per `operations-review-surface`. Active tab, all filters, and pagination for both tabs live in one Zod `validateSearch` schema on the route.

### 5. Non-goals

- No changes to the resolve/conflict workflow itself (`schedule-conflict-review-panel.tsx`, `resolve-schedule-conflict.ts`).
- No backfill of `PublishRun` for historical `Audit` rows — `publishRunId` is nullable; existing rows stay ungrouped (visible as historical rows in `impacts` with no run association, not shown in the `runs` tab).
- No override of an *existing* past-show `ShowCreator` mapping from Sheets — only the zero-rows fill-gap case is built now (see §3). Removing this restriction requires a compensation settlement/freeze guard first, which doesn't exist today.
- No equivalent backfill carve-out for `ShowPlatform` or other relations in this pass.
- No CSV export in this pass (can follow the `table-view-pattern` current-view export convention later if requested).

## Testing

- Backend: `publishing.service.spec.ts` — `PublishRun` created once per `publish()` call, correct `source`, `publishRunId` stamped on all impact `Audit` rows from that call; new filter params covered in `studio-show-management.service.spec.ts` / repository specs; new `/summary` and `/publish-runs` endpoints covered in controller specs; past-show backfill only fires when `ShowCreator` rows are absent, never when one already exists, and is recorded as `past_show_creator_backfilled` with an `applied` resolution.
- Frontend: filter-to-query-param wiring tests (each new filter reaches the API call), tab-switch clears the other tab's params, run-row click navigates to `impacts` with `publish_run_id` set, KPI cards render from the summary endpoint rather than page-local aggregation, `past_show_creator_backfilled` rows render and are filterable like other impact kinds.

## Open follow-ups (not in this pass)

- Historical backfill of `PublishRun` for pre-existing audit rows (log to `docs/tech-debt/` if requested later).
- CSV export of filtered impacts/runs.
- Compensation settlement/freeze guard, which would be a prerequisite for ever allowing Sheets to override an existing past-show creator mapping (not just fill an empty one).
