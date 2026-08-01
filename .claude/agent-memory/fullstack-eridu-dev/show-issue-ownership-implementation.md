---
name: show-issue-ownership-implementation
description: Phase 5 item 9 (Show-level issue ownership) Delivery Sequence steps 1-2 implementation — files, route shape, module layout, and what's deferred to later passes.
metadata:
  type: project
---

Implemented 2026-08-01: `apps/erify_api/docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md`
Delivery Sequence steps 1 (Prisma model/migration, repository/service,
`SHOW_ISSUE` audit-target extension, model tests) and 2 (manual workflow API:
authorization, optimistic locking, audit coverage, controller/service tests).

**Why**: gives Studio Admin/Manager/assigned-member a dedicated advisory record
for show-level exceptions (equipment, attendance, platform violations, etc.)
distinct from Task (executable work) and Audit (immutable history).

**How to apply**: steps 3-5 (show detail Issues tab, transactional
attendance/platform-violation reconciliation via
`ShowIssueReconciliationService`, Show Run Review summary counts) are NOT yet
built — do not assume `origin: 'FACT_EXTRACTION'` issues exist in the wild yet.
`FactExtractionModule` does not import the show-issue orchestration module.

**Key files**:
- Prisma model: `ShowIssue` in `apps/erify_api/prisma/schema.prisma` (near
  `ShowPlatformViolation`), migration
  `apps/erify_api/prisma/migrations/20260801161934_show_issue_ownership/`.
  category/origin/severity/status/resolutionCode are plain `String` columns
  (not native Prisma enums) validated at the Zod boundary — matches
  `ShowPlatformViolation.severity`/`Audit.action` precedent in this schema.
- `@eridu/api-types/show-issues` — new subpath, wire schemas + types.
- `apps/erify_api/src/models/show-issue/` — `ShowIssueService` (model,
  UID_PREFIX `issue`) + `ShowIssueRepository` (private, extends
  `BaseRepository`, justified by the studio-scoped multi-filter list query and
  version-checked update). `ShowIssueModule` exports only the service.
- `apps/erify_api/src/show-issue-orchestration/` — `ShowIssueWorkflowService`
  (manual workflow: authorization matrix, `@Transactional()` on every write
  method, audit writes). Injects `ShowRepository` directly (existing exported
  repository, same pattern as `ShowCancellationGateService`).
- `apps/erify_api/src/studios/studio-show-issue/` — `StudioShowIssueController`.

**Route shape deviation from the task's literal instruction**: the design doc's
API contract is `GET/POST /studios/:studioId/show-issues` — a **top-level**
studio-scoped collection, NOT nested under `/shows/:id/`, because ShowIssue has
its own UID/audit-trail/pagination/soft-delete lifecycle (AGENTS.md route-shape
rule). `show_id` is an explicit `POST` body field and a list filter, not a path
param. Caught this by reading the design doc's literal route list, not by
assuming show-scoping from the task summary.

**Authorization matrix implementation**: Admin/Manager get route-level
`@StudioProtected([ADMIN, MANAGER])` on create/reopen/escalate. PATCH and
resolve use `@StudioProtected()` (any active member) at the route + fine-grained
checks inside `ShowIssueWorkflowService` (assigned member may set
`status: 'IN_PROGRESS'` on their OWN issue via PATCH — and nothing else in the
same payload — or resolve their own issue; nothing else).

**Bug caught by the real-DB integration gate** (`pnpm -C apps/erify_api
test:integration`, `test/integration/show-issue-persistence.integration-spec.ts`):
see [[optimistic-lock-expected-version-bug-pattern]] — the workflow originally
reused the freshly-refetched `current.version` instead of the client's
`dto.version` for the optimistic-lock check, silently defeating it. Fixed by
threading `expectedVersion` as an explicit separate parameter through
`ShowIssueService.updateShowIssueFields/resolveShowIssue/reopenShowIssue/escalateShowIssue`.

**REFACTORING_TARGETS.md targets touched**: RT-01 (capability-first
placement — satisfied: controller → workflow use case → model service →
private repository), RT-05 (private persistence boundaries — touch-gated by
injecting the already-exported `ShowRepository`; exit criteria satisfied, no
new repository export added, no Prisma types leak from
`ShowIssueWorkflowService`'s public API), RT-07 (boundary verification —
satisfied via the new integration spec + updated `app-runtime.integration-spec.ts`
boot check).
