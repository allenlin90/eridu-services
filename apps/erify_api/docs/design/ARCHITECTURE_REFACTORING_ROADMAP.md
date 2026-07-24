# `erify_api` Architecture Refactoring — Implementation Roadmap

> **Status**: Active backlog for the accepted direction
> **Companion to**: [`ARCHITECTURE_REFACTORING_GUIDE.md`](./ARCHITECTURE_REFACTORING_GUIDE.md) · [visual walkthrough](./architecture-refactoring-visual.html)
> **Scope of this file**: the work that can start now — the scheduled foundation (Phases 0a–3) plus one adjacent correctness item. Phases 4–7 are trigger-gated and intentionally not scheduled here.

This is the follow-up task list for the direction concluded in PR #313. It exists so the foundation work can start without re-deriving scope. Keep the `Status` column current as items land.

## How every task is executed

Each task is one reviewable PR, run through the [`codebase-hardening-program`](../../../../.agents/skills/codebase-hardening-program/SKILL.md) lifecycle:

- Confirm the finding, keep the baseline green, and characterize behavior **before** any structural change; the change stays behavior-preserving unless the task is explicitly a correctness fix.
- Load the implementation skills listed on the task.
- Run `$knowledge-sync` whenever behavior, architecture guidance, or a reusable pattern changes; update the knowledge targets named on the task.
- Run `$pr-ready` against `origin/master` before merge, including the diff-scoped architecture trigger audit; record `NOT TRIGGERED`, `TRIGGERED — HANDLED`, `TRIGGERED — REGISTERED`, or `BLOCKING`.
- Run `$repository-health` at a phase boundary or within three months to compare trend signals.

**Working assumption**: no other feature or workflow is being introduced into the same `erify_api` areas while this runs. If that changes, the affected task re-runs its architecture-trigger and dependency review before continuing.

**Status legend**: 🔲 Planned · 🟡 In progress · ✅ Done · ⏸ Gated (waiting on a dependency).

## Critical path

`T1 → T9 → T11 → T12 → T13`. Everything else in Wave 0 runs alongside T1, so early wins land while the harness is being built. Sizes: **S** = hours · **M** = 1–2 days · **L** = multi-day / multiple PRs.

## Wave 0 — start now (parallel)

| ID | Task | Size | Starts | Status |
| --- | --- | --- | --- | --- |
| T1 | Phase 0a: isolated real-DB safety harness | L | now (blocks Wave 1–2) | ✅ |
| T2 | Phase 0b (light): record signals baseline | S | now, parallel | ✅ |
| T3 | MCP list hard maximums | S | now | ✅ |
| T4 | Remove dead/duplicate module wiring | S | now | ✅ |
| T5 | Remove empty OpenAPI dynamic module | S | now | ✅ |
| T6 | Type the `StudioGuard` membership value | S | now | ✅ |
| T7 | `UtilityService` simplification | M | now | ✅ |

### T1 — Phase 0a: isolated real-DB safety harness

- **Scope**: PostgreSQL/Prisma + CLS integration harness against a **dedicated** test database — never the Docker Compose dev volume or the dev `DATABASE_URL`; destructive reset commands may target only the validated test DB. Characterize one shallow CRUD flow, one show workflow, one schedule-publish rollback, and MCP runtime boot.
- **Gate**: none — this is the gate for behavior-bearing work.
- **Minimum invariant gates proven**: transaction writes roll back together; in-transaction reads see earlier writes; active reads exclude soft-deleted rows; public responses carry UIDs not internal IDs; the current unit suite stays green.
- **Skills**: `backend-testing-patterns`, `database-patterns`.
- **Knowledge sync**: `backend-testing-patterns`, `database-patterns`, and a real-DB test runbook/config.
- **Result**: the isolated PostgreSQL harness now proves transaction visibility,
  rollback, soft-delete filtering, UID-only API serialization, show
  orchestration, schedule-publish rollback, and MCP runtime composition without
  accepting the development database URL.

### T2 — Phase 0b (light): record signals baseline

- **Scope**: run `pnpm architecture:signals` and commit the output as the comparison baseline (module nodes, edges, cycles, shallow modules, exported repositories, MCP reachable modules). Defer runtime perf instrumentation (query count, payload, lock duration, latency) until just before Phase 5.
- **Gate**: none.
- **Skills**: `engineering-best-practices-enforcer`.
- **Knowledge sync**: `engineering-best-practices-enforcer`, `.agents/workflows/pr-review.md`, `.agents/workflows/repository-health.md`, and the guide baseline.
- **Result**: reproduced the guide's source snapshot with the maintained signal
  script and committed the exact output as
  [`architecture-signals-baseline.json`](./architecture-signals-baseline.json).
  Review and repository-health workflows now name that file as the comparison
  baseline. Runtime performance instrumentation remains deferred to the Phase
  5 gate.

### T3 — MCP list hard maximums

- **Scope**: add a hard `.max()` ceiling to the MCP `limit` parameter in `mcp-tool.service.ts` (today it has a minimum and default but no maximum). Independent live-surface fix — do not wait for T1.
- **Gate**: none — verify with the existing MCP specs.
- **Skills**: `service-pattern-nestjs`.
- **Result**: both studio-wide list tools reject `limit > 100` at the shared
  Zod tool/service boundary; focused specs prove rejection occurs before any
  query service is called.

### T4 — Remove dead/duplicate module wiring

- **Scope**: remove the duplicate `AuditModule` import in `studio-show.module.ts`, other unused module imports, and the unnecessary root-module re-exports (`AdminModule` / `BackdoorModule` / `MeModule` / `StudiosModule` re-export children that only `AppModule` imports — treat them as composition roots, not public barrels).
- **Gate**: none — module-wiring test plus build.
- **Result**: the composition roots now import their child modules without
  re-exporting them as public barrels, duplicate or unused imports are removed,
  and a real application-module integration test proves the full Nest graph
  still boots.

### T5 — Remove empty OpenAPI dynamic module

- **Scope**: confirm `openapi.module.ts` has no runtime role (grep usages), then remove it.
- **Gate**: none — bootstrap/OpenAPI wiring verification plus build.
- **Result**: removed the empty module and its `AppModule` registration.
  `setupOpenAPI()` remains the single bootstrap path; a focused spec pins
  document creation plus `/swagger-json` and `/api-reference` registration.

### T6 — Type the `StudioGuard` membership value

- **Scope**: replace `any` for the authorization-critical membership value with its real type.
- **Gate**: none — focused guard specs plus typecheck.
- **Skills**: `erify-authorization`.
- **Result**: the guard derives its membership type from
  `UserService.getStudioMembership`, uses an assertion function to narrow the
  missing-membership branch, and performs role checks plus request attachment
  without `any` or non-null assertions.

### T7 — `UtilityService` simplification

- **Scope**: replace the injected two-function service (`generateBrandedId`,
  `isTimeOverlapping`) with pure functions in `shared/util`, or narrow it to a
  real injectable adapter only if deterministic ID injection is actually
  required. Touches ~48 importers and the `BaseModelService` UID-generation
  constructor contract — land it as one mechanical PR.
- **Gate**: none — existing unit baseline plus focused utility/service specs; no real-DB dependency.
- **Skills**: `service-pattern-nestjs`.
- **Knowledge sync**: `service-pattern-nestjs` (the UID-generator /
  `BaseModelService` contract).
- **Result**: deterministic UID generation remains a narrow injectable adapter
  for service-test control, while time-range overlap is a pure function.
  Audience/controller wrappers no longer import the UID module transitively;
  only modules that provide UID-dependent services own that dependency. The
  architecture signal moved from 48 generic utility-module importers to 25
  UID-generator owners, and static module edges fell from 268 to 252.

## Adjacent — startable now (roadmap correctness, not an architecture phase)

| ID | Task | Size | Starts | Status |
| --- | --- | --- | --- | --- |
| T8 | Roadmap item 8: admin status write-path hardening | S–M | now | ✅ |

### T8 — Roadmap item 8: admin status write-path hardening

- **Scope**: mirror the studio-level guard on the admin status path (or extract a shared helper both call), and apply the gate-owned-status exclusions to admin status lookups. State-independent; it neither needs nor prejudges item 18's lifecycle design.
- **Gate**: none.
- **Skills**: `erify-authorization`, `secure-coding-practices`,
  `show-production-lifecycle`.
- **Reference**: [`PHASE_5.md`](../../../../docs/roadmap/PHASE_5.md) item 8.
- **Result**: admin and studio generic show edits share one status-write policy
  that rejects entering or leaving either cancellation-gate-owned status.
  Their status lookup lists share the same exclusion constant, while the
  dedicated cancellation gate remains the only manual transition path for
  those statuses.

## Wave 1 — after T1 merges (harness available)

| ID | Task | Size | Gate | Status |
| --- | --- | --- | --- | --- |
| T9 | Fix `BaseRepository.restore()` + tx-aware lazy delegate | M | T1 | ✅ |
| T10 | Reassess the 1,000-item schedule bulk limit | S | T1 | ✅ |

### T9 — Fix `BaseRepository.restore()` + transaction-aware lazy delegate

- **Scope**: fix the broken generic `restore()` (it adds `deletedAt: null` to its predicate and cannot restore a soft-deleted row) and implement the transaction-aware lazy delegate, or stop using inherited base writes inside transactions.
- **Gate**: T1 — real-DB transaction, restore, and rollback characterization.
- **Skills**: `repository-pattern-nestjs`, `database-patterns`, `soft-delete-restore`.
- **Knowledge sync**: `repository-pattern-nestjs` §6, `soft-delete-restore`, `database-patterns` §1/§3, and close/rewrite the lazy-delegate row in [`erify-api-refactor-residuals.md`](../../../../docs/tech-debt/erify-api-refactor-residuals.md).
- **Result**: every `BaseRepository` delegate now resolves lazily through the
  ambient `TransactionHost`, inherited writes participate in rollback, and the
  generic restore targets only soft-deleted rows before returning them to
  active reads.

### T10 — Reassess the 1,000-item schedule bulk limit

- **Scope**: use the isolated harness to collect task-scoped timeout and partial-success evidence for the bulk path, then judge the maximum. Preserve the established sequential partial-success contract unless measurements justify a change; the likely outcome is "no change, now documented." This is targeted characterization, not the deferred Phase 0b runtime-performance baseline.
- **Gate**: T1 (isolated safety harness).
- **Skills**: `database-patterns`, `schedule-continuity-workflow`.
- **Result**: retain the 1,000-item maximum and sequential partial-success
  contract. Three isolated PostgreSQL runs with a forced failure at item 500
  completed create in 2.31–4.78 seconds and update in 1.82–3.85 seconds; every
  run returned 999 successes and committed items after the failure.
  Representative request bodies were about 325 KB for create and 131 KB for
  update, so
  `BODY_PARSER_LIMIT` remains an independent byte-size gate: the 100 KB local
  default cannot carry this representative maximum, while the 2 MB Railway
  example can. The opt-in measurement is reproducible through the integration
  runner and does not slow the normal safety suite.

## Wave 2 — the pilot (gates the rest)

| ID | Task | Size | Gate | Status |
| --- | --- | --- | --- | --- |
| T11 | Phase 2: `ShowStatus` persistence pilot | M | T1 · T9 | ✅ |
| T12 | Persistence-matrix acceptance (doctrine reconciliation) | M | T11 passes | ✅ |

### T11 — Phase 2: `ShowStatus` persistence pilot

- **Scope**: keep `ShowStatusService`'s public methods and API contracts stable; fold the shallow repository into the service via the transaction-aware delegate, or replace it with a small private query provider if pagination warrants. Evaluate files/registrations/mocks removed, controller-to-DB readability, soft-delete and transaction parity, whether any caller needed a repository API, and whether Prisma types leaked into the public contract.
- **Gate**: T1 and T9 — the isolated harness and transaction-aware delegate must be available before the pilot.
- **Skills**: `repository-pattern-nestjs`, `service-pattern-nestjs`.
- **Result**: passed. The repository file, provider registration, and repository
  mock seam were removed. `ShowStatusService` now owns bounded pagination and
  active-row predicates through `TransactionHost.tx.showStatus`; schema-defined
  service types avoid public `Prisma.*` signatures. Focused caller specs and the
  real-PostgreSQL harness preserve CRUD, soft-delete, transaction visibility,
  and rollback behavior. T12 remains the separate acceptance and doctrine gate.

### T12 — Persistence-matrix acceptance (doctrine reconciliation)

- **Scope**: only if T11 passes behavior, rollback, and reviewability. Flip the pilot-gated persistence rule to canonical by reconciling **in one PR** every doc that asserts "repository for all DB access": `AGENTS.md`, `repository-pattern-nestjs`, `service-pattern-nestjs`, `orchestration-service-nestjs`, `design-patterns`, the soft-delete rules in `database-patterns`, and [`ARCHITECTURE_OVERVIEW.md`](../../../../docs/engineering/ARCHITECTURE_OVERVIEW.md) Key Decision 6 plus its layer diagram.
- **Gate**: T11 passes.
- **Skills**: `repository-pattern-nestjs`, `service-pattern-nestjs`, `design-patterns`.
- **Result**: accepted. Capability services may use direct
  `TransactionHost.tx` for shallow bounded CRUD; complex or reusable persistence
  remains private behind a repository, store, or query provider. Canonical
  instructions, architecture docs, review agents, and supplementary memories
  were reconciled in the same change.

## Wave 3 — first capability consolidation

| ID | Task | Size | Gate | Status |
| --- | --- | --- | --- | --- |
| T13 | Phase 3: consolidate the show catalog | L | T11 · T12 pass | ✅ |

### T13 — Phase 3: consolidate the show catalog

- **Scope**: group show type, status, standard, and platform reference data under one `ShowCatalogModule`; remove one-Nest-module-per-table registration where no independent public interface exists; move admin catalog controllers next to the capability with routes and guards unchanged; export only the services or queries other capabilities use.
- **Gate**: T11 and T12 pass.
- **Skills**: `backend-controller-pattern-nestjs`, `design-patterns`.
- **Knowledge sync**: `design-patterns`, `backend-controller-pattern-nestjs`, `ARCHITECTURE_OVERVIEW.md`.
- **Result**: `ShowCatalogModule` now owns the four reference-data services,
  private repositories, and colocated admin controllers. It replaces eight
  table/audience wrapper modules while preserving the four route prefixes.
  `PlatformRepository` is private; workflows use
  `PlatformService.findActiveByUids()`. Static signals moved from 90 to 83 Nest
  modules, 293 to 269 module edges, and 75 to 68 modules at or below 20 lines,
  with zero cycles.

## Not in scope now

Trigger-gated and intentionally excluded from this backlog:

- **Phase 4** (dissolve `studio-show-management` into `ShowOperationsModule`) — activates with roadmap **item 18**.
- **Phase 5** (decompose `PublishingService`) — activates only when item 18's publish integration or measured query/lock/rollback risk justifies it.
- **Phase 6** (scoped `ShowQueries` / `TaskQueries` providers and MCP narrowing) — travels with Phase 4.
- **Phase 7** — a decision checkpoint for CQRS, workers, read models, package or database splits; not code.
- **Roadmap item 18 itself** — a separately planned behavior-changing lifecycle workstream.
