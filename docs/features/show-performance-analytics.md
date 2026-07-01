# Feature: Show Performance Analytics

> **Status**: ✅ Shipped — Phase 4
> **Workstream**: Show Performance Dashboard & Show Details (PR 21)
> **Depends on**: PR 12 Fact Binding
> **Implementation refs**: [BE controller](../../apps/erify_api/src/studios/studio-performance/studio-performance.controller.ts), [BE service](../../apps/erify_api/src/studios/studio-performance/studio-performance.service.ts), [FE performance route](../../apps/erify_studios/src/routes/studios/$studioId/performance.tsx), [FE performance components](../../apps/erify_studios/src/features/studio-performance/components/)

## Problem

Studio managers lack visibility into post-show **performance analytics**. Business metrics (GMV, views, CTR, CTO) were stored as un-indexed JSON data within completed task contents, preventing:
1. High-performance querying of trend dashboards with dynamic filters (date range, client, show type, platforms).
2. Clean separation of analytical aggregation reads from OLTP operational reads.
3. Multi-platform (multicast) stream attribution when a show streams on multiple platforms simultaneously (e.g., Shopee and Lazada dual streams).

## Users

- **Studio managers / admins**: view aggregated performance stats, track daily GMV and viewership trends, and filter shows by performance status.
- **Content operators / managers**: review performance records per show in the show details tab.

## What Was Delivered

### Database Schema Additions
- Added `gmv`, `ctr`, and `cto` columns as nullable Decimals directly to the `ShowPlatform` model.
- Kept the schema normalized by storing performance metrics on `ShowPlatform`, avoiding redundant projection tables and ensuring data consistency.

### System Fact Key Catalog Expansion
- Expanded the `SystemFactKeyEnum` catalog to support platform performance keys: `show_platform_gmv`, `show_platform_view_count`, `show_platform_ctr`, and `show_platform_cto`.

### Ingestion Pipeline & Fact Extraction
- Integrated performance metric extraction into `FactExtractionService` when a task transitions to `COMPLETED` (and on subsequent admin content edits of an already-completed task). This is the authoritative write of show-level platform aggregates, which is why the loop-metrics endpoint reads from the same finalized states.
- Implemented a strict priority coalescing logic: Post-production wrap-up tasks (`Post_production_check` template, ID 93) take priority over Moderation Loop 8 workflow tasks.
- Used safe JSONB updates to record provenance metadata and prevent race conditions.

### Dedicated Performance Endpoints
- `GET /studios/:studioId/performance/summary` — Returns dashboard summaries (Total GMV, Total Views, Average CTR, Average CTO) and computes timezone-aware, operational-day daily trend data.
- `GET /studios/:studioId/performance/shows` — Paginated and filterable shows list mapping show metadata and platform metrics, with support for searching by show name, filtering by performance record presence (`has_performance`), show standard, and multi-column sorting. The `sort` query param is comma-separated `<field>:<asc|desc>` pairs applied in priority order (e.g. `?sort=gmv:desc,ctr:asc`); allowed fields are `start_time`, `gmv`, `views`, `ctr`, `cto` and are validated at the request boundary (invalid input → `400`). A pure `start_time` sort (the default) is ordered and paginated by the database; sorting by a derived metric (GMV/Views/CTR/CTO) loads the full matched set and orders it in memory before slicing the page.
- `GET /studios/:studioId/performance/shows/:id/loops` — Returns loop-scoped platform metrics (GMV, views, CTR, CTO) alongside studio localization configuration. Metrics are sourced from **finalized** moderation tasks only (`COMPLETED`/`CLOSED`), matching the states fact extraction uses to write the show-level aggregates, so loop totals stay consistent with the rest of the dashboard. When several finalized tasks carry a loop schema, the most recently updated one wins.

### Localized Money Formatting
- Formats GMV in local studio settings (Thai Baht `฿` with thousands separators) dynamically determined by the studio's localization configuration on both backend and frontend.

### Timezone-Aware Operational Day Bucketing
- Daily trend bucketing is performed using calendar UTC day increments derived from the studio's timezone offset, preventing daylight saving time and timezone shifts from causing incorrect date buckets.

### Frontend Dashboard and Show Details Tab
- Built `/studios/:studioId/performance` containing metrics summary cards, a Recharts trend graph, and a tabular list of shows with platform metrics.
- Added a **By-Show** x-axis mode to the performance trend graph (toggled against the default **Daily** mode, `chart_mode` URL-synced): plots a selected client's shows across the range (ordered by `start_time`) on a Recharts line chart, with a metric toggle for GMV / Views / Peak CTR / Peak CTO and a single-client selector (empty = all shows in range). Served by a dedicated `GET /studios/:studioId/performance/shows-series` endpoint.
- Revamped show details to `/studios/:studioId/shows/:showId` using a tabbed structure (**Details** · **Actuals** · **Performance** · **Compensation** · **Submitted Tasks**), retiring old `/task-setup/:showId/tasks` and `/creator-mapping/:showId` routes.
- Added loop-scoped performance trend visualization on the show's Performance tab: plots loop-by-loop metric progression (Views, GMV, CTR, CTO) by platform channel using a Recharts line graph, with dynamic localization support for ticks and tooltips.
- Support priority-based multi-column sorting on the shows breakdown table (Google Sheets-style click sequence: unsorted -> ASC -> DESC -> unsorted) with active badges, arrows, and URL synchronization.
- Featured Show Standard (Standard / Premium) filter dropdown on the performance table and filter pills on Shows list and Task Setup views.
- Configured tab navigation list to gracefully overflow with horizontal scrolling and hidden scrollbars on mobile widths (e.g., 375px iPhone SE) to prevent page layout breaking.

## Key Product Decisions

- **Single Task with Multicast Hydration** — Render one field per active platform inside a single post-production task form, storing keys in task content JSON as `<fieldId>:SHOW_PLATFORM:<platformUid>`.
- **Direct ShowPlatform Storage** — Avoided adding a standalone `ShowPerformance` table since `ShowPlatform` perfectly represents the show-platform grain.
- **Timezone-Agnostic API Contracts** — The frontend calculates and serializes explicit operational-day window bounds (06:00 to 05:59 local time), while the backend processes these bounds timezone-agnostically to remain simple and performant.
- **Peak CTR/CTO = max across loops × platforms** — The By-Show graph reports CTR/CTO as the true peak reached during the stream (max over the show's moderation loops and platforms), not the last-value `ShowPlatform.ctr/cto` columns. The shows-series endpoint batches one finalized-task query across all in-range show ids and groups by show ("latest loop-bearing task wins") to avoid an N+1, and the loop-parser is shared with the single-show loops endpoint so the two never drift.

## Acceptance Record

- [x] Platform-scoped performance metrics are stored as nullable Decimal columns on `ShowPlatform`.
- [x] Ingestion pipeline extracts performance metrics from multicast task fields on task completion/approval.
- [x] Post-production task completion overrides moderation loop 8 metrics, while loop 8 writes do not overwrite post-production metrics.
- [x] Dedicated analytics summary endpoint calculates totals and timezone-aware daily trend data.
- [x] Dedicated analytics shows endpoint returns paginated, search-supported shows with platform metrics.
- [x] Performance dashboard renders summary metrics cards and Recharts trend graph.
- [x] Tabular shows view supports filtering by date range, client, show type, platforms, and performance record presence.
- [x] Search input inside the shows table filters rows by show name.
- [x] GMV displays locally formatted Thai Baht with thousands separators using `Intl.NumberFormat`.
- [x] Legacy `/task-setup/:showId/tasks` and `/creator-mapping/:showId` routes are retired and converged into unified tabs on show details.
- [x] Backend and frontend test suites pass with full code coverage for newly introduced formatters, endpoint controllers, and services.
- [x] Expose loop performance API returning loop-level metrics and studio localization metadata (currency, locale).
- [x] Renders moderation loop trend line chart plotting Views, GMV, CTR, and CTO progression by loop and platform channel.
- [x] Support multiple sort parameters concurrently with active priorities and URL sync on the Shows breakdown grid.
- [x] Show Standard (Standard vs Premium) filter operates on the shows analytics list and is featured on show list / task setup quick filters.
- [x] Tab list header on show details route is responsive and supports touch-swipe horizontal scrolling on mobile viewports.
- [x] Performance trend graph supports a By-Show x-axis mode plotting a client's shows (GMV / Views / peak CTR / peak CTO) via a dedicated `shows-series` endpoint; peak CTR/CTO are the max across the show's moderation loops × platforms.

## Performance Correction (Phase 5)

> **Status**: ✅ Shipped — Phase 5, Item 7 (PR #247)

Extends the performance analytics surface with a manager correction flow: `POST /studios/:studioId/shows/:id/platforms/:showPlatformUid/correct-performance`.

### What Was Delivered

- **Correction endpoint** — Accepts GMV, viewer count, CTR, CTO (all optional), plus a required business reason. Only metrics that differ from the current DB value produce a write; no-op submissions return the current show detail without an audit record.
- **MANAGER source ownership** — For each corrected metric the endpoint sets `metadata.actuals_source[factKey] = 'MANAGER'` and `metadata.performance_templates[factKey] = 'MANAGER'`, marking those fields as the highest extraction priority (rank 4).
- **Audit trail** — Each correction creates an `OVERRIDE` audit record (via `AuditService`) linking the actor, business reason, old/new values, show, and show-platform targets.
- **Pipeline hardening** — `BasePlatformPerformanceExtractor` now enforces MANAGER priority at both read time (pre-skip check via `canResolverOverwrite`) and write time (embedded `WHERE actuals_source <> 'MANAGER'` predicate in the UPDATE), closing a TOCTOU window where a concurrent extraction run could overwrite a correction that arrived after the extractor's initial read.
- **Frontend dialog** — "Correct Metrics" button on each platform card in the show's Performance tab (ADMIN and MANAGER roles only). Responsive dialog with optional metric fields and a required business reason.

### Key Design Decisions

- **JSONB merge, not full-blob replace** — `updateCorrectedPerformanceMetrics` uses `jsonb_set(... || $newKeys::jsonb ...)` to merge only the corrected provenance sub-keys, so a concurrent extraction write to a sibling metric key is not overwritten. This required raw SQL; see `// Engineering decision:` comment in `show-platform.repository.ts`.
- **Change detection before write** — The service only writes metrics that changed from their current DB value. Submitting the same value as the current DB value is a no-op and does NOT update `actuals_source` to MANAGER. This is intentional: a manager who wants to protect a value that the extractor already set must change it to trigger ownership, or wait for the extractor to be blocked by the embedded WHERE predicate if the value was previously corrected.
- **Validation at API boundary** — Input schema `correctShowPlatformPerformanceInputSchema` uses signed-decimal patterns (positive-only regex) with precision bounds per metric. The service re-validates with `toDecimalPlaces` and magnitude checks before writing.

## Forward References

- Backend database schema: `packages/api-types/src/performance/performance.schema.ts`
- Feature specifications for PR 12 Fact Binding: [task-fact-binding.md](./task-fact-binding.md)
