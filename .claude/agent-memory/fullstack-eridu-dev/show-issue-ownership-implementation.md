---
name: show-issue-ownership-implementation
description: Phase 5 item 9 (Show-level issue ownership) Delivery Sequence steps 1-3 implementation — files, route shape, module layout, and what's deferred to later passes.
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

**Step 3 (2026-08-02): `erify_studios` show-detail Issues tab.** Frontend-only,
no backend changes needed — the shipped API/schema matched the frontend
contract exactly (no integration bugs found). Key files:
- Route: `apps/erify_studios/src/routes/studios/$studioId/shows/$showId/issues.tsx`,
  tab link added to the parent `route.tsx` (placed before "Publish Audit").
  New `studio-route-access.ts` key `showIssues` — deliberately matches
  `showTasks`'s broad member-inclusive role set (MEMBER, DESIGNER,
  MODERATION_MANAGER, MANAGER, TALENT_MANAGER, ADMIN — excludes
  ACCOUNT_MANAGER), not the narrower `[MANAGER, ADMIN, MEMBER]` a literal
  reading of the task brief suggested, because the design doc's "any active
  member with show access" read-gate maps to the existing `showTasks`
  convention, not `showAudits`'s manager-only one. ADMIN/MANAGER-only
  affordances (create/escalate/reopen, full edit) are enforced at the
  component level inside `show-issue-actions-cell.tsx`, not the route gate.
- `apps/erify_studios/src/features/studio-shows/{api,components,config,hooks,lib}/show-issue-*`:
  full CRUD API layer (list + create/update/resolve/reopen/escalate, one file
  each, mirroring `create-studio-show.ts`/`update-studio-show.ts`), a
  `useShowIssues` feature hook (`useTableUrlState` + query, mirrors
  `use-studio-creator-roster.ts`), `ShowIssuesTable` (DataTable +
  DataTableToolbar + DataTablePagination, mirrors `studio-members-table.tsx`),
  5 dialogs (create/edit/resolve/reopen/escalate), and a
  `ShowIssueActionsCell` using the shared `DataTableActions` kebab menu.
- **Owner filter scope decision**: the toolbar's `owner_id` combobox filter
  is gated to `canManageIssues` (ADMIN/MANAGER) because it queries
  `/studios/:studioId/members`, which is ADMIN/MANAGER-only
  (`StudioMembersController`). Non-privileged readers still get
  status/severity/category filters. The owner *field* in create/edit dialogs
  uses the same `/members` endpoint via a shared memoized
  `ShowIssueOwnerField` — also implicitly ADMIN/MANAGER-only since only they
  can open those dialogs.
- **Edit action has two modes** (`show-issue-edit-dialog.tsx`): `full` for
  ADMIN/MANAGER (all fields + optional "Mark as In Progress" checkbox when
  OPEN), `start-only` for an assigned member on their own OPEN issue (just a
  confirmation that PATCHes `{ version, status: 'IN_PROGRESS' }` — no other
  fields shown, matching the backend's real enforcement that a self-service
  PATCH may only ever contain that one field).
- **React Compiler gotcha caught by lint**: `react-hooks/set-state-in-effect`
  fires on the obvious `useEffect(() => setForm(deriveFrom(issue)), [issue])`
  reset-on-target-change pattern used in `ShowCreatorCompensationDialog`-style
  code elsewhere in this repo. Fixed by extracting an inner
  `*DialogBody` component keyed on `issue?.id ?? 'empty'` (the
  `frontend-state-management` "keyed state entry" pattern) so switching the
  dialog's target issue remounts fresh local state instead of an effect
  writing it. Applied to all 4 stateful dialogs (edit/resolve/reopen/escalate).
- Route file requires `pnpm --filter erify_studios build` (or `vite dev`) run
  at least once after adding a new route file — `tsc -b --noEmit` alone does
  NOT regenerate `src/routeTree.gen.ts`; typecheck will pass on stale route
  types silently until the tree is regenerated by the `@tanstack/router-plugin`
  Vite plugin.
- Deferred/not built this pass: manual live-browser verification (dev
  servers + seeded studio/show/membership were not already running locally
  and standing them up was out of scope for the turn budget) — verified via
  full lint/typecheck/build/test only. Automated-issue reconciliation UI
  (step 4) and Show Run Review summary (step 5) remain unbuilt, per the
  design doc's Delivery Sequence.
