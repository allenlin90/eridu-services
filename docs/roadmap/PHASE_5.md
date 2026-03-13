# Phase 5: Parking Lot and TODO Backlog

> **Status**: Deferred / parking lot
> **Planning stance**: Keep backlog context and rationale here; promote only the items that become necessary after the Phase 4 merge baseline stabilizes.

## Purpose

Phase 5 is a backlog of valuable follow-up initiatives that remain intentionally deferred while the Phase 4 merge baseline is still settling.
The goal is to preserve context and rationale now, then promote only the items that have clear owners, sequencing, and exit criteria.

The P&L revenue workflow and task submission reporting/export are the two most likely items to promote first once the Phase 4 baseline stabilizes.
In parallel, this phase also tracks carry-over merge gaps from `feat/phase-4-p-and-l` that were implemented there but are not yet represented in the current baseline.

## Merge-Gap Carry-Over (from `feat/phase-4-p-and-l`)

Context:
The historical Phase 4 feature branch accumulated multiple implemented workflows in one large PR. Some of those workflows were not merged into the current baseline branch and are also not explicitly tracked in this Phase 5 parking lot.

### Studio Member Roster / Membership Governance

Context:
The current baseline has `/system/memberships` for admin management plus studio-scoped membership read APIs. The feature branch also introduced a dedicated studio-scoped member roster workflow (`/studios/:studioId/members`) with invite/search, role updates, removal, and helper eligibility toggles.

TODOs:
- Decide whether studio membership management remains system-admin-only (`/system/memberships`) or should also ship as a studio-scoped roster surface.
- Reconcile API contract scope for `/studios/:studioId/studio-memberships`, including/excluding `user-catalog`, create, role update, helper toggle, and delete operations.
- Align route guards/sidebar policy and role matrices for any retained member-roster route.
- Add BE/FE tests for membership mutation paths and role-based access.
- Update role-policy documentation to reflect the final source of truth.

### Studio Creator Roster Management (CRUD + Defaults)

Context:
Current baseline creator roster coverage is read-oriented (`catalog`, `roster`, `availability`). The feature branch additionally implemented creator roster CRUD patterns: onboarding from catalog, active/inactive management, studio-specific default compensation fields, and optimistic-version updates.

TODOs:
- Decide whether Phase 5 should promote full creator roster CRUD as a first-class studio workflow (`/studios/:studioId/creators`).
- Define canonical write contract for roster mutation (`add`, `update`, `remove`) and version-conflict handling semantics.
- Align creator roster UX with creator-mapping UX so roster state and mapping behavior remain consistent.
- Add BE/FE tests for roster mutation, optimistic concurrency conflicts, and compensation-default propagation behavior.

### Canonical Creator Naming and Legacy `mc` Deprecation

Context:
Creator-first naming is partially complete, but compatibility aliases and mixed `mc`/`creator` naming still exist across modules, exports, schemas, and docs.

TODOs:
- Define compatibility-window and removal-gate criteria for legacy `mc` aliases.
- Complete creator-first naming consolidation across backend modules, shared package exports, frontend routes/hooks, and docs.
- Keep migration/backfill strategy explicit for UID and alias cutover paths.
- Remove deprecated compatibility shims once consumers are fully migrated.

### Task Helper Eligibility and Assignment Gating

Context:
The feature branch introduced helper eligibility controls on studio memberships and task-assignment eligibility enforcement. This behavior is not currently called out in Phase 5 despite being a distinct policy/workflow decision.

TODOs:
- Decide whether task-helper eligibility remains part of studio-membership metadata policy.
- If retained, define canonical API + UI behavior for helper toggle and conflict-safe updates.
- Define task-assignment error contract when assignee is not helper-eligible.
- Add policy tests and documentation updates for helper-aware assignment workflows.

### Economics Baseline Reconciliation

Context:
The feature branch included economics/performance endpoint implementation details, while current baseline docs and code status differ across files/branches. This drift should be reconciled before promoting P&L follow-up work.

TODOs:
- Reconcile current-baseline status for economics/performance endpoint availability and branch parity.
- Align Phase 4/Phase 5 status wording and linked docs so rollout state is unambiguous.
- Keep P&L “P-side” planning scoped to confirmed baseline behavior after reconciliation.

## Deferred Workstreams (Context + TODOs)

### Cross-Functional Ticketing

Context:
Current flows are template-driven and studio-operations-centric. Cross-functional, ad-hoc work is still under-supported.

TODOs:
- Ad-hoc task creation without templates (show-targeted and client-targeted).
- Cross-functional access for commerce, designers, and moderation managers.
- Snapshot repurposing for requirement versioning on ad-hoc tasks.
- Client self-service ticketing via separate FE app (similar to `erify_creators`).

### Material Management

Context:
Material lifecycle management is needed to support production quality, traceability, and attachment workflows.

TODOs:
- `Material` / `MaterialType` / `ShowMaterial` data model and CRUD.
- Immutable versioning with current-alias pointer.
- Material-ticket integration (attachments on ad-hoc tasks).
- Show-material linking and dedicated material UI.

### Review Quality Hardening

Context:
As volume and role diversity grow, review governance and audit quality must be stricter and more consistent.

TODOs:
- Admin/manager transition whitelist enforcement.
- Required rejection notes.
- Review decision audit metadata hardening.
- Standardized error responses for invalid transitions.

### Collaboration and Communication

Context:
Operational coordination still relies heavily on external channels; in-system collaboration is limited.

TODOs:
- Comments and threaded discussion.
- Mentions and notification triggers.
- Notification persistence and delivery.

### Task Template Purpose Separation

Context:
Template intent is mixed in one view today. Regular operations and moderation operations should be clearly separated.

TODOs:
- Separate task-template views for regular templates and moderation templates.
- Align visibility/actions with Phase 4 studio membership roles.
- Keep role-aware UX/API behavior to avoid purpose leakage and confusion.

### Frontend PWA and Push Notifications

Context:
Field operations need app-like access and timely alerts, especially when users are not actively in the web app.

TODOs:
- Turn frontend apps into downloadable PWAs.
- Add service-worker strategy for app-shell caching and stable updates.
- Integrate notification system with push notifications:
  - subscription lifecycle (subscribe/unsubscribe/refresh),
  - server-side push delivery pipeline,
  - deep-link routing into relevant pages,
  - permission/preferences handling.

### Creator App Expansion

Context:
Phase 4 introduced studio-scoped/grouped structures and started the creator-first terminology shift. Creator-facing workflows should align with that model while finishing remaining naming compatibility cleanup.

TODOs:
- Expand creator app capabilities for creator users by studio scope.
- Keep data and actions grouped/scoped per studio as defined in Phase 4.
- Add role-aware visibility and operational views for assignments, schedules, and tasks.

### API Performance Evaluation and Optimization

Context:
Before scaling, API latency and payload efficiency need a dedicated pass across critical workflows.

TODOs:
- Deep analysis of query patterns, relationships, and loading strategy.
- Detect and reduce N+1 queries, redundant joins, and over-fetching.
- Minimize transportation/communication overload:
  - reduce unnecessary response fields,
  - enforce lean select/include strategy,
  - reduce avoidable client-server round-trips.
- Define and track concrete performance baselines for later optimization planning.

### Enterprise / Scale Follow-Ups

Context:
Large-client operations and reporting needs exceed current baseline capabilities.

TODOs:
- Chunked or append-oriented schedule flows for very large clients.
- Advanced bulk review operations after safeguards are proven.
- Richer audit/search/reporting surfaces.
- Data warehouse follow-up (Datastream + BigQuery).
- Formal reopen workflow with approval chain.

### Creator HR & Operations

Context:
People operations and cost inputs are required for long-term scheduling quality and financial visibility.

TODOs:
- Creator HRMS (leaves, unavailability input).
- Creator profile/HR separation table (grooming, styling, briefing records).
- Platform API integrations for auto-populating show performance data.
- Fixed cost tracking (rent, equipment depreciation).

### Creator Availability Logic Hardening

Context:
`/studios/:studioId/creators/availability` is currently intentionally loose to preserve discoverability in creator-mapping flows (especially search). Strict assignability semantics (overlap conflicts, roster policy, and currently-assigned handling) were deferred because requirements are still ambiguous.

TODOs:
- Define explicit endpoint semantics for discovery mode (broad searchable list) and strict-assignable mode (enforced overlap/eligibility constraints).
- Decide conflict handling for creators already assigned to the target show vs. assigned to overlapping shows.
- Decide whether roster membership should be optional, required, or policy-driven by studio settings.
- Coordinate strict-mode behavior with creator roster activation/defaults decisions from the merge-gap carry-over item.
- Add conflict metadata contract for FE (for example `is_conflicted`, `conflict_reason`) if strict mode is introduced.
- Align FE add-creator UX to chosen mode(s), including copy, filtering behavior, and empty-state messaging.
- Add BE/FE tests that lock expected behavior for search + assignment edge cases.

Deferred from: creator-mapping parity stabilization, March 2026.

### Lower-Priority UX Refinements

Context:
Useful improvements with no hard dependency on new backend contracts.

TODOs:
- Non-essential shift calendar interaction polish.
- Workflow enhancements that do not change backend contracts.
- Bulk review approve refinements.

### P&L Revenue Workflow — Full P&L Visibility

Context:
Phase 4 shipped the "L" side (creator compensation costs, shift labor costs) and the economics/performance backend endpoints. The "P" side (revenue input and contribution margin) was deferred because there is no clear data model design, no FE input workflow, and no UI. The economics endpoints are marked `@preview` and commission/hybrid creator costs show as $0 without revenue.

Open design questions to resolve before implementation:
- **GMV vs Sales distinction**: What does each represent in the live-commerce context? (GMV = total traded value including returns/cancelled orders; Sales = net settled revenue? Needs product definition.)
- **Revenue ownership model**: Is `ShowPlatform.gmv` the right location, or should financial outcomes live in a separate `ShowPlatformMetrics` table to support corrections, multi-snapshot, and audit trail?
- **Platform-specific metrics**: TikTok, YouTube, Shopee etc. have different revenue signals (gifting, super chats, ad rev). Should platform-specific extras go in `metadata` or typed columns?
- **Input workflow**: Who enters revenue and when? Post-show? Real-time? Import from platform API?
- **Numerical precision strategy**: Revenue, rate, commission, margin, and aggregate P&L calculations should move to `big.js`-based arithmetic instead of plain JS floating-point math.
- **Commission cost dependency**: COMMISSION/HYBRID creator cost calculation requires revenue. Without revenue, cost is $0. The economics service already supports this; it just needs a revenue value to be meaningful.
- **Compensation extensibility model**: current schema covers base fixed/commission/hybrid inputs, but not additional components (bonus, OT, special allocations). Decide whether these should be modeled as additive cost items (recommended) instead of overloading base rate fields.

TODOs (once design questions are resolved):
- Define and document the `gmv` vs `sales` distinction in `docs/product/BUSINESS.md`.
- Decide: extend `ShowPlatform` with typed columns, or introduce `ShowPlatformMetrics` table for financial outcomes.
- Introduce `big.js` as the standard financial arithmetic library for backend economics calculations and any frontend financial summaries that must match backend totals.
- Add FE input for revenue fields on the show platform form in `erify_studios` (currently only `viewer_count` is editable).
- Design and implement additive creator cost components:
  - add a dedicated cost-item model for per-show creator adjustments (bonus, OT, special allocation, and future types),
  - define calculation contract: `base compensation + sum(cost items)`,
  - support auditability fields (who/when/reason/metadata) for each cost item.
- Remove `@preview` markers from economics controller once UI ships.
- Update `apps/erify_api/docs/PHASE_4_PNL_BACKEND.md` status to ✅ Implemented once shipped.

Carry-over concerns to evaluate during Phase 5 implementation of the "P" side:
- **Schema validation contract (`createStudioCreatorRosterSchema`)**:
  - Current behavior can return `404` when `creator_id` is missing (falls through to lookup with empty ID).
  - Phase 5 decision: either keep as explicit debt with rationale, or tighten schema to return `400` for missing identifier input.
- **Bulk creator assignment write pattern**:
  - Current implementation is `O(n×m)` with sequential writes per show/creator pair. Request-size caps are now in place (`BULK_ASSIGN_MAX_CREATORS_PER_SHOW = 50`, `BULK_ASSIGN_MAX_SHOWS = 20`).
  - Phase 5 decision: define acceptable throughput bounds and add concurrency cap via `p-limit` or batched strategy if P&L workflows increase assignment volume beyond current limits.
- **P&L shift-cost distribution model**:
  - Current grouped P&L view evenly distributes total shift cost across shows in range.
  - Treat as known simplification unless product/accounting rules require per-show attribution changes during Phase 5.
- **Floating-point precision risk**:
  - Current financial calculations still rely on JS `number` arithmetic in parts of the economics flow.
  - Phase 5 should replace those paths with `big.js`-backed helpers before P&L is treated as production-grade financial reporting.
- **Baseline status drift (economics/performance endpoints)**:
  - Endpoint rollout status differs between branches/docs and can lead to planning assumptions that do not match current baseline reality.
  - Phase 5 should reconcile branch/doc status first, then finalize promotion sequencing for P&L follow-up.

Deferred from: Phase 4, March 2026.

### Task Submission Reporting & Export

Context:
Managers need a way to review and export submitted task data across many shows without generating throwaway report files in cloud storage.
Primary examples are moderation KPI rollups (`GMV`, `views`, show performance metrics) and premium-show QC review using post-production upload URLs.

Reference docs:
- [PRD: Task Submission Reporting & Export](../prd/task-submission-reporting.md)
- [Backend design](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)
- [Frontend design](../../apps/erify_studios/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)

Open design questions to resolve before implementation:
- **Review grain vs export grain**: should the manager preview be show-centric while export remains task/snapshot-centric?
- **Compatibility grouping**: grouping by `task_type + version` alone is unsafe because snapshot versions are local to each template; should the partition key be `template_uid + snapshot_version` or a future schema fingerprint?
- **Submitted-state contract**: should the default source states be `REVIEW + COMPLETED + CLOSED`, and do we need a typed `submitted_at` column instead of relying on metadata transitions?
- **Definition storage**: should saved report definitions be persisted server-side as JSON while fetched datasets remain client-cached in IndexedDB only?
- **Multi-output export UX**: for incompatible snapshot groups, should CSV export produce multiple files while XLSX uses one workbook with multiple sheets?
- **File URL stability**: if uploaded assets ever move to signed/expiring URLs, should reports export stable asset identifiers instead of raw URLs?

TODOs:
- Add studio-scoped source-catalog endpoints for reportable task templates/snapshot versions and field metadata.
- Add saved report-definition CRUD endpoints that persist only JSON selections and scope filters.
- Add batched query endpoint returning show metadata plus compatibility-grouped submitted-task rows.
- Keep report materialization on the client and cache fetched batches in IndexedDB for rerun/review.
- Support numeric summaries for selected number fields and link-based review for file/url fields.
- Export CSV for compatible datasets and support XLSX multi-sheet output for multi-group results.

Deferred from: Phase 4 wrap-up follow-up, March 2026.

### Full-Text Search and Attribute Filtering

Context:
Current search across `erify_api` is limited to simple LIKE/iLike queries on individual fields. As entity counts grow (creators, shows, tasks, templates, studio members), users need richer search — both relevance-ranked text search and structured attribute filtering similar to the Elasticsearch filter DSL (e.g. `creator_type:host status:active studio_id:x`). The goal is to support compound, attribute-scoped queries without requiring a full external search engine unless warranted.

Open design questions to resolve before implementation:
- **Engine choice**: Is PostgreSQL native FTS (`tsvector` / `tsquery` + GIN indexes) sufficient, or does query volume and ranking complexity justify a dedicated engine (e.g. Typesense, Meilisearch)?
- **Filter DSL surface**: Should structured attribute filtering be exposed as typed query params (`?creator_type=host&status=active`) or as a unified filter string parsed server-side? Which approach maps better to the frontend filter UX?
- **Index strategy**: Which entities are high-value search targets? Candidates: `Creator`, `Show`, `Task`, `TaskTemplate`, `StudioMember`. What columns belong in the search index vs. staying filter-only?
- **Ranking and relevance**: Is keyword relevance ranking needed, or is filtered + paginated list sufficient for the current use cases?
- **Sync strategy**: If an external engine is chosen, how are index writes kept in sync with Prisma mutations (synchronous, event-driven, or scheduled reconciliation)?

TODOs (once design questions are resolved):
- Identify high-value search surfaces and define per-entity field coverage (full-text fields vs. filterable attributes).
- Define the attribute filter contract: field names, supported operators, and how they map to Prisma `where` clauses or search engine filter syntax.
- Prototype PostgreSQL FTS on the highest-volume entity (likely `Creator` or `Task`) to establish a latency and relevance baseline before evaluating external engines.
- Design a backend filter-parsing layer that translates structured attribute queries into typed, validated Prisma filters — preventing injection and maintaining schema alignment.
- Add GIN indexes for any `tsvector` columns and composite indexes for high-cardinality filter combinations.
- Expose unified search/filter endpoints per entity, aligned with the existing admin/studio route patterns.
- Update frontend filter UIs to drive structured attribute queries rather than raw text searches where appropriate.

### Frontend API Contract Consistency (Tech Debt)

Context:
Some frontend pages use mixed pagination parameter names (`limit` and `pageSize`) for records-per-page behavior, creating inconsistency and avoidable integration friction.

TODOs:
- Standardize records-per-page query parameter usage to `limit` across frontend pages and related API calls.
- Remove or migrate `pageSize` usage in route/search state where it overlaps with `limit`.
- Align shared hooks/utilities and docs to a single pagination contract (`page` + `limit`).

### System Admin UX Searchability Refactor (Low-Frequency Feature Debt)

Context:
Several `erify_studios` `/system/*` screens rely on ID-based selection flows where copy/paste is inconvenient. These screens are lower-frequency but still need better usability for admin operations.

TODOs:
- Refactor relevant `/system/*` forms/filters to use combobox-style searchable selectors instead of raw ID input patterns.
- Update `/admin/*` endpoints to support search-input-driven lookup (name/keyword) in addition to direct ID targeting where appropriate.
- Reduce manual copy/paste friction in linking and lookup workflows while keeping existing admin capability coverage.
- Keep this as a lower-priority improvement unless blocked by current business-critical workflows.

### StudioShift / StudioShiftBlock Optimistic Versioning (Schema Tech Debt)

Context:
`StudioShift` and `StudioShiftBlock` are missing the universal `version Int @default(1)` field required for optimistic locking. Concurrent admin edits to the same shift currently resolve as last-write-wins with no conflict detection. `StudioCreator` (studio_creators) already received this field in Phase 4.

TODOs:
- Add `version Int @default(1)` to both `StudioShift` and `StudioShiftBlock` in the next migration that already requires a schema change for this domain. Do not create a standalone migration for this alone.
- Expose `updateByIdWithVersionCheck` in `StudioShiftRepository` following the same CAS pattern as `StudioCreatorRepository` (uses `updateMany` + `VersionConflictError` on `count === 0`).
- Update `StudioShiftService` callers that need version-guarded writes to use the new method.

Deferred from: `feat/studio-shift-schedule` PR review, March 2026.

### Restore Workflow with Optimistic Versioning (Feature + Tech Debt)

Context:
Soft-delete exists in multiple areas, but restore behavior is not standardized. Adding restore for task templates and other records while preserving optimistic versioning needs careful workflow and data-integrity reasoning.

TODOs:
- Evaluate restore support for task templates first, then other soft-deleted records.
- Define optimistic-versioning behavior during restore:
  - whether restore increments version,
  - how restore handles stale clients/version conflicts,
  - whether restore requires latest-version precondition.
- Analyze workflow and permission model:
  - who can restore by role,
  - when restore should be blocked (dependencies, replaced records, policy constraints),
  - expected audit trail for restore events.
- Define API and UX contract candidates:
  - restore endpoint/payload shape,
  - list/filter behavior for deleted/restorable records,
  - user feedback for conflict/retry paths.

## Promotion Rule (From Parking Lot to Planned Phase)

A Phase 5 item should move into active planning only when:
- it becomes necessary to ship a current business goal,
- it changes a backend contract that Phase 4 depends on, or
- it has a clear owner, scoped deliverables, and testable exit criteria.
