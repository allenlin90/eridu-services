# erify_api Pattern & Convention Audit — Refactor Plan

**Date:** 2026-06-12
**Scope:** `apps/erify_api/src` — 330 non-test source files, ~40k LOC, plus 128 test files.
**Goal:** Identify pattern, convention, best-practice, and quality issues, then sequence a refactor program that aligns the backend to its own canonical patterns.

---

## Execution status & alignment (updated 2026-06-14)

This is the **static strategy** (themes T1–T11, decisions D1–D13). Live execution status is the **companion** `erify-api-refactor-work-items.md` (WI-XX tracker). The phase checkboxes below were never ticked as work landed — read the tracker for true status. Baseline grew **130 suites / 1157 tests → 142 / 1254** with every PR green.

**Theme → outcome:** T1 ✅ (WI-10, #199) · T2 ✅ (WI-20 #190–194, WI-21 #180–183, WI-22 #179, WI-23 #176) · T3 ✅ (WI-11 #184–186, WI-12 #187) · **T4 ⛔ deferred (WI-13 — needs a Money-direction call)** · T5 ✅ (WI-03 #167, WI-31 #166) · T6 ✅ (folded into WI-20) · T7 ✅ (WI-30 sweep, #168–171/188/189/196/197) · T8 ✅ (WI-01 #161, WI-02 #162) · **T9 🟦 recommend-skip (WI-32)** · T10 ❌ won't-fix (WI-24 pt2) · T11 ✅ (WI-34 #198).

**Direction changes / sensitive divergences that need attention:**
1. **D6 / schedule-snapshot — the plan's "still extend `BaseRepository`" was infeasible.** The model has no `deletedAt` column; `BaseRepository` injects `deletedAt: null` filters and would break it. Resolved (WI-10): hard-delete kept, txHost wiring only.
2. **D8/D12 — flipped from "accept as tech-debt, converge later" to WON'T-FIX.** Actuals are recorded **sequentially by operational phase**, so the concurrent different-key `actuals_source` clobber (C1) isn't reachable. Documented in `docs/tech-debt/actuals-source-jsonb-merge.md`.
3. **D1 — chose accept-the-race** (not the side table). Removed the spurious-409 `version` guard; documented in tech-debt.
4. **D3 / WI-20 — one sub-service (`ShowCreatorAssignmentService`, 557 LOC) exceeds the `<400` target**, and `ShowMutationService` was declined. Accepted as a cohesion tradeoff on sign-off (2026-06-14).
5. **WI-10 scope expanded 3 → 7 repos** (grep-audit found schedule, show-status, show-type, studio-membership writing off the unbounded client). A deeper `BaseRepository`-binds-to-unbounded-client issue remains as a noted follow-up.
6. **T4 / D4 / WI-13 — the headline open item.** The "three duplicate money formatters" have genuinely different semantics and the public-`Prisma.Decimal` signature conversions *move* rather than *remove* Decimal between two math-doing services — so this needs a real domain-`Money` direction decision, not a behavior-preserving sweep.

**Decisions never turned into WIs (open):** **D7** (Google Sheets service-account identity threading) and **D11** (`studioId`→`studioUid` rename in the compensation slice) were recommended but never ticketed.

---

## How this audit was produced

- **Fan-out (haiku):** 19 parallel auditors, one per module slice, each loading the relevant `.agent/skills/*/SKILL.md` plus the repo house rules, reading every non-test source file in its slice, and emitting structured findings (130 total).
- **Synthesis (opus):** clustered findings into cross-cutting themes, ranked refactor targets, and proposed sequencing.
- **Verification (opus, main loop):** the keystone "correctness bug" claims that drive Phase 0 were checked against source before being committed to this plan. **One high-severity claim was a false positive** (see below). Findings are weighed against the reference implementations — `models/task/task.service.ts` → `task-orchestration.service.ts` → `studio-membership` schema — as the convention gold standard.

> **Confidence note:** themes and sequencing are high-confidence (verified at the keystones). The 130 individual findings are haiku-generated and mostly accurate, but **each finding should be confirmed against source at the start of the work item that addresses it** — as the false positive below demonstrates, line-cited claims are not infallible. Two slices (`orchestration/fact-extraction`, `models/{compensation-line-item,task-report,audit,platform}`) returned **zero** findings; treat these as "reported clean, spot-check before trusting," not "audited and perfect" — `fact-extraction.service.ts` is 1120 LOC and warrants a manual pass.

### Verification corrections (do not skip)

| Raw claim | Verdict | Correction |
| --- | --- | --- |
| `show-platform.repository.ts` references `this.txHost` without injecting `TransactionHost` → latent runtime failure | **FALSE** | It injects `TransactionHost` (L30), defines `private get delegate()` (L35), and uses `this.txHost.tx.$executeRaw` correctly (L130). Removed from Phase 0 and top targets. The only valid residual: the raw-SQL regression test recommended by `database-patterns` is missing (low). |
| `task-template.repository.ts` bypasses `TransactionHost`, breaking `@Transactional` safety | **TRUE, downgraded** | The repo does use `this.prisma.*` directly (L18 constructor injects only `PrismaService`). But there is **no `@Transactional` in `task-template.service.ts` today**, and `createTemplateWithSnapshot` uses an atomic Prisma nested-create. So this is a **consistency + latent-risk** fix (Phase 1), not a live data-corruption bug. |
| `storage.service.ts` `generateObjectKey` path traversal via `useCase` | **CONDITIONAL** | `useCase` is supplied as `input.storageUseCase` from presign input. Sanitizing it is cheap defense-in-depth; treat as a hardening quick win, not a confirmed live exploit. |

---

## Overall assessment

`erify_api` is **fundamentally healthy**. The reference implementations are exemplary and the majority of model/controller slices correctly follow the three-tier schema, soft-delete, UID-at-boundary, and `HttpError` conventions. The weaknesses are **concentrated and recurring rather than pervasive**, falling into three structural buckets plus a set of convention nits:

1. **Inconsistent repository transaction wiring** — a handful of repositories/services bypass the canonical `txHost.tx` delegate (or skip the repository layer entirely). Latent correctness risk for future cross-service writes, not a present-day emergency.
2. **God-services past the 600 LOC boundary** — `show-orchestration.service.ts` (1446), the two studio analytics services (~930 each), `task-orchestration.service.ts` (672). Highest-leverage structural debt.
3. **Type-safety erosion** via `as any` / `Record<string, any>`, concentrated on persisted-JSON `metadata` access. Appears in nearly every slice.

Secondary themes: Prisma type leakage across the service boundary, optimistic-lock `version` misuse on bookkeeping, thin-wrapper proliferation, and assorted convention drift (decorators, error types, param naming, duplicate files).

---

## Themes (ranked by leverage)

### T1 — Inconsistent repository transaction wiring · `high` · effort M
Several repositories diverge from the canonical `txHost.tx` delegate pattern used by `task.repository.ts`:
- `models/task-template/task-template.repository.ts` — injects no `TransactionHost`, calls `this.prisma.*` directly. *(verified; latent risk — no `@Transactional` caller today)*
- `models/show-standard/show-standard.repository.ts:40` — direct `this.prisma.showStandard.update()`.
- `models/schedule-snapshot/schedule-snapshot.repository.ts` — does not extend `BaseRepository`.
- `studios/studio-costs` & `studios/studio-performance` services — inject `PrismaService` directly, no repository layer at all.

**Action:** audit every repository for `TransactionHost` injection + the `private get delegate()` pattern. Wire `TaskTemplateRepository` and `ShowStandardRepository` through `txHost`; make `ScheduleSnapshotRepository` extend `BaseRepository`. Analytics services are handled under T2 (they need repositories before they can be split). **Note:** `show-platform.repository.ts` is **already correct** — do not "fix" it.

### T2 — God-services exceeding the 600 LOC boundary · `high` · effort XL
| File | LOC | Mixed concerns |
| --- | --- | --- |
| `show-orchestration/show-orchestration.service.ts` | 1446 | show CRUD+assignment, creator compensation, show-run review analytics |
| `studios/studio-costs/studio-costs.service.ts` | 939 | query-building, aggregation, pagination, cost calc — no repository |
| `studios/studio-performance/studio-performance.service.ts` | 928 | same pattern as costs |
| `task-orchestration/task-orchestration.service.ts` | 672 | submission, approval, generation, retrieval, reassignment, deletion |
| `models/task/task.repository.ts` | 735 | many specialized query methods |
| `models/task-template/task-template.repository.ts` | 560 | admin usage + binding queries |

**Action:** decompose by concern (details in Phase 2). Sequence **after** T1 so methods move onto a transaction-safe substrate.

### T3 — Type-safety erosion (`as any` / `Record<string, any>`) · `high` · effort L
Worst cluster is persisted-JSON/`metadata` access. Representative sites:
- `studio-costs` / `studio-performance` — `metadata` cast to `Record<string, any>` in 8+ spots (`localization`, `performance_templates`).
- `task-generation-processor.service.ts:140` — `as any` defeats `TASK_TYPE` enum validation on persisted JSON. *(verified pattern)*
- `task.service.ts:222` — `snapshot.schema as any`.
- `task-template.service.ts` — `(existing.currentSchema as any)?.metadata?.task_type`. *(verified)*
- Controller boundary: identical `planDocument: undefined as any` in `studio-lookup`, `admin-schedule`, `google-sheets` (one fix, three sites); `studio-task.controller.ts:305` `as unknown as ...`.

**Action:** define Zod schemas for the recurring JSONB shapes (studio `metadata.localization` / `performance_templates`, task snapshot schema, upload routing), parse at the controller/API boundary, pass typed objects inward. Adopt a strict registry-lookup for persisted enums (`task_type`). Introduce a shared response type to kill the `planDocument` cast.

### T4 — Prisma type leakage across the service boundary · `medium` · effort M
`studio-shift.service.ts:327` instantiates `new Prisma.Decimal`; `compensation-line-item.service.ts:95` returns `Map<string, Prisma.Decimal>`; `task.service.ts` `findTasksByShowIds` exposes `Prisma.TaskInclude/GetPayload` even when `@internal`; show-management services derive payloads from repository Prisma signatures. Money formatting (`toDecimal`/`toMoneyString`) is reimplemented in three places.
**Action:** depends on the **money-representation decision** (D4). Then centralize money parsing/formatting, convert `Prisma.Decimal` → string at service boundaries, define explicit service payload types, replace `@internal` Prisma-include overloads with named include presets.

### T5 — Optimistic-lock `version` misuse & race-prone JSONB · `medium` · effort M
- `task.repository.ts` `reserveMaterialAssetUploadVersion` (309–375) bumps `version` for pre-submission upload bookkeeping → spurious 409s on the user's next write (house-rule violation).
- `studio.service.ts` `create/updateSharedField` (102–137) — read-modify-write on JSONB `metadata` with a documented MVP race.
- `schedule-planning/publishing.service.ts` — validates but does **not** bump `version` on publish, while restore does (possible oversight).
- `schedule.service.ts:593` — raw `version + 1` instead of `{ increment: 1 }` used elsewhere in the same file.

**Action:** resolve decisions D1 (upload counter) and D5 (publish bump); stop bumping `version` on upload bookkeeping; standardize on `{ increment: 1 }`.

### T6 — Thin-wrapper proliferation · `medium` · effort M
`show.repository.ts` / `show.service.ts` expose `getShows`/`getActiveShows`/`getShowsByClient`/`getShowsByStudioRoom` pass-throughs; `show-orchestration` re-wraps `getShowsWithRelations` variants; `task-target.service.ts` has near-duplicate `findByShowId`/`findAllByShowId`; `shows.service.ts` builds Prisma where-clauses in the service.
**Action:** remove value-free pass-throughs, move where-clause construction into repositories taking domain filter params. **Fold into each slice's larger refactor — not a standalone churn PR.**

### T7 — Convention drift (errors, decorators, async, params, duplicates) · `medium` · effort M
- Native NestJS exceptions instead of `HttpError`: `show-platform-violation.service.ts:63`, `lib/guards/base-api-key.guard.ts`.
- Missing decorators: `studio-show.controller.ts` `runReview*` lack `@ZodPaginatedResponse`; some admin create methods missing `async`; `admin-show` GET lacks `ensureResourceExists`.
- Param naming: `admin-client` uses `@Param('uid')` vs 17+ controllers on `'id'`.
- UID prefixes pulled from service classes in `show.schema.ts` (circular-import risk).
- Duplicate files: `lib/decorators/api-response.decorator.ts` vs `zod-response.decorator.ts`; `BaseAdminController` re-defines inherited `ensureResourceExists`; `JwtAuthGuard` duplicates `transformUser`.

**Action:** a batched convention sweep (Phase 3). Mostly quick wins.

### T8 — Storage / error-detail hardening (security) · `medium` · effort S
- `lib/storage/storage.service.ts` `generateObjectKey` (66–71) sanitizes only `fileName`, not `useCase`. *(conditional — `useCase` is presign input; sanitize defensively.)*
- `backdoor/auth/backdoor-auth.controller.ts` (75–93) returns internal JWKS URLs and raw upstream errors to clients.
- `http-error.util.ts` `notFound` can echo an identifier that might be an internal DB id.

**Action:** sanitize all path components; redact internal URLs/upstream errors (log at ERROR instead); add a JSDoc contract that `HttpError.notFound` identifiers must be UIDs.

### T9 — Test infrastructure: weak mock typing · `low` · effort M
`model-service-test.helper.ts` returns loosely-typed mocks driving widespread `as any`; `studio-performance`/`studio-costs` specs mock `PrismaService` directly (mirroring the service-layer bypass); some controller specs use raw `jest.fn()`.
**Action:** strengthen helper generics, add typed mock factories, migrate outlier specs **as their services are refactored** (ride alongside Phase 2).

---

## Top refactor targets (corrected, ranked)

1. **`show-orchestration/show-orchestration.service.ts`** — 1446 LOC, 26 methods, 3 concerns. Highest decomposition leverage.
2. **`studios/studio-performance/studio-performance.service.ts`** — 928 LOC, no repository, `Record<string,any>` casts, silent Decimal try/catch.
3. **`studios/studio-costs/studio-costs.service.ts`** — 939 LOC, same pattern.
4. **`task-orchestration/task-orchestration.service.ts`** — 672 LOC across 4–5 workflows; sequential `bulkApproveTasks` loop; in-memory member find.
5. **`models/task-template/task-template.repository.ts`** — no `txHost` (consistency); 560 LOC nearing limit.
6. **`models/task/task.repository.ts`** — 735 LOC; `reserveMaterialAssetUploadVersion` version-bump issue.
7. **`task-orchestration/task-generation-processor.service.ts`** — `as any` defeats `TASK_TYPE` validation on persisted JSON.
8. **`models/show/show.service.ts`** — thin pass-through `@internal` methods.
9. **`lib/storage/storage.service.ts`** — `useCase` sanitization (S, security-adjacent).

> *Removed from this list vs. raw synthesis:* `show-platform.repository.ts` (false positive — already correctly wired).

---

## Phased plan

### Phase 0 — Bugs & security (do first, low-risk, parallelizable)
Independent of any structural change; must not wait behind big refactors.
- [ ] **T8** Sanitize `useCase` in `generateObjectKey` (apply `sanitizeFileName` to all path components).
- [ ] **T8** Redact internal JWKS URL + upstream error detail from `backdoor-auth.controller.ts`; log full detail at ERROR.
- [ ] **T5** Stop `version` bump on `reserveMaterialAssetUploadVersion` (pending D1 — at minimum remove the spurious-409 path).
- [ ] **T7/T1** Add the missing raw-SQL regression test for `show-platform.repository.ts` `updatePerformanceMetric` (the one valid residual from that slice).

> Note: there is **no confirmed live runtime crash** to fix in Phase 0 (the `show-platform` "latent failure" was a false positive). Phase 0 is hardening + the spurious-409 fix.

### Phase 1 — Transaction & type foundations (must precede decomposition)
Establish the safe substrate so Phase 2 moves code without relocating defects.
- [ ] **T1** Repository transaction-wiring audit + fixes: `TaskTemplateRepository`, `ShowStandardRepository`, `ScheduleSnapshotRepository` (extend `BaseRepository` / inject `txHost`).
- [ ] **T3** Define Zod schemas for recurring JSONB shapes (studio `metadata.localization` / `performance_templates`, task snapshot schema, upload routing); parse at the boundary.
- [ ] **T3** Strict registry lookup for `task_type` (kill `task-generation-processor.service.ts:140` `as any`).
- [ ] **T4/D4** Introduce shared money utility; convert `Prisma.Decimal` → string at service boundaries.
- [ ] **Resolve decisions D1, D2, D4** (they shape Phase 2).

### Phase 2 — God-service decomposition (bulk of effort, parallelizable by slice)
Once Phase 1 lands, these are independent workstreams. Fold T6 (thin-wrapper removal, where-clause relocation) into each slice — not separate PRs.
- [ ] **`show-orchestration`** → `ShowAssignmentOrchestrator` + `CreatorCompensationService` + `ShowRunReviewService` (read-only review analytics is **not** orchestration — see D3). Target each <400 LOC.
- [ ] **`studio-costs` / `studio-performance`** → introduce `StudioCostsRepository` / `StudioPerformanceRepository` (D2), then extract calculation/loop/metric helpers into focused modules.
- [ ] **`task-orchestration`** → split submission / assignment / retrieval / deletion behind a coordinating facade; fix the sequential `bulkApproveTasks` loop and in-memory member find.
- [ ] **`task.repository.ts` / `task-template.repository.ts`** → extract large query methods into dedicated query services.

### Phase 3 — Convention sweep + tests (parallelizable, partly folded into earlier PRs)
- [ ] **T7** Batch quick wins: `async` keywords, missing decorators, `HttpError` in guards/services, `@Param('id')` standardization, duplicate-file de-dup, UID-prefix centralization.
- [ ] **T5** Standardize `{ increment: 1 }`; resolve D5 (publish version bump).
- [ ] **T9** Strengthen test-helper typing; migrate outlier specs as their services are refactored (ride alongside Phase 2).

**Sequencing rationale:** fix bugs → harden boundaries (transactions + types) → restructure → polish. Each structural change then runs against a correct, typed, transaction-safe substrate.

---

## Open decisions (need human direction before the dependent work)

| # | Topic | Question | Recommendation |
| --- | --- | --- | --- |
| **D1** | Material-asset upload counter | Keep bumping optimistic-lock `version`, move to a side table, or accept the race? | **Move to a dedicated `MaterialAssetUploadReservation` table** if durable; else stop bumping and accept the race. Either way **stop bumping `version`**. |
| **D2** | Repository layer for analytics services | Keep direct `PrismaService` in `studio-costs`/`studio-performance`, or introduce repositories? | **Introduce `StudioCosts`/`StudioPerformance` repositories.** Prerequisite for clean decomposition (Phase 2). |
| **D3** | Show-run-review separation | Keep review analytics in `ShowOrchestrationService` or split out? | **Split into `ShowRunReviewService`** — read-only, no writes; biggest contributor to the 1446 LOC. |
| **D4** | Money representation | Domain `Money` type vs `Prisma.Decimal` in signatures? | **Shared money utility now** (Decimal→string at boundary), adopt a domain `Money` type incrementally. |
| **D5** | Publish version bump | Should publishing a schedule bump `version` (restore does)? | **Bump on publish** — `status→published` + `publishedAt` are user-visible mutations. If intentionally not, document in code. |
| **D6** | Schedule snapshot delete semantics | Soft-delete to match convention, or hard-delete for immutable snapshots? | If snapshots are immutable audit records, **keep hard delete but document the exception** and remove any unused `deletedAt`; still extend `BaseRepository`. |
| **D7** | Google Sheets auth model | API-key vs JWT + `@CurrentUser`? | **Keep API-key** (Apps Script service-to-service), but thread an explicit service-account/actor identity instead of reading `createdBy` off the schedule (auditable). |

---

## Quick wins (high value, low effort)

- Sanitize `useCase` in `storage.service.ts` `generateObjectKey`.
- Remove duplicate files: pick canonical between `api-response.decorator.ts` / `zod-response.decorator.ts`; drop `BaseAdminController`'s redundant `ensureResourceExists`; remove `JwtAuthGuard`'s duplicate `transformUser`.
- Add missing `async` on admin create methods (platform, show-type, show-standard, show-status) + `ensureResourceExists` in `admin-show` GET.
- Add `@ZodPaginatedResponse` to `studio-show.controller.ts` `runReview*` methods.
- Replace native exceptions with `HttpError` in `show-platform-violation.service.ts:63` and `lib/guards/base-api-key.guard.ts`.
- One shared `Omit`/discriminated-union response type to kill `planDocument: undefined as any` (three sites).
- Redact internal detail from `backdoor-auth.controller.ts`.
- Standardize admin param naming on `@Param('id')`.
- Centralize show-family UID prefixes into a constants module (removes `show.schema.ts` → service-class circular-import risk).

---

## Appendix — per-slice finding counts

| Slice | Total | High | Med |
| --- | --- | --- | --- |
| models-task | 9 | 2 | 2 |
| models-show | 10 | 2* | 4 |
| models-schedule | 7 | 1 | 4 |
| models-org | 6 | 0 | 3 |
| models-finance | 0 | 0 | 0 |
| orch-fact | 0 | 0 | 0 |
| orch-shift | 8 | 0 | 1 |
| show-orch | 6 | 1 | 2 |
| task-orch | 6 | 2 | 2 |
| sched-plan | 5 | 0 | 1 |
| studios-analytics | 15 | 2 | 7 |
| studios-controllers | 9 | 1 | 3 |
| studios-rest | 2 | 0 | 1 |
| admin | 10 | 0 | 5 |
| me | 3 | 0 | 1 |
| lib | 12 | 1 | 3 |
| uploads-sheets | 3 | 0 | 1 |
| backdoor | 3 | 0 | 1 |
| tests | 11 | 0 | 3 |

\* one `models-show` high (`show-platform` tx wiring) was verified as a **false positive**.

**Under-reported slices:** `orch-fact` and `models-finance` were re-audited deeply with opus — see the addendum below. Verdict: genuinely clean code with minor issues; no high-severity bug, but a real test-coverage gap.

---

## Deep-Audit Addendum — under-reported slices (opus pass, 2026-06-12)

The two slices that returned zero haiku findings were re-audited by 5 **opus** agents reading every source file *and* its spec, scoring three dimensions: patterns, **correctness (does the feature work as-is)**, and **test gaps**. The final synthesis agent hit a session limit; this section is synthesized by the main loop from the five slices' raw output.

**Verdict: the haiku "zero findings" was substantially correct on *patterns and correctness* — these are mature, heavily-reviewed slices and no high-severity latent bug was found. All five verdicts: `minor-issues`. What the fast pass missed was real but lower-tier: 16 pattern findings, 17 correctness risks (2 medium, rest low), and a **25-item test-coverage gap** — coverage is thinner than the code's money/concurrency risk warrants.**

### Feature-correctness baseline
- `pnpm --filter erify_api typecheck` → clean.
- `pnpm --filter erify_api test` → **130 suites / 1157 tests pass** (~12s). This is the behavior-preserving reference; every hardening change must keep it green.

### Correctness risks worth attention (the "does it work as-is" answer)
| # | Severity | File | Risk | Covered? |
| --- | --- | --- | --- | --- |
| C1 | **medium** | `fact-extraction` show/creator/platform actuals extractors + `show.service.updateShow` | **Whole-blob `metadata` read-modify-write** on the datetime `actuals_source` provenance map. Two near-simultaneous COMPLETED transitions on the same show writing *different* actuals keys aren't collision-blocked (collision is per-fact-key) → last-write-wins drops the sibling key's provenance → that key's source resets to PLANNED → a later lower-rank PLATFORM sync could overwrite a value it should have lost to. Same class as the Codex P1 race already fixed for the numeric `performance_templates` family (single-key `jsonb \|\|` UPDATE); the older datetime path still uses whole-blob replace. | no |
| C2 | **medium** | `models/task-report/task-report-content-value.ts` | **Blank numeric → 0.** `normalizeFieldValue` for `number` does `Number('') === 0 → returns 0`, so a submitted-but-blank metric (e.g. GMV) renders as `0`, not "not reported" — a meaningful business distinction silently fabricated. Whitespace-only strings too. | no |
| C3 | **medium** | `models/platform/platform.repository.ts` | Custom `findMany` override omits the `deletedAt: null` default that `BaseRepository.findMany` applies → returns soft-deleted rows. No live caller today (unexposed), so latent, not active. | no |
| C4–C17 | low | various | `''` templateUid provenance sentinel; paired-key `factKey`-vs-`contentKey` skip asymmetry; multiselect non-array→null and checkbox string-coercion drops; preflight/load TOCTOU on the 10k row guard; `compensationLineItemDto` page-fatal throw on impossible null target; legacy-merger tie-order relies on (guaranteed, Node ≥22) sort stability; audit `action` bare cast; partial-update explicit-undefined reliance on Prisma skip semantics. None are active bugs. | mixed |

### New themes (not already in T1–T9)
- **T10 — Whole-blob JSONB provenance race on the datetime actuals path** · `medium`. C1 above. **Recommendation:** accept as documented tech-debt now (narrow window), log in `docs/tech-debt/`, add the characterization test, and converge the datetime path onto the single-key `jsonb ||` merge the performance family already proved — folded into the fact-extraction refactor (Phase 2).
- **T11 — Report value-normalization correctness** · `medium`. C2 + multiselect/checkbox coercion. **Recommendation:** treat blank/whitespace as `null` for numeric fields; pin all normalization branches with a characterization spec first (there is none today).

### Test-hardening backlog (the deliverable for "improve tests to lock feature + expectation")
Highest-priority gaps (full 25-item list drives the work-items doc):
1. **`fact-extraction.service.spec`** — no test drives a numeric/performance fact (`gmv/ctr/cto/view_count`) through `extractFromTask`; performance coverage is extractor-only. Add orchestrator-level routing tests (stale-target, sibling-collision) **and** assert `task.template?.uid` threads into `ctx.templateUid`. *(high — guards the entire template-precedence system that's currently green-but-unpinned)*
2. **`compensation-line-item.repository.spec`** — **does not exist.** The highest-logic, lowest-tested file: `buildWhere`/`buildTargetFilter` soft-delete, studio scoping, date range, and the 4-way OR target fallback are unpinned. Plus `sumActiveAmountsByShowCreatorUids` Decimal aggregation (a money path). *(high)*
3. **`task-report-content-value.spec`** — **does not exist.** Characterize every `normalizeFieldValue` branch (blank→0, multiselect, checkbox) so C2's fix is a deliberate contract change, not silent. *(high)*
4. **`platform.repository.spec`** — **does not exist.** Characterize soft-delete filtering + the `findMany` footgun before removing it. *(high)*
5. **Cross-fact ordering** — service-level test: one submission setting `attendance_missing=false` + a late `actual_start_time`, asserting the late reason survives regardless of per-fact loop order. *(high)*
6. **C1 characterization** — seed `actuals_source={show_actual_start_time:'OPERATOR'}`, write `show_actual_end_time`, assert the start entry survives — locks current behavior and will fail loudly when the concurrent-safe merge lands. *(medium)*

### New decisions (append to D1–D7)
| # | Topic | Recommendation |
| --- | --- | --- |
| **D8** | Datetime `actuals_source` durability — migrate to single-key `jsonb ||` merge or accept the window? | **Accept as documented tech-debt now**, add the C1 characterization test, converge later during the fact-extraction refactor. |
| **D9** | Blank numeric semantics — `null` vs `0`? | **`null`** (guard `value.trim()===''` before `Number()`). `0` vs not-reported is a real business distinction. Pin with a test. |
| **D10** | `platform.repository.findMany` override — delete or fix? | **Delete it** (no caller; base method already filters). |
| **D11** | `studioId` fields that actually carry UIDs — rename to `studioUid`? | Rename within the compensation slice for clarity; confirm no intentional repo-wide `...Id`-for-UID convention first. |
| **D12** | Performance-fact vs datetime cross-task collision precedence | **Keep current conservative `skipped_collision` routing**, document the cross-precedence interaction in a comment, pin with a characterization test. |
| **D13** | `task_report` blank/inactive shared-field surfacing & `targetId`-without-`targetType` OR path | Require `target_type` alongside `target_id` at the schema boundary; decide inactive-shared-field visibility explicitly and encode in a test. |
