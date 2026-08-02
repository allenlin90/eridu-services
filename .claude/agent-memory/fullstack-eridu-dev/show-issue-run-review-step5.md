---
name: show-issue-run-review-step5
description: Phase 5 item 9 step 5 (Show Run Review issues surface) implementation notes — Prisma groupBy _count gotcha, in-DB pagination precedent, doc annotation convention
metadata:
  type: project
---

Implemented on branch `feat/show-issue-run-review` (off `integration/show-issue-ownership`, steps 1-4 already merged). Design doc: `apps/erify_api/docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md`. Feature is now complete (all 5 Delivery Sequence steps shipped) — item 9 is done; only the roadmap-row flip in `docs/roadmap/PHASE_5.md` remains, owned by the main integration PR (#357).

**Why:** Closes out the show-issue-ownership feature; the main integration PR #357 can now finalize once this child branch merges.

**How to apply:** If Phase 5 item 9 needs any follow-up work, check this file plus `show-issue-ownership-implementation.md` and `show-issue-reconciliation-step4.md` for prior decisions before re-deriving them.

## Prisma `groupBy` `_count` gotcha

`this.delegate.groupBy({ by: ['severity'], where, _count: true })` — passing `_count: true` (not `_count: { _all: true }`) makes Prisma return `_count` as a **plain number** per group row (`row._count`), not an object (`row._count._all`). This differs from the more common pattern already in this codebase (`task-template.repository.ts` uses `_count: { _all: true }` → `row._count._all`). Verified by reading the generated Prisma client's `GetShowIssueGroupByPayload` type directly (`_count: true` → `T[P] extends boolean ? number : ...`). Don't assume the `_count._all` shape without checking which form was passed.

Used in `ShowIssueRepository.countUnresolvedBySeverity` (`apps/erify_api/src/models/show-issue/show-issue.repository.ts`) — backfills all 4 severities to 0 before merging in groupBy results, since Prisma omits zero-count groups.

## In-DB pagination as new precedent for ShowRunReviewService

`ShowRunReviewService`'s four pre-existing sub-resources (creators/violations/tasks/shows) all load the full show graph via `loadReviewShows()` and slice arrays in JS with a private `paginate()` helper. The new `getShowRunReviewIssues` method is the **first** to break that pattern — it calls `showIssueService.listShowIssues(filters, { skip, take })` directly, which runs `take`/`skip`/`count` in PostgreSQL via `ShowIssueRepository.findPaginated` (no show-graph load at all). If a future 6th sub-resource is added and the underlying data has its own paginated repository already, prefer the issues-tab pattern (direct DB pagination) over the four legacy in-memory ones — don't copy the legacy pattern by default.

`ShowOrchestrationModule` now imports `ShowIssueModule` (previously it didn't) so `ShowRunReviewService` can inject `ShowIssueService`. `ShowIssueRepository` stays private/unexported — `architecture:signals` confirmed 0 new exported repositories after this change.

## Additive filter pattern: `statusIn` alongside `status`

`ListShowIssuesFilters.statusIn?: string[]` was added alongside the existing single-value `status` field in `apps/erify_api/src/models/show-issue/schemas/show-issue.schema.ts`. In `ShowIssueRepository.buildWhere`, the `statusIn` check runs **before** the `status` check so that if both are ever set, exact-match `status` wins (overwrites `where.status`) — this is an intentional priority order, not accidental. Only `ShowRunReviewService` ever sets `statusIn` (defaults to `['OPEN', 'IN_PROGRESS']` when the caller passes no explicit `status`). The public `/studios/:studioId/show-issues` API-layer filter schema was NOT touched — `statusIn` is a service-layer-only field.

## Design doc annotation convention

`SHOW_ISSUE_OWNERSHIP_DESIGN.md`'s numbered "Delivery Sequence" list (steps 1-5) has **no per-item PR-link annotation** — only the top `> **Status**:` line gets updated as steps ship. PR-number references appear elsewhere in body prose (e.g. under "Automated Reconciliation"), but never inline on the numbered list itself. Don't invent a new per-item annotation style; just update the Status line.

## Real-DB integration test runner has no test-name filter

`pnpm -C apps/erify_api test:integration -- <pattern>` does NOT work — `test/run-integration-tests.mjs` only accepts `--bulk-schedule-measurement` and rejects any other argument. Must run the full integration suite (all specs in `test/integration/`) every time; there's no way to target a single new spec file. Full suite takes ~7s locally so this isn't a real cost, just don't waste time trying `-- <filename>`.
