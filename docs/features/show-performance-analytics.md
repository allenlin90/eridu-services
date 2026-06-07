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
- `GET /studios/:studioId/performance/shows` — Paginated and filterable shows list mapping show metadata and platform metrics, with support for searching by show name, filtering by performance record presence (`has_performance`), show standard, and multi-column sorting. A pure `start_time` sort (the default) is ordered and paginated by the database; sorting by a derived metric (GMV/Views/CTR/CTO) loads the full matched set and orders it in memory before slicing the page.
- `GET /studios/:studioId/performance/shows/:id/loops` — Returns loop-scoped platform metrics (GMV, views, CTR, CTO) alongside studio localization configuration. Metrics are sourced from **finalized** moderation tasks only (`COMPLETED`/`CLOSED`), matching the states fact extraction uses to write the show-level aggregates, so loop totals stay consistent with the rest of the dashboard. When several finalized tasks carry a loop schema, the most recently updated one wins.

### Localized Money Formatting
- Formats GMV in local studio settings (Thai Baht `฿` with thousands separators) dynamically determined by the studio's localization configuration on both backend and frontend.

### Timezone-Aware Operational Day Bucketing
- Daily trend bucketing is performed using calendar UTC day increments derived from the studio's timezone offset, preventing daylight saving time and timezone shifts from causing incorrect date buckets.

### Frontend Dashboard and Show Details Tab
- Built `/studios/:studioId/performance` containing metrics summary cards, a Recharts trend graph, and a tabular list of shows with platform metrics.
- Revamped show details to `/studios/:studioId/shows/:showId` using a tabbed structure (**Details** · **Actuals** · **Performance** · **Compensation** · **Submitted Tasks**), retiring old `/task-setup/:showId/tasks` and `/creator-mapping/:showId` routes.
- Added loop-scoped performance trend visualization on the show's Performance tab: plots loop-by-loop metric progression (Views, GMV, CTR, CTO) by platform channel using a Recharts line graph, with dynamic localization support for ticks and tooltips.
- Support priority-based multi-column sorting on the shows breakdown table (Google Sheets-style click sequence: unsorted -> ASC -> DESC -> unsorted) with active badges, arrows, and URL synchronization.
- Featured Show Standard (Standard / Premium) filter dropdown on the performance table and filter pills on Shows list and Task Setup views.
- Configured tab navigation list to gracefully overflow with horizontal scrolling and hidden scrollbars on mobile widths (e.g., 375px iPhone SE) to prevent page layout breaking.

## Key Product Decisions

- **Single Task with Multicast Hydration** — Render one field per active platform inside a single post-production task form, storing keys in task content JSON as `<fieldId>:SHOW_PLATFORM:<platformUid>`.
- **Direct ShowPlatform Storage** — Avoided adding a standalone `ShowPerformance` table since `ShowPlatform` perfectly represents the show-platform grain.
- **Timezone-Agnostic API Contracts** — The frontend calculates and serializes explicit operational-day window bounds (06:00 to 05:59 local time), while the backend processes these bounds timezone-agnostically to remain simple and performant.

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

## Forward References

- Backend database schema: `packages/api-types/src/performance/performance.schema.ts`
- Feature specifications for PR 12 Fact Binding: [task-fact-binding.md](./task-fact-binding.md)
