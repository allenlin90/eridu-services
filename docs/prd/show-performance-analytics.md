# PRD: Show Performance Analytics & Read-Model Projection (PR 21)

> **Status**: 📝 Draft Under Review  
> **Phase**: 4 — Wave 2 Ingestion & Analytics  
> **Workstream**: Show Performance Dashboard & Show Details  
> **Tracks**: [PHASE_4.md](../roadmap/PHASE_4.md) (PR 21 Meta-Row)

---

## 1. Executive Summary & Core Objective

### The Problem
While Phase 4 PR 12 handles operational timing actuals (start/end times, attendance, platform violations) to enforce immediate workflows, studio managers lack visibility into post-show **performance analytics**. Business metrics (GMV, views, CTR, CTO) remain trapped as un-indexed JSON data within completed task contents, preventing:
1. High-performance querying of trend dashboards with dynamic filters (date range, client, show type, platforms).
2. Clean separation of analytical aggregation reads from OLTP operational reads.
3. Multi-platform (multicast) stream attribution when a show streams on multiple platforms simultaneously (e.g., Shopee and Lazada dual streams).

### The Solution: PR 21.x
PR 21.x extends the database schema by adding performance metrics directly to the existing `ShowPlatform` model and introduces a dedicated performance dashboard in `erify_studios`. 

By extending the task template hydration framework, we collect multicast performance records within a single task sheet. Confirmed metrics are projected directly onto the corresponding `ShowPlatform` rows, where the platform and show association is already defined. This design keeps the schema extremely simple, prevents data inconsistency, and avoids redundant tables. The front-end leverages a dedicated analytics endpoint, synchronizing multi-select filter controls with Recharts and tabular show views.

---

## 2. Key Architectural Design Choices

To deliver high-performance reporting and keep templates clean, the analytical layer is built around five core specifications:

### A. Single Task with Target-Hydrated Multicast Fields
Rather than duplicating task sheets for each platform of a multicast show:
* **One Task per Show**: A show has at most one task of a given template (e.g. one post-production task).
* **Target-Hydrated Fields**: Template fields bound to platform performance facts (e.g. `show_platform_gmv` bound to target type `ShowPlatform`) dynamically expand during hydration to render one input field *per active platform* of the show.
* **Multicast Collection**: The operator enters metrics for all active platforms (e.g., TikTok and Shopee) in one single task sheet. The submitted keys are stored deterministically as `<fieldId>:SHOW_PLATFORM:<platformUid>` in the task content JSON.

### B. Stream-Level Performance on ShowPlatform
Rather than creating a separate projection table, we store performance metrics directly on the existing `ShowPlatform` model:
* **No Redundant Tables**: We avoid creating a new `ShowPerformance` table, as `ShowPlatform` already represents the exact same show-platform grain.
* **Data Consistency**: Because performance metrics are columns on `ShowPlatform` itself, we naturally eliminate any risk of orphan performance records for unassigned platforms.
* **Query Simplicity**: The analytics endpoints query `ShowPlatform` directly rather than left-joining a secondary table.
* **Metrics Columns**: Added `gmv`, `ctr`, and `cto` as nullable Decimal columns, joining the existing `viewerCount` column (renamed or mapped as `views` / `viewer_count` in API).

```
+-----------------------------------------------------------+
|                       ShowPlatform                        |
+-----------------------------------------------------------+
| - id: BigInt (PK)                                         |
| - uid: String (Unique)                                    |
| - show_id: BigInt (FK to Show)                            |
| - platform_id: BigInt (FK to Platform)                    |
| - live_stream_link: String?                               |
| - viewer_count: Int (used for views)                      |
| - gmv: Decimal(12, 2)?                                    |
| - ctr: Decimal(5, 2)?                                     |
| - cto: Decimal(5, 2)?                                     |
+-----------------------------------------------------------+
```

### C. Dedicated Performance Endpoints
To isolate analytics reads from OLTP operational paths, we expose two dedicated endpoints:
1. **`GET /studios/:studioId/performance/summary`**:
   - Calculates aggregate metrics (Total GMV, Total Views, Average CTR, Average CTO) and computes coordinates for the daily trend graph.
   - **Shows Counted**: Aggregates metrics **only** for shows that have a completed performance record.
   - Exposes the operational ratio `"Shows with Records: X / Y"` where `X` is the count of shows with performance records and `Y` is the total count of shows in the date range matching filters.
2. **`GET /studios/:studioId/performance/shows`**:
   - Primary data source for the dashboard table.
   - Queries the `Show` table as the base (to list **all** shows in the range matching filters) and joins `ShowPlatform` to retrieve their platforms and performance metrics.
   - Displays performance metrics where they exist, and empty/null cells for shows/platforms without completed records.

### D. Filter State Synchronization
* Multi-select filters on the dashboard (date range, client, show type, platform) synchronize state in URL search parameters.
* When filters change, they trigger both `/performance/summary` and `/performance/shows` in parallel to keep the trend graph and the table synchronized.

### E. Unified Show Details & Tasks Revamp
* Deprecate the old route `/studios/:studioId/task-setup/:showId/tasks` which mixes management concerns with task details.
* Implement a unified Show Details page at `/studios/:studioId/shows/:showId` using a tabbed layout:
  - **Details & Performance** (delivered in PR 21.x): Displays metadata and the `ShowPlatform` performance metrics.
  - **Submitted Tasks** (delivered in PR 21.x): Renders the task setup table and action panel.
  - **Compensation** (dependent on **14c**): Show-creator compensation detail section will be integrated as a dedicated tab after `14c` lands.
* Redirect all application links pointing to the old task-setup route to `/shows/:showId/tasks`.

---

## 3. Extraction & Projection Pipeline

When a task transitions into `COMPLETED` or `REVIEW`:
1. **Fact Extraction**: The `FactExtractionService` identifies fields bound to analytical fact keys (e.g. `show_platform_gmv`).
2. **Platform Resolution**: The service parses the target UID from the hydrated keys (`<fieldId>:SHOW_PLATFORM:<platformUid>`) and resolves the corresponding `Platform` of the show.
3. **Database Projection**: The `ShowPlatformProjectionService` (or ingestion pipeline helper) upserts/updates the performance columns (`gmv`, `ctr`, `cto`, `viewerCount`) directly on the `ShowPlatform` row using the resolved `showId` and `platformId`.

### A. Precedence & Override Logic (Coalescing Rules)
A show's performance metrics can be supplied by multiple tasks over its lifecycle (e.g., during-show moderation vs. post-show wrap-up). We enforce a strict priority hierarchy when projecting facts:
- **Post-Production Wrap-Up (`Post_production_check` template, ID 93) takes priority** over Moderation Loop 8 workflow tasks.
- If a post-production check task is completed, its extracted metrics will override any existing moderation loop 8 metrics for that show and platform on `ShowPlatform`.
- If a moderation loop 8 task is completed but post-production check data already exists, the loop 8 write is skipped.
- Provenance is tracked per metric in `ShowPlatform.metadata.performance_templates[factKey]`; the metric column and provenance entry are written in one guarded database update so a lower-priority Loop 8 write cannot race behind and overwrite a newly completed post-production value.
- This ensures the `ShowPlatform` performance values always reflect the final, verified post-production wrap-up figures.

---

## 4. Verification Plan

### Automated Tests
- Schema migrations execute cleanly.
- Unit tests for the projection service verifying correct extraction from multicast task fields.
- Integration tests for `GET .../performance/summary` and `GET .../performance/shows` verifying query parameters and calculations.

### Manual Verification
- Verify that a multicast show correctly displays separate platform input fields on the task form.
- Verify that completing the task projects individual records for each platform.
- Verify that filtering by platform on the dashboard properly refetches and displays correct aggregates.

---

## 5. Pull Request Execution Plan (PR Breakdown)

To support progressive integration, testing, and clean reviews, the show performance workstream is broken down into the following sequential, mergeable PRs:

### PR 21.1: Design & Requirements Document (✅ Completed)
- **Deliverables**: Create `docs/prd/show-performance-analytics.md` design spec and revise `docs/roadmap/PHASE_4.md`.

### PR 21.2: Database Migration & Schema Additions
- **Deliverables**:
  - Add `gmv`, `ctr`, and `cto` nullable Decimal columns directly to the `ShowPlatform` model in `apps/erify_api/prisma/schema.prisma`.
  - Generate Prisma client types and run the schema migration.

### PR 21.3: System Fact Key Catalog Expansion
- **Deliverables**:
  - Add `show_platform_gmv`, `show_platform_view_count`, `show_platform_ctr`, and `show_platform_cto` to `SystemFactKeyEnum` in `@eridu/api-types`.
  - Register matching type constraints in `bind-template-system-facts.sql` to pass key sync checks.

### PR 21.4: Ingestion Pipeline & Fact Extraction Updates
- **Deliverables**:
  - Create `ShowPlatformProjectionService` (or update `FactExtractionService`) to support projecting extracted performance metrics directly onto the corresponding `ShowPlatform` columns.
  - Implement coalescing precedence: Post-production wrap-up tasks override moderation loop 8 metrics.

### PR 21.5: Backend Analytics Endpoints
- **Deliverables**:
  - Implement query schema validations and response DTO types in `@eridu/api-types/performance`.
  - Expose `GET /studios/:studioId/performance/summary` and `GET /studios/:studioId/performance/shows` endpoints in `erify_api`.
  - Add backend integration tests.

### PR 21.6: Frontend Performance Dashboard
- **Deliverables**:
  - Add Lucide icon and "Performance" route to sidebar configurations.
  - Implement `/studios/:studioId/performance` view in `erify_studios` containing Recharts trend graphs, stats cards, and multi-select filter sync logic.

### PR 21.7: Frontend Show Details Tabs & Route Revamp (Post-14c Merge)
- **Deliverables**:
  - Integrate the unified tabbed Show Details layout at `/studios/:studioId/shows/:showId` with `Performance` and `Submitted Tasks` tabs once the 14c show detail route (Details | Actuals | Compensation) has landed on master.
  - Converge the legacy operational routes into the show detail: rewire the entry-point links/buttons for `/task-setup/:showId/tasks` **and** `/creator-mapping/:showId` (the latter to `/shows/:showId/compensation`, which 14c already mounts via `ShowCreatorList`), then **delete** the legacy routes. Clean route renames — **no redirect shims** (internal-app convention; bookmarks are not a contract here).
