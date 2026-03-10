# Phase 5: Parking Lot and TODO Backlog

> **Status**: Deferred / parking lot
> **Planning stance**: Keep context and rationale; defer detailed execution planning until Phase 4 is complete.

## Purpose

Phase 5 is a backlog of valuable follow-up initiatives that are intentionally deferred while Phase 4 is still in progress.
The goal is to preserve context and reasons now, then convert selected items into proper scoped plans later.

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

### Creator App Expansion (MCs and Creators)

Context:
Phase 4 introduced studio-scoped/grouped structures. Creator-facing workflows should align with that model.

TODOs:
- Expand creator app capabilities for MCs and creators by studio scope.
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

### MC HR & Operations

Context:
People operations and cost inputs are required for long-term scheduling quality and financial visibility.

TODOs:
- MC HRMS (leaves, unavailability input).
- MC profile/HR separation table (grooming, styling, briefing records).
- Platform API integrations for auto-populating show performance data.
- Fixed cost tracking (rent, equipment depreciation).

### Lower-Priority UX Refinements

Context:
Useful improvements that should not interrupt Phase 4 delivery.

TODOs:
- Non-essential shift calendar interaction polish.
- Workflow enhancements that do not change backend contracts.
- Bulk review approve refinements.

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
