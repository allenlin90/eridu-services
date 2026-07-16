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

### 3. Backend: past-show creator-mapping backfill (same publish/validate API, bounded service-layer branch)

The Google Sheets `show_planning` payload already carries per-show creator assignment today: `showPlanItemSchema` (`schedule-planning.schema.ts`) accepts a `creators: [{creatorId, note}]` array, sourced from the sheet's `creators` column (comma-separated creator UIDs, parsed by the Apps Script's `UpdateSchedules.js`). `publishing-relation-sync.service.ts`'s `syncCreatorsForShow` already reads this field and creates/updates/soft-deletes `ShowCreator` rows from it — but only for shows that enter `incomingByShowId`, which excludes every terminal (past/done) show (`isTerminalStatus` against `PRESERVED_STATUS_KEYS`/`UPDATE_PRESERVED_STATUS_KEYS`). So the Sheet already carries everything needed for backfill; the gap is purely that the service discards this data for past shows.

Given that, backfill doesn't need a separate sheet, a separate button, or a separate `/validate`/`/publish` action — there isn't even an erify_studios UI for validate/publish today (this flow is driven server-to-server by the Apps Script bound to the spreadsheet), so a second manager-facing action would introduce a workflow nobody currently has a screen for. The design instead keeps one API surface and puts the separation in the service layer:

- **Same API surface.** `POST /schedules/:id/validate` and `POST /schedules/:id/publish` keep their existing request/response contract. No new endpoint, no new button.
- **Bounded branch inside `publish()`, not a fork of the main loop.** Add one clearly separated unit — e.g. a dedicated method/class such as `TerminalShowCreatorMappingBackfill`, invoked once from `PublishingService.publish()` after the main diff+upsert completes — that only considers shows excluded from `incomingByShowId` (terminal shows) whose incoming row specifies `creators` and whose current `ShowCreator` row count is zero. It reuses `syncCreatorsForShow`'s existing create logic for the actual write, called from this bounded step rather than inlined into the per-show relation-sync path. The main diff+upsert loop, `syncCreatorsForShow`'s existing terminal-show exclusion, and their existing tests are untouched — this is a facade/boundary in code organization, not a UX-level second action.
- **Same `PublishRun`, distinguished by `impact_kind`.** One `PublishRun` per `/publish` call (`source: google_sheets_sync`, no separate source value). Backfill writes are still recorded as Audit rows tagged `impact_kind: past_show_creator_backfilled`, stamped with that same run's id — visible and filterable in the Impacts tab exactly like any other impact, distinguished only by that tag.
- **`/validate` still surfaces it before commit.** Extend `SchedulePlanningService.validateSchedule`'s response with a non-blocking informational entry (does not flip `isValid` to `false`) reporting how many terminal shows in the payload are backfill-eligible. This preserves the "still needs to follow review, validate, and publish" discipline the rest of the flow already has — whatever process reviews the `/validate` response before triggering `/publish` sees the backfill count first, the same way it sees any other validation finding.

The zero-rows-only scope is unchanged from the original reasoning: `ShowCreator` rows can be targeted by a `CompensationLineItem` (via `CompensationLineItemTarget.showCreatorId`), and there is **no settlement/freeze guard** today preventing `ShowCreator` mutation after compensation has been recorded (`COMPENSATION_LINE_ITEMS.md` lists freeze-at-settlement as a future extension, not implemented). Allowing the Sheet to override an *existing* past-show mapping could silently invalidate a compensation record with nothing today to catch it beforehand — fill-gap-only avoids this because there's nothing to invalidate when the mapping didn't exist.

`ShowPlatform` and other relations are out of scope for this carve-out — only `ShowCreator` backfill is being built now.

**Why this differs from a bundled default without being a separate action either**: the goal from the earlier revision — keep an unproven carve-out out of the routine diff+upsert loop until it's exercised on its own — still holds. It's satisfied by giving the backfill logic its own bounded method/class and its own tests, called as one explicit step from `publish()`, rather than folded into `syncCreatorsForShow`'s existing loop. What changed is the *trigger*: since the Sheet already sends exactly the data this needs, asking managers to learn a second action for data the system already has would complicate the workflow without adding safety. The boundary is a code-organization boundary, not a UX boundary.

### 4. Frontend: composition

Route becomes a small composition shell (operations-review-surface pattern) with two URL-synced tabs:

- **`impacts`** (existing table, extended):
  - `DataTableToolbar`-integrated filters: show-time range, change-time range, impact-kind multi-select, resolution-status multi-select — modeled on `my-tasks-toolbar.tsx` / `use-my-tasks-filters.ts`.
  - `page_size` becomes a URL-backed param (currently hardcoded to 25).
  - KPI cards switch from client-side page aggregation to the new `/summary` endpoint.
  - Accepts an optional `publish_run_id` filter (set via navigation from the Runs tab, or manually).
- **`runs`** (new): lean list of `PublishRun` rows — source badge (Google Sheets / Studio-native), actor, timestamp, created/updated/skipped/cancelled counts. Clicking a row navigates to the `impacts` tab with `publish_run_id` pre-filled. This reuses all existing review UI (impact badges, resolve sheet, apply/dismiss mutation) instead of building a second, parallel audit-detail view. Backfilled creator mappings need no separate UI action here — they land inside whichever regular publish run triggered them, distinguished only by the `past_show_creator_backfilled` `impact_kind` filter on the Impacts tab.

Switching tabs clears the other tab's filter/page params, per `operations-review-surface`. Active tab, all filters, and pagination for both tabs live in one Zod `validateSearch` schema on the route.

### 5. Non-goals

- No changes to the resolve/conflict workflow itself (`schedule-conflict-review-panel.tsx`, `resolve-schedule-conflict.ts`).
- No backfill of `PublishRun` for historical `Audit` rows — `publishRunId` is nullable; existing rows stay ungrouped (visible as historical rows in `impacts` with no run association, not shown in the `runs` tab).
- No override of an *existing* past-show `ShowCreator` mapping from Sheets — only the zero-rows fill-gap case is built now (see §3). Removing this restriction requires a compensation settlement/freeze guard first, which doesn't exist today.
- No equivalent backfill carve-out for `ShowPlatform` or other relations in this pass.
- No new endpoint or manager-facing action for triggering backfill — it runs as one bounded step within the existing `/publish` call whenever a backfill-eligible show is present, surfaced non-blockingly by `/validate` beforehand and reviewable in the Impacts tab afterward.
- No change to `publish()`'s main diff+upsert loop or to `syncCreatorsForShow`'s existing non-terminal-show behavior — the backfill step is a separately-called, separately-tested method, not an edit to that existing code path.
- No CSV export in this pass (can follow the `table-view-pattern` current-view export convention later if requested).

## Relationship to Other Phase 5 Items

- **Item 4 (Cancel show with resolution workflow, ✅ Done)**: this design's filters and `PublishRun` batching are, in part, the "focused pending-resolution queue/discovery" that item 4's deferred-follow-up note and `references/state-gates.md` (`any → cancelled_pending_resolution` transition) both flag as not yet built. The Impacts tab already surfaces `confirmed_future_pending_resolution` rows — the same automatic transition item 4's cancellation gate handles — so this design sharpens an existing discovery gap rather than duplicating scope.
- **Item 9 (Show-level issue ownership, 📐 Ready)**: not related, despite surface-level overlap in wording. Item 9 is scoped to **production-phase execution blockers** sourced from the fact-extraction pipeline (`ShowPlatformViolation`, `attendanceMissing`, missing-performance facts) — e.g. a creator assigned to a live/upcoming show who doesn't appear. This design's `past_show_creator_backfilled` impact is a **pre-production data-completeness repair** for already-completed shows — a different lifecycle phase, a different anomaly type, and not something needing an owner/severity/escalation path. Noted here so future work doesn't try to route schedule-publish audits through item 9's issue model by the shared word "creator."
- **Item 11 (Advisory planning readiness checklist, 🔲 Planned) / Item 19 (Lifecycle state-gate enforcement, ⏸ Blocked)**: `stale_conflict` impacts (a held-back Sheet edit vs. a local edit) aren't captured by any current readiness condition in `state-gates.md`'s `draft → confirmed` table (room/creators/platforms/tasks/schedule-linkage). Once item 11 exists, "no unresolved schedule-sync conflict" is a natural additional condition to aggregate from this design's data, and a candidate warning condition for item 19 once the state machine lands. Out of scope for this pass; noted so it isn't lost.

## Testing

- Backend: `publishing.service.spec.ts` — `PublishRun` created once per `publish()` call, correct `source`, `publishRunId` stamped on all impact `Audit` rows from that call; **existing `publish()` and `syncCreatorsForShow` specs pass unchanged**, proving the backfill addition didn't alter routine sync behavior for non-terminal shows. New filter params covered in `studio-show-management.service.spec.ts` / repository specs; new `/summary` and `/publish-runs` endpoints covered in controller specs. A dedicated spec for the new backfill step: only fires for terminal shows with zero `ShowCreator` rows and a `creators` value in the incoming payload, never touches a show that already has a mapping, and records `past_show_creator_backfilled` audit rows stamped with the same `PublishRun` as the rest of that publish call. A `validateSchedule` spec covers the new non-blocking informational entry (backfill-eligible count) without flipping `isValid`.
- Frontend: filter-to-query-param wiring tests (each new filter reaches the API call), tab-switch clears the other tab's params, run-row click navigates to `impacts` with `publish_run_id` set, KPI cards render from the summary endpoint rather than page-local aggregation, `past_show_creator_backfilled` rows render and are filterable like other impact kinds.

## Open follow-ups (not in this pass)

- Historical backfill of `PublishRun` for pre-existing audit rows (log to `docs/tech-debt/` if requested later).
- CSV export of filtered impacts/runs.
- Compensation settlement/freeze guard, which would be a prerequisite for ever allowing the Sheet to override an existing past-show creator mapping (not just fill an empty one).
- Extending the same zero-rows backfill pattern to `ShowPlatform`, once the `ShowCreator` version has run in production and proven safe.
- A `draft → confirmed` readiness/gate condition sourced from unresolved `stale_conflict` impacts (see Relationship to Other Phase 5 Items — item 11/19), once those items are picked up.
