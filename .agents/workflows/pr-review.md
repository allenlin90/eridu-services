---
description: Pre-merge quality gate — pattern compliance, code review, and verification before a PR is merged to master
---

# PR Review Workflow

Run this workflow before merging any PR. Scope the changed layers first, then run only the gates that apply. The final **Wrap-up** step is part of the merge-readiness verdict — a PR is not "ready" until the knowledge and doc changes it implies have landed in the same PR.

> **Companion**: The [Wrap-up step](#wrap-up--knowledge-sync--merge-readiness-verdict) folds `knowledge-sync.md` and the [doc-lifecycle skill](../skills/doc-lifecycle/SKILL.md) into this gate, so skill/doc/lifecycle updates land *in the same PR* before the verdict — not in a follow-up commit after merge.

---

## Step 1 — Identify scope

```bash
git diff --name-only origin/master...HEAD
```

Map each changed path to its review gate:

| Path prefix                                                                      | Gate                                          |
| -------------------------------------------------------------------------------- | --------------------------------------------- |
| `apps/erify_api/src/`                                                            | [§ erify\_api gate](#erify_api-gate)          |
| `apps/eridu_auth/src/`                                                           | [§ eridu\_auth gate](#eridu_auth-gate)        |
| `apps/erify_studios/src/` · `apps/erify_creators/src/`                           | [§ Frontend gate](#frontend-gate)             |
| `packages/api-types/` · `packages/auth-sdk/` · `packages/ui/` · `packages/i18n/` | [§ Shared package gate](#shared-package-gate) |
| `apps/*/docs/` · `docs/` · `.agents/`                                            | [§ Documentation gate](#documentation-gate)   |

Multiple gates apply when a PR spans layers. Run all that match.

---

## Architecture trigger audit

Run this audit against the changed code and the canonical tech-debt, ideation, and design documents related to that surface. A threshold is normally a prompt for review, not an automatic instruction to introduce a pattern or broaden the PR.

Classify each applicable signal:

| Signal class | Examples | Required outcome |
| --- | --- | --- |
| Hard invariant | New module cycle or unjustified `forwardRef`; transaction, authorization, soft-delete, UID-boundary, or bounded-input regression | Resolve before merge. **BLOCKING.** |
| Local design signal | A behavior-bearing backend file crosses roughly 600 LOC; a frontend route or feature module crosses roughly 200 LOC; a service constructor grows beyond roughly eight collaborators | Load the relevant refactor/design skill and assess cohesion. Split, document a cohesive exception, or update an active split plan. The number alone is not blocking. |
| Existing decision trigger | The diff satisfies or materially changes a trigger in a related `docs/tech-debt/`, `docs/ideation/`, or active design document | Handle it in scope, or update the canonical entry with current evidence, owner/scope, and acceptance criteria. Do not create a parallel backlog. |
| Strategic architecture gate | CQRS infrastructure, worker runtime, read store, package extraction, or a new port/adapter boundary becomes plausible | Start or update an architecture decision when its documented evidence gates are met. Do not adopt the pattern mechanically from a count. |
| Repository trend | Total module breadth, shallow-module count, dependency-graph width, or whole-runtime import closure | Defer repository-wide measurement to `repository-health.md` unless this PR directly regresses the signal. |

Record one result for every trigger affected by the diff:

- `NOT TRIGGERED` — the relevant threshold or gate remains unmet;
- `TRIGGERED — HANDLED` — the PR contains the scoped implementation or documentation response;
- `TRIGGERED — REGISTERED` — broader work is intentionally separate and its canonical debt/ideation entry was reconciled in this PR;
- `BLOCKING` — the diff violates a hard invariant or crosses an explicit mandatory gate without a response.

- [ ] Related tech-debt, ideation, and active design documents were checked for triggers changed by this PR.
- [ ] Size and collaborator thresholds were treated as cohesion-review signals, not automatic refactor mandates.
- [ ] Any new repository export, cross-capability persistence dependency, module cycle/`forwardRef`, or runtime import-closure expansion has an explicit architectural justification.
- [ ] Advanced patterns were introduced only against their documented evidence gates.
- [ ] Trigger outcomes and evidence appear in the review verdict.

When a PR changes `apps/erify_api` module imports, exports, runtime entry modules, or capability boundaries, run:

```bash
pnpm architecture:signals
```

Compare the output with the architecture baseline named by the affected design/canonical document. A new cycle is blocking. Edge, shallow-module, exported-repository, or runtime-closure changes are review signals that require explanation, not automatic failures.

For the accepted `erify_api` refactor, the source comparison is
[`architecture-signals-baseline.json`](../../apps/erify_api/docs/design/architecture-signals-baseline.json).
Use the PR base for a diff-scoped comparison as well; the source snapshot shows
the long-running program trend, while the PR base identifies regressions from
the current architecture.

---

## erify_api gate

### Repository checks

For **every new named repository method** (beyond `findOne`/`findByUid`):

1. **Necessity test** — can the body be replaced by `findMany({ where: {...} })` called from the service? If yes → delete the method, inline at the service. **BLOCKING.**
2. **Exception justification** — if the method IS necessary (non-trivial query, multi-step op, reused complex logic), it must have an `// Engineering decision:` comment in code explaining why `findMany` is insufficient.
3. **Feature doc record** — the same decision must appear in the relevant feature doc (Key Product Decisions or Design Decisions) so it is traceable.

- [ ] Every new named repository method has passed the necessity test or carries a documented exception (code comment + feature doc entry).
- [ ] All custom queries filter `deletedAt: null` unless `includeDeleted` is explicit.
- [ ] No `Prisma.*` types leaking into service method signatures — payload types defined in schema files.
- [ ] No `findByUidOrThrow` — return `null`, let the controller call `ensureResourceExists()`.
- [ ] No Prisma query-building in services — `where` clauses belong in repositories.
- [ ] Raw SQL (`$executeRaw` / `$queryRaw`) references `@@map`/`@map` names, not model/field names — Prisma does not map raw queries. New raw-SQL methods carry a regression test asserting the literal table name.
- [ ] Any new "operational day" / relative-date (`today`, `yesterday`, business-day) resolution reuses `OPERATIONAL_DAY_START_HOUR`/`toOperationalDayKey` from `apps/erify_api/src/lib/utils/operational-day.util.ts` — no independent reimplementation of the cutover-hour shift. See `.agents/skills/operations-review-surface/SKILL.md` § Operational-day bucketing.

Full reference: `.agents/skills/repository-pattern-nestjs/SKILL.md`

### Service checks

- [ ] Service method signatures use payload types, not `Prisma.*` input types.
- [ ] Multi-step writes use `@Transactional()` — no manual `tx` passing.
- [ ] Orchestration services throw `HttpError`; model services return `null` for not-found.

Full reference: `.agents/skills/service-pattern-nestjs/SKILL.md`, `.agents/skills/orchestration-service-nestjs/SKILL.md`

### Controller checks

- [ ] Studio-scoped routes use `@StudioProtected([...roles])` and `@StudioParam()`.
- [ ] Path params use `UidValidationPipe`.
- [ ] Response decorators used (`@ZodResponse`, `@AdminResponse`, etc.) — no manual `res.json()`.
- [ ] Controllers are transport-only: no business logic, no Prisma, no finance arithmetic.
- [ ] Studio-scoped writes enforce role (`ADMIN` or `MANAGER`) — not just membership.
- [ ] Delete endpoints restricted to `ADMIN` unless explicitly approved.
- [ ] No internal BigInt IDs exposed in API responses.

Full reference: `.agents/skills/backend-controller-pattern-nestjs/SKILL.md`, `.agents/skills/erify-authorization/SKILL.md`

### Read-model / report projection checks

- [ ] A report/read-model column bound to a `system_fact_key` reads the **extracted fact** (the `ShowPlatform`/`ShowCreator`/`Show` column, or the canonical read-model aggregate) — never re-parses `task.content`. Aggregation reuses the shared helper (`aggregateShowPlatformPerformance`) so report and dashboard can't drift. Reading raw content reintroduces stale-target, source-priority, and `Decimal`-precision divergence.
- [ ] Hydrated, per-target facts with no defined one-row-per-show scalar (per-platform violation, per-creator attendance/times) are **rejected** at projection (clear error), not emitted as a silent `null`.
- [ ] A blank fact cell caused by an unextracted (still-`REVIEW`) task is surfaced as a pending warning, not a silent blank — facts only exist after the `COMPLETED` transition.

Full reference: `apps/erify_api/docs/TASK_SUBMISSION_REPORTING.md` § System-fact columns

### Schema & migration checks

- [ ] New migrations are generated by official tooling and named by **purpose only** (`client_mechanic_foundation`) — no PR numbers, roadmap rows, ticket IDs, or phase/plan labels (`pr_20_1_*`, `phase4_*`) in the folder name. **BLOCKING.** Rename before merge if the migration is not yet deployed to a shared environment (update `_prisma_migrations.migration_name` to match).

Full reference: `.agents/skills/database-patterns/SKILL.md` §12

---

## eridu_auth gate

`eridu_auth` is a Hono app with Drizzle ORM — NestJS patterns do not apply here.

- [ ] Route handlers use Hono context (`c.req`, `c.json()`) — no NestJS decorators.
- [ ] DB access goes through Drizzle queries, not Prisma.
- [ ] Auth flows (session creation, JWT issuance, JWKS) follow the patterns in `.agents/skills/authentication-authorization-nestjs/SKILL.md` § eridu_auth section.
- [ ] No secrets or signing keys hardcoded — environment variables only.
- [ ] SSO flows follow the integration pattern in `.agents/skills/ssr-auth-integration/SKILL.md`.

---

## Frontend gate

Applies to `erify_studios` and `erify_creators`.

### API layer

- [ ] Server state uses TanStack Query — no manual `useState` + `useEffect` for fetches.
- [ ] Query keys follow the project key factory pattern (see `.agents/skills/frontend-api-layer/SKILL.md`).
- [ ] Mutations use `onMutate`/`onError`/`onSettled` for optimistic updates where the UX requires it.
- [ ] No direct `fetch`/`axios` calls outside the API layer module.
- [ ] Searchable lookup inputs/filters have an explicit per-field data-source contract (`scoped endpoint` vs documented local filter) and matching query-key scope discrimination where applicable.
- [ ] Hook files with two or more lookup hooks extract a shared internal search-query helper — no copy-pasted `useState`/`useQuery`/`staleTime`/`gcTime`/`enabled` blocks across hooks in the same file.

### State management

- [ ] URL/search params own filterable/shareable state — not component `useState`.
- [ ] No `useCallback` on small local handlers without a documented stability reason.
- [ ] No `useMemo` wrapping simple object shaping without a measured perf or correctness need.

Full reference: `.agents/skills/frontend-state-management/SKILL.md`

### Components and UI

- [ ] Shared primitives come from `@eridu/ui` — no local re-implementations of Radix/Tailwind primitives.
- [ ] The rendered control composition was compared with the nearest same-purpose shipped screen and shared primitive, not reviewed only for local correctness. The PR identifies the reference or explains why no precedent applies.
- [ ] A semantic date interval (`*_from` + `*_to`) renders as one `DatePickerWithRange`; two or more secondary filters are consolidated behind one responsive `Filters` Popover/Sheet. Search, page size, refresh, export, and primary actions stay outside; filter reset preserves independent view controls.
- [ ] Form/dialog field inventory matches the intended product/API contract; any intentionally excluded fields (for example `external_id`) are documented in the design doc and called out near form/schema composition.
- [ ] Date and datetime editing uses `DatePicker` / `DateTimePicker` / `ResponsiveDateTimePicker` from `@eridu/ui`; native `type="date"` / `type="datetime-local"` inputs only appear with a documented exception.
- [ ] Datetime pickers on any mobile-reachable form use `ResponsiveDateTimePicker` (not `DateTimePicker`) so the picker becomes a vaul `Drawer` below `md`.
- [ ] Any new Dialog reachable on a mobile route follows the responsive dialog → drawer pattern (`useIsMobile()` switch, shared body component, vaul `Drawer` below `md`). Exceptions: plain confirmations or surfaces never rendered below `md`, documented near the component. See `.agents/skills/frontend-ui-components/SKILL.md` § Responsive Dialog → Drawer Pattern.
- [ ] `AsyncCombobox` / `AsyncMultiCombobox` search wiring is complete: no `onSearch={() => {}}`, no dead “search” affordances, and no undocumented mixed remote/local behavior across fields in the same form.
- [ ] Forms with 2+ async lookup fields use isolated `memo()` field components — async lookup hooks are not called at the parent-form level when two or more exist.
- [ ] Review evidence exists for searchable fields: either tests or direct verification that typing changes the intended query state or the documented local-filter state.
- [ ] Nullable prop guards: explicit non-null guard before dereference — no `a?.x === b?.y` then `a.x`.
- [ ] Route guards and sidebar visibility reference the same access policy source.
- [ ] i18n strings go through Paraglide — no hardcoded UI copy.
- [ ] No scattered magic values: repeated viewport/layout offsets (`calc(100vh-Xrem)`, gutters, overlay heights) live in `src/config/layout.ts`; pagination/fetch limits, durations, and similar tunables live in named constants — not duplicated inline. Layout constants hold the **full literal** Tailwind class (JIT-safe). Bespoke single-use composites (e.g. `min(20rem,calc(100vw-2rem))`) may stay inline. See `frontend-code-quality` rules 6–7.

Full reference: `.agents/skills/frontend-ui-components/SKILL.md`, `.agents/skills/frontend-i18n/SKILL.md`

### PWA (erify_studios only)

- [ ] Service worker cache boundaries respected — no dynamic data cached at the app-shell layer.
- [ ] SW registration and update flows follow `.agents/skills/pwa-best-practices/SKILL.md`.

---

## Shared package gate

Applies to any change under `packages/*`.

- [ ] Package exports from `dist/` only — never from `src/`.
- [ ] `package.json` exports map has both `types` and `default` fields for every entrypoint.
- [ ] Internal cross-package dependencies use `workspace:*` — never `file:` or pinned versions.
- [ ] `tsconfig.json` includes `declaration: true`, `declarationMap: true`, `sourceMap: true`, `outDir: "dist"`.
- [ ] No path mappings to workspace `src/` in consuming apps — TS resolves via `package.json` exports.
- [ ] If `build` copies/generates a non-TS static asset into `dist/` (stylesheet, image, etc.), `dev` produces it too before the watch starts. Verify by simulating a fresh clone (`rm -rf packages/<pkg>/dist` then run the app's `dev`/`dev:*` script) — a package asset that only `build` creates must not 500 the consumer's dev server.
- [ ] If a package exports a Tailwind stylesheet from `dist/`, its `@source` glob covers every emitted file type consumers load (`.js` as well as `.ts`/`.tsx`) — a glob scoped to source extensions silently drops utility classes from the built JS while theme tokens still load. See `.agents/skills/frontend-tech-stack/SKILL.md`.
- [ ] If `package.json` changed: `pnpm install` was re-run and `pnpm-lock.yaml` is committed in the same change.
- [ ] Sherif passes: `pnpm sherif` — no version mismatches across the workspace.

Full reference: `.claude/memory/monorepo-package-rules.md`

---

## Documentation gate

- [ ] Any implemented design doc in `apps/*/docs/design/` has been promoted (stripped of task lists, moved to `docs/` root, indexes updated). See the `doc-lifecycle` skill's **Design Doc Promotion** procedure.
- [ ] Shipped feature docs and roadmap/index tables point to canonical `apps/*/docs/*.md` files, not deleted `apps/*/docs/design/*.md` paths.
- [ ] PRD for shipped features promoted to `docs/features/` and deleted from `docs/prd/`.
- [ ] `apps/*/docs/README.md` Features table lists promoted docs with `✅` and correct paths (not `design/` paths).
- [ ] `apps/*/docs/design/README.md` contains only active design proposals; no shipped/implemented items remain in the design index.
- [ ] Accepted non-blocking review issues are captured in `docs/tech-debt/` with scope, risk, trigger to fix, and acceptance criteria.
- [ ] **If this PR changes an established pattern, convention, or architectural direction** (deprecates/supersedes a skill, flips a default, changes a doctrine): every skill/rule/workflow/doc asserting the old pattern is reconciled in this PR, or explicitly deferred with a recorded gate. Enumerate via `grep -rln "<skill/pattern>" .agents .claude docs apps/*/docs AGENTS.md`. A canonical doc left asserting the superseded pattern is **BLOCKING**. If the direction is only partly accepted, the skills state which part is active and which is gated. See `agent-instruction-maintenance` § Pattern or Direction Change Gate.
- [ ] No stale links to deleted or moved files.

---

## Verification gate

Run for **each changed workspace**:

```bash
pnpm --filter <workspace> lint
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> test
pnpm --filter <workspace> build   # required when package wiring, exports, or tsconfig changed
```

Run the repository-wide markdown formatting check:

```bash
pnpm lint:markdown
```

If formatting errors are found, you can format them automatically with:

```bash
pnpm format:markdown
```

Workspaces: `erify_api` · `eridu_auth` · `erify_studios` · `erify_creators` · `@eridu/api-types` · `@eridu/auth-sdk` · `@eridu/ui` · `@eridu/i18n`

All checks must pass before merge.

---

## Wrap-up — knowledge sync & merge-readiness verdict

Run this after the gates and verification pass, **before** declaring the PR ready to merge. Correct code is necessary but not sufficient: the knowledge artifacts a PR touches — skills, canonical docs, lifecycle docs — must travel *with the code in the same PR*. Updates deferred to "after merge" drift out of sync and skip the review that would have caught them, which is exactly the failure the `phase-roadmap-status-update-timing` rule exists to prevent.

For the [integration PR delivery workflow](integration-pr-delivery.md), run this review on every breakdown PR before it merges into the integration branch, then run it again on the complete main PR diff against `master`. A breakdown PR retires only artifacts it fully completes; the main PR owns program-level lifecycle retirement, final roadmap status, and the combined merge-readiness verdict.

Scope this to what **this PR** changed. This is not a full phase audit — that belongs to the `doc-lifecycle` skill at phase close.

### 1. Sync knowledge artifacts

Run the parts of `knowledge-sync.md` that apply to the behavior/contracts this PR changed:

- [ ] **Skills** — the most relevant `.agents/skills/*/SKILL.md` reflect any new or changed pattern this PR establishes. Capture recurring implementation/review patterns for future agents; skip one-off task logs. If this PR introduced a review rule worth enforcing, it is added to the matching gate in *this* workflow too.
- [ ] **Workflows / rules** — if this PR changed a repeatable process or added a mandatory constraint, the relevant `.agents/workflows/*.md` / `.agents/rules/*.md` (and `AGENTS.md`) are updated.
- [ ] **Canonical docs** — implemented behavior is recorded in `docs/features/` or `apps/*/docs/` per `knowledge-sync.md` § 2; feature docs reference source files, not inline code.
- [ ] **Memory** — durable project knowledge recorded in `.claude/memory/*.md` where applicable.

### 2. Retire shipped lifecycle docs

For artifacts **this PR completes**, run the matching `doc-lifecycle` procedure — and retire them in this PR so the planning artifact and its implementation land and close together:

- [ ] **Design docs** — any `apps/*/docs/design/*.md` whose behavior shipped here is promoted to the app's `docs/` root and removed from the design index (`doc-lifecycle` → Design Doc Promotion).
- [ ] **PRDs** — any `docs/prd/*.md` this PR fully implements is promoted to `docs/features/` and deleted (`doc-lifecycle` → PRD Transitions → Shipped).
- [ ] **Superpowers specs/plans** — any `docs/superpowers/specs|plans/*` this PR fully implements is retired (`doc-lifecycle` → Planning Artifact Retirement).
- [ ] **Roadmap** — the relevant `docs/roadmap/PHASE_*.md` row status is updated to what actually shipped, in this PR.
- [ ] **Links** — no stale references to moved/deleted docs remain: `grep -rn "<old-path>" . --include="*.md" --exclude-dir=node_modules --exclude-dir=.git`.

### 3. Fold the changes into the PR

The doc/skill/lifecycle edits above must travel with the code they describe:

- [ ] Wrap-up changes are committed on the PR branch and pushed (confirm before pushing per house rules; squash-merge style per `pr-merge-style`).
- [ ] The PR description is updated to match what was actually delivered — run the PR description check below.

Only once §1–§3 are done is the verdict **ready to merge**.

---

## PR description check

- [ ] Title is concise (under 70 characters) and describes the change, not the implementation.
- [ ] Summary matches what was actually delivered — no references to deleted files or stale paths.
- [ ] Docs section lists canonical paths (not `design/` paths for promoted docs).
- [ ] Validation section reflects current pass/fail state for all affected workspaces.
- [ ] **If the PR touches UI** (Frontend gate or eridu_auth frontend): the PR description embeds in-browser screenshots of the shipped UI states (empty/populated/error/each dialog as relevant) per `.agents/skills/pr-ui-screenshot-review/SKILL.md`. This is required, not optional, for any PR that adds or materially changes rendered UI — evidence only, never committed to the repo. A PR that only tweaks copy, a single style value, or non-visual logic in a UI file may skip this; note the skip reason in the description rather than silently omitting it.
- [ ] **If the PR changes a filterable surface**: UI evidence includes the filter surface open at desktop and mobile widths, so reviewers can verify consolidation, date-range semantics, active-filter state, reset behavior, and overflow—not only the table with filters collapsed.
- [ ] **If the feature's UX was validated pre-implementation** via `ui-mockup-discussion` (rendered mockup + user discussion, not a prose description): the PR description links back to the settled decision — the design/spec doc's UX section, or a one-line summary of what was validated and where. This is what lets a reviewer check the shipped UI against the UX that was actually agreed on, not just against the code diff. If the PR's UX was fully pre-specified (no mockup phase needed), note that instead of leaving the check silently unaddressed.

---

## Completion Checklist

- [ ] All applicable gates run (erify_api / eridu_auth / frontend / packages / docs).
- [ ] Architecture trigger audit recorded `NOT TRIGGERED`, `TRIGGERED — HANDLED`, `TRIGGERED — REGISTERED`, or `BLOCKING` for every affected signal.
- [ ] Every new named repository method: necessity tested; exceptions documented in code and feature doc.
- [ ] No Prisma types in service signatures; no business logic in controllers.
- [ ] All implemented design docs promoted; no `✅` items remaining in any Design table.
- [ ] All PRDs for shipped features promoted to `docs/features/`.
- [ ] lint / lint:markdown ✅ · typecheck ✅ · test ✅ · build ✅ for all affected workspaces.
- [ ] **Wrap-up done**: skills/workflows/rules synced for patterns this PR established; canonical docs and memory updated; design docs/PRDs/superpowers specs this PR completed are retired and links are clean; roadmap row status updated in this PR.
- [ ] **Folded into the PR**: wrap-up changes committed, pushed, and the PR description updated to match delivery.
- [ ] PR description references canonical paths and reflects current state.
