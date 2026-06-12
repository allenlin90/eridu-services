# erify_api Refactor — Work Items Backlog

**Companion to:** `erify-api-pattern-audit-refactor-plan.md` (themes T1–T11, decisions D1–D13).
**Date:** 2026-06-12
**Goal:** Execute the hardening program as discrete, behavior-preserving tickets. Each item lists scope, the **test strategy that locks feature + expectation**, acceptance criteria, decision dependencies, risk, and effort.

## How to use this backlog

**Behavior-preserving discipline (non-negotiable):**
- **Baseline is green** — `erify_api`: typecheck clean, **130 suites / 1157 tests pass**. Re-run `pnpm --filter erify_api test` before and after every ticket; it must stay green.
- **Characterization-first for refactors.** Any ticket that restructures behavior-bearing code (Phase 2, T10/T11) is **blocked** until its characterization tests exist and pass against the *current* code. The test pins today's behavior so the refactor can prove it changed nothing. The test-hardening items (WI-T*) are therefore scheduled **before** their dependent refactors.
- **Expectation vs characterization.** A *characterization* test asserts what the code does today (a safety net). An *expectation* test asserts what it *should* do (a contract). Where a correctness fix is intended (C2 blank→0, D9), add the characterization test first (locks current `0`), then flip it to the expectation (`null`) in the same PR as the fix — so the behavior change is visible in the diff.

**Definition of done (every ticket):** scope-limited diff (no drive-by refactors per house rules); `pnpm --filter erify_api lint typecheck test` green; `build` when wiring/deps change; same-PR doc/skill sync per `knowledge-sync.md`; `pr-review.md` / `/pr-ready` before merge.

**Sequencing:** Phase 0 → 1 → 2 → 3 (see plan). Test-hardening items slot in just ahead of the refactor they protect.

**Operating model (confirmed 2026-06-12):**
- **Direction now, details later.** Only direction-level decisions are locked up front; structural details are decided at the phase/ticket that touches them, with current code in view. Deferred decisions must NOT be pre-implemented.
- **Converge on canonical patterns; improve only with sign-off.** Align divergent code onto `task.service.ts` / `task.repository.ts` / studio-membership schema. A better pattern may be *proposed* where the canonical one is weak, but is applied only after explicit approval — never silently introduced mid-refactor.
- **One PR per work item — parallelizable.** Smallest reviewable unit. Independent test-only WI-T* items run on separate branches as concurrent open PRs (they touch disjoint files). To avoid progress-log merge conflicts, **parallel PRs do not edit this doc**; the tracker is reconciled after merges. Merge gate per PR: baseline green → behavior pinned → review.

---

## Testing principles (how to write WI-T* specs)

Right altitude matters more than coverage count. **A behavior-preserving refactor must not break a test.** If an equivalent reimplementation would fail it, the test is over-specified — trim it.

- **Test observable behavior and contracts, not implementation.** Assert real input→output for pure logic (the gold model: `task-report-content-value.spec.ts`).
- **Mock-argument assertions are a last resort, kept minimal.** For a repository with no DB in unit tests, only assert the query shape for genuine *contracts*: soft-delete exclusion (don't leak deleted rows), tenant scoping (don't cross studios), and real logic branches (e.g. the targetId 4-way OR fallback) or mapping/aggregation logic. **Do not** enumerate every filter field / date-range / order-by shape — that is ORM plumbing a refactor may freely change.
- **Collaborator-interaction assertions are legitimate when the collaboration IS the unit's job** — e.g. an orchestrator routing facts to a processor (`expect(processor.applyAndAudit).toHaveBeenCalledWith(...)`). They are a smell only when they assert plumbing. Still prefer asserting the returned outcome where it is the real signal; match the existing spec's balance.
- **Representative + boundary cases, not every permutation.** No combinatorial `it.each` over plumbing.
- **Don't test the framework.** Prisma/Nest/Zod do their own jobs.
- **Characterization vs expectation:** a temporary exact-shape pin is only justified for a deliberately *byte-identical mechanical* refactor (e.g. WI-24 paired-router de-dup), and should be removed once the refactor lands — not left as permanent suite bloat.

> Open follow-up (not blocking): true repository **query correctness** needs integration tests against a real DB. Mock-arg unit tests give limited confidence; if we want stronger guarantees on the analytics/finance query paths, raise an integration-test decision rather than over-investing in mock-arg unit tests.

---

## Progress log (living — retire this doc when every WI is ✅)

> Update this on every PR. Baseline grows as characterization specs are added; record the new suite/test counts so regressions are visible.

| Ticket         | Status      | PR   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | ----------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WI-T3          | ✅ done      | #157 | Characterization spec for `task-report-content-value.ts` (pure-function, public-API only). +29 tests → **131 suites / 1186 tests green**. Locks blank-numeric→`0`, multiselect non-array→`null`, checkbox `'true'`-only coercion as *current* behavior for WI-34/D9/D13 to flip. No false positives — every assertion verified against source.                                                                                                                                          |
| WI-T-platform  | ✅ done      | #158 | Net-new `platform.repository.spec.ts` (delegate-mock, mirrors `show-platform.repository.spec.ts`). +7 tests → **132 suites / 1193 tests green**. Pins soft-delete filtering + case-insensitive search; locks the `findMany` override footgun (no `deletedAt` injection) and the `findByUids` "ignores deleted" docstring-vs-code mismatch as *current* behavior for WI-33/D10. Verified against source.                                                                                 |
| WI-T2          | ✅ done      | #159 | Net-new `compensation-line-item.repository.spec.ts` (delegate-mock). **Right-sized to 7 behavior/contract tests** (down from an initial 20) per the testing principles above — keeps soft-delete exclusion, tenant scoping, the targetId 4-way OR fallback, and the `findActiveAmountsByShowCreatorUids` money path (short-circuit + null-relation drop); drops per-field where-shape enumeration. `typecheck` caught a wrong enum literal (`'MANUAL'`→`'BONUS'`) the Babel run missed. |
| WI-12          | ✅ done      | #160 | Production: strict `task_type` typed guard in `task-generation-processor` (drops `as any`/`as TaskType`). Behavior-preserving (known→itself, unknown→`OTHER`); +1 behavior test via public `processShow`.                                                                                                                                                                                                                                                                               |
| WI-01          | ✅ done      | #161 | Production (Phase 0 security): sanitize `useCase`/`actorId` path components in `storage.generateObjectKey` (case-preserving). Behavior-preserving for valid inputs; +1 traversal test (no `..`, exactly 4 segments).                                                                                                                                                                                                                                                                    |
| WI-02          | ✅ done      | #162 | Production (Phase 0 security): redact internal JWKS URL + upstream error text from `backdoor-auth` error responses (status codes unchanged, detail logged at ERROR). Rewrote the leak-encoding tests → assert redaction + URL-is-logged; consolidated 7 error tests → 4.                                                                                                                                                                                                                |
| WI-T7          | ✅ done      | #163 | Adds orchestrator-level coverage to `fact-extraction.service.spec.ts` for the numeric/performance-fact path: routes a `show_platform_gmv` fact through `applyAndAudit` with the SHOW_PLATFORM target, asserts `templateUid` threads into `ctx` (present + absent), and `skipped_stale_target` when the platform is inactive. +3 tests. A structurally-invalid fixture (too-short field id failing `FIELD_ID_PART`) was caught by running the test, not assumed.                         |
| WI-04          | ✅ done      | #164 | Extends the `show-platform.repository.spec.ts` regression for `updatePerformanceMetric` raw SQL: pins the table, the `metadata.performance_templates` path, the `uid`/`show_id`/`deleted_at` predicate, and the dynamic metric-column splice. Right-altitude (structural literals, not full SQL). `Prisma.raw`→`.strings` splice confirmed by running.                                                                                                                                  |
| WI-33          | ✅ done      | #165 | Production (Phase 3, D10): removed the soft-delete-bypassing `PlatformRepository.findMany` override (zero callers — services use `findByUids`/`findPaginated`) and corrected the `findByUids` "ignores deleted" docstring. The WI-T-platform footgun characterization is **flipped to the expectation** (inherited `deletedAt: null` default restored). Net-zero test count.                                                                                                            |
| WI-31          | ✅ done      | #166 | Production (Phase 3, D5): publish now bumps `version` (`publishing.service` — was leaving it unchanged, so publish→edit raised no conflict); `appendShows`/`restore` converted from `version: x+1` read-modify-write to atomic `{ increment: 1 }`. Equivalent in the happy path (in-memory optimistic check, not a versioned WHERE). Tests flipped from the `version: 2` literal to the increment contract.                                                                             |
| WI-03          | ✅ done      | #167 | Production (Phase 0, **D1 resolved: accept-the-race**): removed the optimistic-`version` guard + `VersionConflictError` branch from `reserveMaterialAssetUploadVersion` — it only raised spurious 409s on unrelated edits and never blocked the real concurrent-reserve race (version never bumps). Rare same-field presign collision accepted + documented in `docs/tech-debt/upload-version-reservation-race.md`. Kept the `deletedAt` guard.                                         |
| WI-30 (item 2) | ✅ done | #168 | Phase 3 convention sweep, error-shape normalization: `base-api-key.guard` two `UnauthorizedException` throws → `HttpError.unauthorized` (converges on the file's own L99 canonical; `HttpError.unauthorized` returns an `UnauthorizedException`, so 401 + spec assertions hold). See WI-30 triage note below — most other sweep items are **not** quick wins. |
| WI-30 (item 4) | ✅ done | #170 | Phase 3: declared `@ZodPaginatedResponse` contracts for the four `run-review/*` endpoints (creators/violations/tasks/shows) — previously decorator-less. Reused the three row schemas already embedded in `showRunReviewSummarySchema` (extracted as named exports; summary stays byte-identical) + net-new `showRunReviewShowsRangeRowSchema`. Safe: derive-methods are typed to these shapes and 3/4 already serialize in prod via the summary. +1 suite / +4 contract tests. |
| WI-30 (item 7b) | ✅ done | #171 | Phase 3: removed the byte-identical `ensureResourceExists` override from `BaseAdminController` (it `extends BaseController`), inheriting the canonical impl. Zero behavior change. (google-sheets base copy left — standalone, structural.) |
| WI-T5 | ✅ done | #172 | Phase 2 characterization (unblocks WI-24): pins the C1 `actuals_source` whole-blob read-modify-write (sibling survives via in-memory spread — outcome to hold under WI-24's jsonb merge) + the show-scope `NotFoundException`→`extractor_error` asymmetry vs. creator/platform's `target_stale`. +2 tests. |
| WI-T-analytics (show cost) | ✅ done | #173 | Phase 2 characterization (unblocks WI-21): direct branch-matrix pins for the public `calculateShowCost` (compensation-type matrix, line-item summation, `actuals_source` derivation) — previously tested only transitively via `getCostsSummary`. Money asserted by value, not `decimalToString` formatting. +7 tests. |
| WI-T-analytics (shift cost) | ✅ done | #174 | Phase 2 characterization (unblocks WI-21): direct pins for the public `calculateShiftCost` sibling (per-block actual-vs-planned duration + warning, `hourlyRate*hours` base, block+shift line items, dominant `actuals_source` precedence). +3 tests. |
| WI-23 | ✅ done | #176 | Phase 2 decomposition: extracted the 13-tab review-stats `where` matrix from `task.repository.findTaskReviewStats` into a pure `buildReviewStatsTabCriteria` in `task-list-query.ts`, reusing the existing `applyReviewTabFilter`. Behavior-preserving; `task.repository.ts` 721 → 593 LOC. New `task-list-query.spec.ts` directly characterizes the builder. +7 tests. `task-template.repository.ts` (560, already <600) left for an optional cohesion pass. |
| WI-24 (part 1) | ✅ done | #177 | Phase 2: collapsed the byte-identical creator + platform per-target paired routers into one parameterized `tryAtomicPairedPerTargetActuals`; the show router stays separate (single-target shape). Behavior-preserving (the 10 paired routing tests cover both scopes through the one helper). `fact-extraction.service.ts` 1120 → 1036 LOC (further extraction needed for <600; out of scope). |
| WI-24 (part 2) | ❌ won't-fix | — | The `actuals_source` whole-blob → jsonb-merge race fix is **dropped** (D8/D12 resolved won't-fix): actuals are recorded sequentially by operational phase, so the concurrent different-key clobber is not reachable. `docs/tech-debt/actuals-source-jsonb-merge.md` records it. Sequential override-protection priority is unaffected. |

**Baseline now:** 135 suites / 1226 tests (at #177).

> WI-33 follow-up resolved: the platform-spec footgun pin was flipped to the inherited soft-delete-default expectation when the override was removed, so the earlier mock-arg consistency concern on that file is closed.

> **WI-T-analytics scope conclusion (2026-06-12):** the net-new characterization gap was the two *public* studio-costs calc methods (#173, #174). The studio-performance calc helpers (`mapShowToPerformance`, `calculateShowSortValue`/`compareSortValues`, `buildLoopItems`, `sumShowStoredAggregates`/`computePeakFromLoops`) are **private and already behavior-covered** by the existing 1049-line spec (summary+trend, paginated rows, the loop matrix, in-memory sorting, series sum+peak) — adding direct private-method tests would be redundant and off-altitude. The remaining "repository where/include builder tests" belong to **WI-21 itself** (those repos don't exist yet). WI-T-analytics is therefore complete pending #174 merge.

---

## Phase 0 — Bugs & security (parallelizable, low-risk)

### WI-01 · Sanitize all storage path components · T8 · S
- **Files:** `lib/storage/storage.service.ts` (`generateObjectKey`, L66–71); caller `uploads/upload.service.ts:135`.
- **Scope:** apply `sanitizeFileName` (or equivalent) to `useCase` and `actorId`, not just `fileName`.
- **Test strategy:** *expectation* — `generateObjectKey('../../evil', actor, file)` must not produce a key with `..` segments; assert traversal sequences are stripped from every component. *characterization* — existing happy-path key shape unchanged.
- **Acceptance:** no path-traversal sequence survives in the generated key; existing upload tests green.
- **Risk:** low. **Decision:** none.

### WI-02 · Redact internal detail from backdoor auth responses · T8 · S
- **Files:** `backdoor/auth/backdoor-auth.controller.ts` (L75–93).
- **Scope:** stop returning internal JWKS URLs / raw upstream error messages to clients; log full detail at ERROR.
- **Test strategy:** *expectation* — on upstream failure the HTTP response body contains a generic message and no internal URL; a spy asserts the full detail is logged at ERROR.
- **Acceptance:** client-facing payload carries no internal URL/upstream stack. **Risk:** low. **Decision:** none.

### WI-03 · Stop optimistic-lock version bump on upload bookkeeping · T5 · S/M
- **Files:** `models/task/task.repository.ts` `reserveMaterialAssetUploadVersion` (L309–375).
- **Scope (D1-dependent):** remove the `version` bump for the pre-submission upload counter. Per **D1**: either move the counter to a dedicated `MaterialAssetUploadReservation` table (durable) or accept the race explicitly. At minimum, eliminate the spurious-409 path.
- **Test strategy:** *characterization* first — pin current reserve behavior (counter increments, idempotent re-reserve). *expectation* — a reserve followed by a legitimate user mutation does **not** raise `VersionConflictError`; concurrent reserves don't 409 the user's next write.
- **Acceptance:** no `version` bump on reserve; user's subsequent write succeeds. **Risk:** medium (touches upload flow). **Decision:** **D1 required.**

### WI-04 · Raw-SQL regression test for show-platform metric update · T1-residual · S
- **Files:** `models/show-platform/show-platform.repository.ts` (`updatePerformanceMetric`, raw SQL); add `show-platform.repository.spec.ts` assertion.
- **Note:** this repo is **already correctly tx-wired** (verified) — this is only the missing raw-SQL guard.
- **Test strategy:** *regression* — assert the generated SQL contains the literal `"show_platforms"` table and the expected column names, so a future typo fails loudly.
- **Acceptance:** test fails if table/column literal changes. **Risk:** low. **Decision:** none.

---

## Phase 1 — Transaction & type foundations (precede decomposition)

### WI-10 · Repository transaction-wiring audit & fixes · T1 · M
- **Files:** `models/task-template/task-template.repository.ts` (inject `TransactionHost`, add `private get delegate()`, route all writes through `txHost.tx`); `models/show-standard/show-standard.repository.ts:40`; `models/schedule-snapshot/schedule-snapshot.repository.ts` (extend `BaseRepository`). **Do not touch `show-platform` — already correct.**
- **Scope:** make every repository follow the `task.repository.ts` delegate pattern; grep-audit all repos for direct `this.prisma.*` writes.
- **Test strategy:** *characterization* — wrap a write in a `@Transactional` test that rolls back and assert the repository write is rolled back too (proves it participates). Add for task-template specifically (today it would silently escape). *regression* — existing repo specs green.
- **Acceptance:** no repository performs writes off the unbounded `PrismaService`; rollback test passes. **Risk:** medium. **Decision:** **D6** (snapshot soft vs hard delete) informs schedule-snapshot.

### WI-11 · Zod schemas for recurring JSONB shapes · T3 · L
- **Files:** new schemas for studio `metadata.localization` / `performance_templates`, task `snapshot.schema`, upload routing; parse at controller/DTO boundary. Consumers: `studio-costs`, `studio-performance`, `task.service.ts:222`, `task-template.service.ts`.
- **Scope:** define typed shapes, parse at the boundary, pass typed objects inward; remove `Record<string,any>` / `as any` from business logic (keep unsafe casts only at the edge).
- **Test strategy:** *expectation* — schema rejects malformed metadata at the boundary; *characterization* — well-formed current payloads parse unchanged (snapshot real fixtures from DB-shaped data).
- **Acceptance:** named types replace `Record<string,any>` in the listed services; boundary parse covered. **Risk:** medium. **Decision:** none (enables T3/T4).

### WI-12 · Strict `task_type` registry lookup · T3 · S
- **Files:** `task-orchestration/task-generation-processor.service.ts:140`; related read in `task-template.service.ts`.
- **Scope:** replace `includes(taskType as any)` with a strict typed resolver over `TASK_TYPE` (no `as any`); guard the persisted-JSON read.
- **Test strategy:** *expectation* — unknown `task_type` string resolves to the safe default / is rejected, not silently accepted; valid types map correctly.
- **Acceptance:** no `as any` on the enum path; coverage for unknown value. **Risk:** low. **Decision:** none.

### WI-13 · Shared money utility + Decimal-at-boundary · T4 · M
- **Files:** new shared money util (`@eridu/api-types` or `lib/utils`); consumers `models/studio-shift/studio-shift.service.ts:327`, `models/compensation-line-item/compensation-line-item.service.ts:95`, triplicated formatters in `show-orchestration`, `shift-calendar`, `studio-shift` schema.
- **Scope (D4):** centralize Decimal parse/format; convert `Prisma.Decimal` → string at service boundaries; stop instantiating `Prisma.Decimal` in services.
- **Test strategy:** *expectation* — util round-trips known money strings, rejects invalid; *characterization* — each migrated call site produces byte-identical output to today (snapshot current formatted values).
- **Acceptance:** no `Prisma.Decimal` in public service signatures among listed files; one money util. **Risk:** medium (money). **Decision:** **D4 required.**

---

## Phase 2 — God-service decomposition (parallelizable by slice, after Phase 1)

> Each Phase-2 ticket is **blocked by its characterization tests** (right column). Move methods only under green coverage.

### WI-20 · Split `show-orchestration.service.ts` (1446 LOC) · T2 · XL · ⟵ needs WI-T7
- **Target split (D3):** `ShowAssignmentOrchestrator` (creator/platform sync, show mutations, keep `@Transactional`) + `CreatorCompensationService` (compensation rows/totals) + `ShowRunReviewService` (read-only review analytics — *not* orchestration). Each <400 LOC. Fold in T6 (remove thin `getShows*WithRelations` pass-throughs) and the direct-`showRepository.update` layering fix.
- **Test strategy:** characterization at the service public API for each of the three concern groups **before** moving code (WI-T7); after the split, the same tests pass against the new services unchanged (re-pointed imports only).
- **Acceptance:** three services <400 LOC each; module/controller wiring updated; all prior tests green. **Risk:** high. **Decision:** **D3.**

### WI-21 · Studio analytics: repositories + decomposition · T2 · XL · ⟵ needs WI-T-analytics
- **Files:** `studios/studio-costs/studio-costs.service.ts` (939), `studios/studio-performance/studio-performance.service.ts` (928).
- **Scope (D2):** introduce `StudioCostsRepository` / `StudioPerformanceRepository` (move all `where`/`include`/Prisma out of the services), then extract cost-calc and loop/metric helpers into focused modules/services; remove `Record<string,any>` metadata casts (uses WI-11 schemas).
- **Test strategy:** characterization on the public analytics outputs (cost summary, performance rows) with representative fixtures, **before** extraction; repository-level tests for the new where/include builders (uses WI-T-analytics).
- **Acceptance:** services carry no inline Prisma; each module <600 LOC; outputs identical. **Risk:** high (money/analytics). **Decision:** **D2.**

### WI-22 · Split `task-orchestration.service.ts` (672 LOC) · T2 · L
- **Scope:** split into submission / assignment / retrieval / deletion behind a coordinating facade; fix the sequential `bulkApproveTasks` loop (bulk op) and the in-memory `resolveStudioMember` find (repository filter).
- **Test strategy:** characterization on each workflow's public method before the split; *expectation* for `bulkApproveTasks` — N tasks approved via bulk path, asserting no per-row round-trip.
- **Acceptance:** facade preserves the public surface; sub-orchestrators ~100–150 LOC; tests green. **Risk:** high (reference-peer service). **Decision:** none.

### WI-23 · Extract large repository query methods · T2 · M
- **Files:** `models/task/task.repository.ts` (735 — extract `findTaskReviewStats`), `models/task-template/task-template.repository.ts` (560 — extract admin usage / binding queries).
- **Test strategy:** characterization on the extracted query methods (assert generated where/include + result shape) before moving.
- **Acceptance:** repositories <600 LOC; query services covered. **Risk:** medium. **Decision:** none.

### WI-24 · fact-extraction: de-dup paired routers + converge datetime onto jsonb-merge · T2/T10 · L · ⟵ needs WI-T7, WI-T5
- **Files:** `orchestration/fact-extraction/fact-extraction.service.ts` (collapse the three ~120-LOC `tryAtomicPaired*` routers into one generic helper — drops file <600 LOC); `fact-extraction.processor.ts` + datetime extractors + `show.service.updateShow` (migrate `actuals_source` whole-blob replace → single-key `jsonb ||` merge, matching `updatePerformanceMetric`).
- **Scope:** per **D8**, the jsonb-merge convergence may ship later as its own PR; the de-dup is mechanical. Log the C1 race in `docs/tech-debt/` if deferring the merge.
- **Test strategy:** **blocked on WI-T7** (orchestrator-level performance routing + templateUid) and **WI-T5** (C1 actuals_source characterization). De-dup must leave all paired/numeric outcomes byte-identical; the jsonb-merge change flips WI-T5 from "sibling key dropped" (characterized) to "sibling key preserved" (expectation) in the same PR.
- **Acceptance:** file <600 LOC; paired-router behavior identical; merge change (if included) makes the C1 test assert preservation. **Risk:** high (correctness-bearing). **Decision:** **D8, D12.**

---

## Phase 3 — Convention sweep + correctness fixes + tests

### WI-30 · Convention sweep · T7 · M (NOT a uniform quick-win batch — see triage)
- **Scope:** `HttpError` in `show-platform-violation.service.ts:63` + `lib/guards/base-api-key.guard.ts`; missing `async` on admin create methods + `ensureResourceExists` in `admin-show` GET; `@ZodPaginatedResponse` on `studio-show.controller.ts` `runReview*`; standardize `@Param('id')`; centralize show-family UID prefixes (kills `show.schema.ts` circular-import risk); de-dup `api-response`/`zod-response` decorators, `BaseAdminController.ensureResourceExists`, `JwtAuthGuard.transformUser`; one shared response type for `planDocument: undefined as any`.
- **Triage (2026-06-12, inspected against current code):**
  - **item 2 — `base-api-key.guard` HttpError** → ✅ done (#168). The one cleanly-safe item.
  - **item 1 — `show-platform-violation` `NotFoundException`** → ❌ **false positive.** The throw is an *intentional* control-flow signal the fact-extractor catches to collapse to `target_stale` (comment-documented). Left as-is; converting would risk the catch.
  - **item 4 — `@ZodPaginatedResponse` on 4 `run-review/*` endpoints** → ✅ done (#170) as its own characterized PR (the decorator applies `ZodSerializerDto`, so it needed accurate row contracts + a round-trip spec, not a sweep edit).
  - **item 5 — `@Param('id')` standardization** → ✅ already done; 0 bare `@Param('id')` without `UidValidationPipe` on master.
  - **item 7b — `ensureResourceExists` de-dup (admin)** → ✅ done (#171). The google-sheets base copy is left (standalone, doesn't extend `BaseController` — structural).
  - **items 6 / 7a / 7c — UID-prefix centralization, decorator de-dup, `transformUser` dual-definition** → 🔶 **structural / auth-sensitive**, assess individually; not mechanical (7c needs the auth-sdk parent's dispatch understood).
  - **item 8 — `planDocument: undefined as any`** → 🔹 1 site remains (audit said 3; 2 already gone). Marginal.
- **Test strategy:** *expectation* — guard throws `HttpError` shape (done). The `runReview*` paginated-envelope work moves to its own PR with characterization. Remaining mechanical nits keep existing tests green.
- **Acceptance:** safe items resolved; no behavior change beyond error-shape normalization. **Risk:** low (per surviving item). **Decision:** none.

### WI-31 · Standardize version increment + publish bump · T5 · S
- **Files:** `schedule.service.ts:593` (→ `{ increment: 1 }`); `schedule-planning/publishing.service.ts` (bump `version` on publish per **D5**).
- **Test strategy:** *expectation* — publish increments `version`; *regression* — restore still bumps; all version bumps use `{ increment: 1 }`.
- **Acceptance:** consistent increment pattern; publish-bump test passes. **Risk:** low. **Decision:** **D5.**

### WI-32 · Strengthen test-helper typing + migrate outlier specs · T9 · M
- **Files:** `testing/model-service-test.helper.ts` (tighten generics, add typed mock factories); migrate `studio-performance`/`studio-costs`/`schedule-planning/validation` specs onto the helper as their services are refactored (rides WI-21).
- **Acceptance:** reduced `as any` in mocks; outlier specs use the standard helper. **Risk:** low. **Decision:** none.

### WI-33 · Remove soft-delete-bypassing `platform.findMany` override · C3/D10 · S
- **Files:** `models/platform/platform.repository.ts` (delete the custom `findMany`; base method already filters); fix the `findByUids` docstring (**D11/finance D**) to match its `deletedAt: null` code.
- **Test strategy:** **blocked on WI-T-platform** — characterize current override behavior (returns deleted) first, then assert removal restores the soft-delete invariant.
- **Acceptance:** no soft-delete-bypassing path; docstring matches code. **Risk:** low (unexposed). **Decision:** **D10.**

### WI-34 · Fix report blank-numeric semantics + normalization contract · T11/C2/D9 · M · ⟵ needs WI-T3
- **Files:** `models/task-report/task-report-content-value.ts` (`normalizeFieldValue`).
- **Scope (D9):** blank/whitespace numeric → `null` (guard `value.trim()===''` before `Number()`); review multiselect non-array and checkbox string-coercion per D13.
- **Test strategy:** **blocked on WI-T3** (characterization of all branches). In this PR, flip the blank-numeric case from characterization (`0`) to expectation (`null`); add the run-service e2e asserting a blank `gmv` renders as not-reported.
- **Acceptance:** blank numeric → null end-to-end; normalization branches pinned. **Risk:** medium (changes report values — coordinate with consumers). **Decision:** **D9, D13.**

---

## Test-hardening items (close the coverage gap; schedule ahead of dependent refactors)

> These are the deliverable for "improve the tests to ensure feature and expectation." Several create **net-new spec files** for currently-untested high-logic code.

| ID                    | New file? | Target                                      | Tests to add                                                                                                                                                                                                                                                                                                                                                                                                     | Priority | Unblocks                     |
| --------------------- | --------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------- |
| **WI-T7**             | no        | `fact-extraction.service.spec.ts`           | Orchestrator-level numeric/performance routing through `extractFromTask` (stale-target → no audit; sibling `(factKey,target)` collision → `skipped_collision`); assert `task.template?.uid` threads into `ctx.templateUid` (+ no-template → `undefined`); cross-fact ordering (attendance_missing=false + late actual_start → late reason survives); paired-key `factKey`-vs-`contentKey` no cross-contamination | high     | WI-20*, WI-24                |
| **WI-T5**             | no        | `fact-extraction.processor`/extractor spec  | C1 characterization: seed `actuals_source={start:'OPERATOR'}`, write `end`, assert start entry survives (locks whole-blob behavior; flips to "preserved" when WI-24 merge lands); show-scope soft-delete paired path → documents `extractor_error` asymmetry                                                                                                                                                     | medium   | WI-24                        |
| **WI-T2**             | **yes**   | `compensation-line-item.repository.spec.ts` | `buildWhere`/`buildTargetFilter`: includeDeleted on/off, studio UID scoping, from/to range, targetType+targetId pairing, targetId-without-targetType 4-way OR; `sum/findActiveAmountsByShowCreatorUids` Decimal aggregation + empty-input short-circuit (money path)                                                                                                                                             | high     | WI-13, future comp refactors |
| **WI-T3**             | **yes**   | `task-report-content-value.spec.ts`         | `normalizeFieldValue` every branch: `('','number')`→ current 0 then expectation null; `('abc','number')`→null; `('5','number')`→5; multiselect non-array→null and `['a',1]`→`['a','1']`; checkbox `1`/`'yes'`/`'true'`/`true`; `formatInputExtra` ordering                                                                                                                                                       | high     | WI-34                        |
| **WI-T-platform**     | **yes**   | `platform.repository.spec.ts`               | `findPaginated` deletedAt:null unless includeDeleted; name/uid `contains`+insensitive; `findByUids` deletedAt filter (exposes docstring mismatch); custom `findMany` returns deleted (characterize footgun)                                                                                                                                                                                                      | high     | WI-33                        |
| **WI-T-analytics**    | partial   | `studio-costs`/`studio-performance` specs   | Characterize cost-summary + performance-row outputs on representative fixtures before extraction; new repository where/include builder tests                                                                                                                                                                                                                                                                     | high     | WI-21                        |
| **WI-T-comp-extra**   | no        | comp service/schema/resolver specs          | `compensationLineItemDto` null-target throw paths; `line-item-target.resolver` exhaustive-default + null nested show/shift rejections; `findByUidForStudio` cross-studio + soft-deleted → null (404)                                                                                                                                                                                                             | medium   | WI-13                        |
| **WI-T-report-extra** | no        | `task-report-run`/`scope` specs             | blank-numeric e2e (null); DUPLICATE_SOURCE across snapshot versions (disjoint keys merge); preflight/load TOCTOU characterization; `getSources` inactive shared-field visibility (D13); scope repo dual show-filter                                                                                                                                                                                              | medium   | WI-34                        |
| **WI-T-audit**        | no        | `legacy-snapshot-merger.spec.ts`            | tie-order (equal timestamp → legacy-first) locks sort stability; out-of-enum `action` pass-through characterization                                                                                                                                                                                                                                                                                              | low      | —                            |

\* WI-20 needs characterization on each of its three concern groups; WI-T7 covers the fact-pipeline portion — extend the pattern to compensation/review groups within WI-20's own prep.

---

## Decision status (confirmed 2026-06-12)

Per the operating model, **direction-level decisions are LOCKED now**; **structural details are DEFERRED** and re-surfaced at the ticket with current code in view. Locked direction does not pre-commit implementation shape — that's decided in-ticket, where an improved pattern may be proposed with sign-off.

| Decision                                     | Status              | Blocks   | Direction (locked) / detail (deferred)                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D2 analytics repositories                    | **LOCKED**          | WI-21    | Analytics services get a repository layer (no inline Prisma in service). Repo shape decided in-ticket.                                                                                                                                                                                                                                                                                                                  |
| D4 money representation                      | **LOCKED**          | WI-13    | Shared money util; `Decimal`→string at boundary; no `Prisma.Decimal` in service signatures. Domain `Money` adopted incrementally.                                                                                                                                                                                                                                                                                       |
| D5 publish version bump                      | **LOCKED**          | WI-31    | Publish increments `version` (matches restore).                                                                                                                                                                                                                                                                                                                                                                         |
| D9 blank numeric semantics                   | **LOCKED**          | WI-34    | Blank/whitespace numeric → `null`, not `0`.                                                                                                                                                                                                                                                                                                                                                                             |
| D10 platform findMany override               | **LOCKED**          | WI-33    | Delete the soft-delete-bypassing override.                                                                                                                                                                                                                                                                                                                                                                              |
| D1 upload counter location                   | **RESOLVED** (#167) | WI-03 ✅  | **Accept-the-race.** Removed the `version` guard from the upload reserve (it only caused spurious 409s and never blocked the real race). Counter stays in `metadata`; the rare same-field concurrent-presign collision is accepted + documented in `docs/tech-debt/upload-version-reservation-race.md`. Revisit (dedicated table) only if concurrent same-field uploads or revision-retention become real requirements. |
| D3 show-orchestration split                  | DEFERRED            | WI-20    | Direction only: read-only review analytics leaves orchestration. Exact service boundaries decided in-ticket.                                                                                                                                                                                                                                                                                                            |
| D6 snapshot delete semantics                 | DEFERRED            | WI-10    | Soft vs hard delete decided when WI-10 reaches schedule-snapshot.                                                                                                                                                                                                                                                                                                                                                       |
| D8/D12 datetime merge & collision precedence | **WON'T-FIX** (2026-06-12) | WI-24 part 2 | Dropped. Actuals are recorded sequentially by operational phase, so the concurrent different-key `actuals_source` clobber is not reachable; the whole-blob write is correct for sequential writes. See `docs/tech-debt/actuals-source-jsonb-merge.md`. Revisit only if concurrent same-target actuals writes become possible. |
| D11 UID-field naming                         | DEFERRED            | WI-13/33 | Rename scope decided in-ticket after confirming no repo-wide `...Id`-for-UID convention.                                                                                                                                                                                                                                                                                                                                |
| D13 report normalization details             | DEFERRED            | WI-34    | multiselect/checkbox coercion + `target_type`-required decided in-ticket.                                                                                                                                                                                                                                                                                                                                               |

---

## Suggested first sprint (lowest risk, highest signal)
1. **Phase 0:** WI-01, WI-02, WI-04 (no decision deps, all small).
2. **Net-new safety nets:** WI-T2, WI-T3, WI-T-platform, WI-T7 — they create coverage for the currently-untested high-logic files and unblock the rest. Pure additions, zero production risk.
3. **WI-12** (strict `task_type`) — small, self-contained type-safety win.

This establishes the expanded safety net and clears the cheapest wins before any decision-gated or structural work begins.
