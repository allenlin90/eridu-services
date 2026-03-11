# Phase 5: Parking Lot and TODO Backlog

> **Status**: Deferred / parking lot
> **Planning stance**: Keep backlog context and rationale here; promote only the items that become necessary after the Phase 4 merge baseline stabilizes.

## Purpose

Phase 5 is a backlog of valuable follow-up initiatives that remain intentionally deferred while the Phase 4 merge baseline is still settling.
The goal is to preserve context and rationale now, then promote only the items that have clear owners, sequencing, and exit criteria.

Two items are expected to promote first once the current merge train lands cleanly:

- finish the canonical `creator` naming transition and deprecate legacy `mc` compatibility layers,
- redesign and deliver the revenue-side P&L workflow that Phase 4 intentionally deferred.

## Priority Carry-Over: Canonical Creator Naming and Legacy `mc` Deprecation

Context:
The Phase 4 branch contains a large creator refactor plus workflow updates that need controlled merge slicing. The codebase still has mixed `mc` / `creator` naming across backend modules, package exports, schemas, docs, and tests.

Phase 5 treats completion of that transition as a named workstream, not incidental cleanup. The objective is to make `Creator` canonical everywhere user-facing and developer-facing.

Policy update (2026-03-11):
- Environment is alpha and low-traffic.
- Creator rename/refactor should use direct cutover by default.
- Do not introduce new compatibility layers unless a hard blocker is discovered.
- Merge slicing plan is tracked in `docs/roadmap/PHASE_4_MERGE_PROGRAM.md`.

Progress note (2026-03-10):
- Initial creator refactor started in `erify_studios` show mapping/dashboard flows.
- Backend creator UID transition landed:
  - New creator IDs are generated as `creator_...`.
  - Backfill strategy used for rollout: one-time script-based cutover (now retired after stabilization).
- Accepted ADR published: `docs/adr/0002-creator-naming.md`.

Phase 5 naming contract:
- `Creator` is the canonical domain term across BE, FE, shared packages, docs, and new code.
- `MC` remains only as business classification metadata (`creatorType` or equivalent), or in explicitly historical references.
- Legacy `mc_*` fields, package entrypoints, and module aliases should be removed in merge scopes, not expanded.
- Persistence/model/table renames are acceptable when bundled with the scoped merge unit and verified end-to-end.

Implementation checklist:
- [ ] Freeze new legacy naming at the boundary:
  - No new modules, DTOs, exports, hooks, routes, or docs should introduce fresh `mc`-first naming.
  - New compatibility aliases are disallowed by default.
- [ ] Complete backend module/import consolidation:
  - `mc` -> `creator`
  - `show-mc` -> `show-creator`
  - `studio-mc` -> `studio-creator`
  - Remove legacy re-export barrels when touched by scope work.
- [ ] Align API schemas and DTO contracts to creator-first naming:
  - Remove canonical field drift (`mcId` vs `creatorId`, `mc_*` vs `creator_*`).
  - Use direct creator-first request/response contracts for active APIs.
- [x] Align creator UID generation with creator-first naming:
  - New IDs use `creator_`.
  - Legacy data normalization is handled via one-time backfill/migration tooling, not long-lived runtime aliases.
- [ ] Enforce direct-cutover merge boundaries:
  - Each merge scope must be reviewable and revertable.
  - Prefer branch-per-scope to multi-topic merge bundles.
- [ ] Consolidate persistence/schema naming decisions with real schema work:
  - Schema rename work can ship directly when isolated to a clear scope.
  - Validate local reset/migrate/seed/backfill flow in the same scope.
- [ ] Complete frontend and package cleanup:
  - Rename feature modules, hooks, query keys, route copy, and API clients to creator-first terms.
  - Keep URL/search behavior parity unless there is an explicit product reason to change it.
  - Remove legacy package entrypoints such as `@eridu/api-types/mcs` when no active import remains. (completed on 2026-03-11)
- [ ] Re-validate authorization and behavior parity after renaming:
  - Studio creator roster, show creator assignment, creator availability, and economics access rules.
- [ ] Update canonical docs and agent knowledge:
  - `apps/erify_api/docs/MC_OPERATIONS.md` or its creator-first replacement
  - `apps/erify_studios/docs/MC_MAPPING.md` or its creator-first replacement
  - `docs/roadmap/PHASE_4.md`, `docs/roadmap/PHASE_5.md`
  - Relevant `.agent/skills/*`, workflows, and package READMEs that still instruct `mc` terminology
- [ ] Run required verification gates before merge:
  - `pnpm --filter erify_api lint`
  - `pnpm --filter erify_api typecheck`
  - `pnpm --filter erify_api test`
  - `pnpm --filter erify_studios lint`
  - `pnpm --filter erify_studios typecheck`
  - `pnpm --filter erify_studios test`
  - Add `build` verification for any package/app whose public exports or wiring changed
- [ ] Remove remaining compatibility shims in final cutover scopes:
  - Delete legacy alias exports, DTO aliases, and compatibility barrels in runtime paths.
  - Confirm no remaining `MC` domain references outside historical schema names, migration history, or archived documentation.

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
Phase 4 introduced studio-scoped/grouped structures. Creator-facing workflows should align with that model and finish the creator-first terminology shift.

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

### Lower-Priority UX Refinements

Context:
Useful improvements that should not interrupt Phase 4 delivery.

TODOs:
- Non-essential shift calendar interaction polish.
- Workflow enhancements that do not change backend contracts.
- Bulk review approve refinements.

### P&L Revenue Workflow — Full P&L Visibility (Phase 4 Deferred)

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
- Design and implement additive creator cost components (deferred until after Phase 4 cutover baseline):
  - add a dedicated cost-item model for per-show creator adjustments (bonus, OT, special allocation, and future types),
  - define calculation contract: `base compensation + sum(cost items)`,
  - support auditability fields (who/when/reason/metadata) for each cost item.
- Remove `@preview` markers from economics controller once UI ships.
- Update `SHOW_ECONOMICS.md` status to ✅ Implemented.

Carry-over concerns to evaluate during Phase 5 implementation of the "P" side:
- **Schema validation contract (`createStudioCreatorRosterSchema`)**:
  - Current behavior can return `404` when both `creator_id` and `mc_id` are missing (falls through to lookup with empty ID).
  - Phase 5 decision: either keep as explicit debt with rationale, or tighten schema to return `400` for missing identifier input.
- **Bulk creator assignment write pattern**:
  - Current implementation is `O(n×m)` with sequential writes per show/creator pair and no request-size max guard.
  - Phase 5 decision: define acceptable throughput bounds and add max-items guard and/or batched strategy if P&L workflows increase assignment volume.
- **P&L shift-cost distribution model**:
  - Current grouped P&L view evenly distributes total shift cost across shows in range.
  - Treat as known simplification unless product/accounting rules require per-show attribution changes during Phase 5.
- **Floating-point precision risk**:
  - Current financial calculations still rely on JS `number` arithmetic in parts of the economics flow.
  - Phase 5 should replace those paths with `big.js`-backed helpers before P&L is treated as production-grade financial reporting.
- **Legacy compatibility barrel cleanup**:
  - `studio-show-mc.orchestration.service.ts` is currently a compatibility re-export.
  - Remove only after all imports/consumers migrate to creator-first module names.
- **Cutover scope protection**:
  - Keep compensation model redesign (bonus/OT/special allocations) out of current Phase 4 cutover PRs to avoid mixing rename/refactor risk with business-rule redesign.

Deferred from: Phase 4, March 2026.

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
`StudioShift` and `StudioShiftBlock` are missing the universal `version Int @default(1)` field required for optimistic locking. Concurrent admin edits to the same shift currently resolve as last-write-wins with no conflict detection. `StudioMc` (studio_creators) already received this field in Phase 4.

TODOs:
- Add `version Int @default(1)` to both `StudioShift` and `StudioShiftBlock` in the next migration that already requires a schema change for this domain. Do not create a standalone migration for this alone.
- Expose `updateByIdWithVersionCheck` in `StudioShiftRepository` following the same CAS pattern as `StudioMcRepository` (uses `updateMany` + `VersionConflictError` on `count === 0`).
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
