# Scene QC — Main Integration PR Breakdown (Atomic Cutover and Reconciliation)

> **Parent plan**: [Scene QC Implementation Plan](./SCENE_QC_IMPLEMENTATION_PLAN.md) — §9 "Cutover from PR #319", §10 "Main Integration PR", §11–§13, §15
> **Product contract**: [Scene Quality Control PRD](../../../../docs/prd/scene-qc.md)
> **Prior siblings**: [Child PR 3 breakdown](./SCENE_QC_CHILD_PR_3_BREAKDOWN.md) (OQ-1…OQ-16), [Child PR 4 breakdown](./SCENE_QC_CHILD_PR_4_BREAKDOWN.md) (OQ-17…OQ-42)
> **Branch**: `feat/scene-qc-integration` (PR #343, targets `master` — the only merge to `master` in this program)
> **Status**: Planning artifact — no code written yet
> **Baseline**: Child PR 1 (#346), 2 (#347), 3 (#348), and 4 (#350) are all merged into the integration branch. The branch is 9 commits ahead of and 0 behind `master` at plan time.

## 0. Scope Boundary

**In scope (this PR)**

- Physical deletion of the PR #319 Task-anchored Scene Review implementation across `erify_api`, `@eridu/api-types`, and `erify_studios` (plan §9 items 3–6, 8) — §1.
- Navigation/label/copy reconciliation for the retained `/studios/:studioId/scene-review` route (plan §9 items 2, 7) — §2.
- The real evidence-binding backfill + verification gate against the target environment (plan §9 item 9, §13 items 2–3) — §3.
- Combined end-to-end and authorization coverage (plan §10 "Main Integration PR") — §4.
- The plan §11 eight-file doc/skill reconciliation set, plus the index/README files §11 omits — §5.
- `knowledge-sync` + `doc-lifecycle` program-level bookkeeping the [integration PR delivery](../../../../.agents/workflows/integration-pr-delivery.md) workflow assigns exclusively to the main PR — §6.
- §12.1 verification sweep, the residual §12.2/§12.3 scenarios, and the §12.4 rendered-evidence set — §7.
- Plan §13 rollout sequencing and the PR description's migration/rollback/verification instructions — §8.

**Explicitly out of scope (already shipped by Child PR 1–4)**

- Every Scene QC model, endpoint, service, repository, policy, schema, hook, and component. This PR **adds no product behavior**. Its only production-code change is deletion, plus the small copy/label edits in §2.3 and the tests in §4.
- The four migrations (`scene_qc_foundation`, `task_template_scene_qc_evidence_binding`, `scene_qc_audit_target_audit_id_index`, `scene_qc_review`, `scene_qc_daily_confirmation`) are already generated and checked in. **This PR generates no new migration** — see §8.1.

**Explicitly not this PR's job**

- Anything in the five open `docs/tech-debt/scene-qc-*.md` entries. They were accepted deliberately by their originating child PRs; §10.3 records which ones this PR must re-check for a changed trigger, not fix.

---

## 1. Deletion List

Every entry below was verified against the shipped tree at `3211b73f`, not read from the plan's prose. LOC counts are physical lines.

### 1.1 `erify_api` — files deleted outright (8 files, 722 LOC)

| File | LOC | Contents | Plan §9 item |
| --- | --- | --- | --- |
| [`src/models/task/scene-review.service.ts`](../../src/models/task/scene-review.service.ts) | 38 | `SceneReviewService` — `list()`, `findDetail()` | 5 |
| [`src/models/task/scene-review.service.spec.ts`](../../src/models/task/scene-review.service.spec.ts) | 73 | its spec | 5 |
| [`src/models/task/scene-review.mapper.ts`](../../src/models/task/scene-review.mapper.ts) | 251 | `TaskSceneReviewCandidate`, `mapSceneReviewDetail`, `mapSceneReviewCandidate`, and **every heuristic §9 item 6 names** (see §1.4) | 6 |
| [`src/models/task/scene-review.mapper.spec.ts`](../../src/models/task/scene-review.mapper.spec.ts) | 106 | its spec | 6 |
| [`src/models/task/scene-review-query.ts`](../../src/models/task/scene-review-query.ts) | 64 | `buildSceneReviewCandidateWhere` — the only consumer of `SCENE_REVIEW_MODE.QC_INBOX` in the backend | 3, 5 |
| [`src/models/task/schemas/scene-review.schema.spec.ts`](../../src/models/task/schemas/scene-review.schema.spec.ts) | 73 | tests the shared `sceneReviewQuerySchema` / `sceneReviewListItemSchema` from the `erify_api` side | 8 |
| [`src/studios/studio-task/studio-scene-review.controller.ts`](../../src/studios/studio-task/studio-scene-review.controller.ts) | 56 | `StudioSceneReviewController` — `@Controller('studios/:studioId/scene-review')`, `GET /` + `GET /:taskId` | 4 |
| [`src/studios/studio-task/studio-scene-review.controller.spec.ts`](../../src/studios/studio-task/studio-scene-review.controller.spec.ts) | 61 | its spec | 4 |

There is **no `src/models/task/schemas/scene-review.schema.ts`** — only its `.spec.ts`. The schema itself lives in `@eridu/api-types` (§1.5) and is re-exported through `task.schema.ts`. The plan's phrasing "old shared schemas and tests" (§9 item 8) matches this shape, but an implementer scanning for a co-located schema file will not find one. Recorded as **OQ-43**.

### 1.2 `erify_api` — surgical edits to surviving files

| File | Edit | Verified location |
| --- | --- | --- |
| [`src/models/task/task.repository.ts`](../../src/models/task/task.repository.ts) | Delete `findSceneReviewCandidates()` (lines 349–361) and `findSceneReviewCandidate()` (lines 363–381), including their two `// Engineering decision:` comments. Then remove the now-orphaned imports: `SceneReviewQueryTransformed` (line 8, leaving `ListMyTasksQueryTransformed` as the sole member of that type-import block), `buildSceneReviewCandidateWhere` (line 11, whole statement), and `sceneReviewCandidateInclude` (line 25, from the 3-member import at lines 24–28). | plan §9 item 5 |
| [`src/models/task/task-relation-query.ts`](../../src/models/task/task-relation-query.ts) | Delete `sceneReviewCandidateInclude` (lines 76–101). **Keep `showHydrationTargetSelect`** (lines 49–74) — it is also spread into `taskSnapshotTargetInclude` and `taskRelationInclude`. | plan §9 item 5 |
| [`src/models/task/task.module.ts`](../../src/models/task/task.module.ts) | Remove the `SceneReviewService` import (line 8) and its entries in `providers` (line 25) and `exports` (line 26). | plan §9 item 5 |
| [`src/models/task/schemas/task.schema.ts`](../../src/models/task/schemas/task.schema.ts) | Remove `sceneReviewDetailSchema` / `sceneReviewListItemSchema` / `sceneReviewQuerySchema` from the import block (lines 22–24) and the re-export block (lines 49–51); delete `export class SceneReviewQueryDto` (line 71). | plan §9 item 8 |
| [`src/studios/studio-task/studio-task.module.ts`](../../src/studios/studio-task/studio-task.module.ts) | Remove the `StudioSceneReviewController` import (line 3) and its entry in `controllers` (line 11). `StudioTaskModule` keeps `imports: [TaskModule, TaskOrchestrationModule]` — `StudioTaskController` still needs both. | plan §9 item 4 |
| [`src/capabilities/scene-qc/scene-qc-evidence.resolver.ts`](../../src/capabilities/scene-qc/scene-qc-evidence.resolver.ts) | Line 33 reads "…the old `models/task/scene-review.mapper.ts` heuristics the main integration PR deletes". Change the tense: the file is gone, so the comment must not read as a forward-looking pointer to a live file. Suggested: "…rather than the filename/recursive-URL heuristics the retired PR #319 Scene Review mapper used." | hygiene |

`TaskService.UID_PREFIX` and `StudioService.UID_PREFIX` are imported by the deleted controller only for `UidValidationPipe`; both classes are heavily used elsewhere and stay.

### 1.3 `@eridu/api-types` — the old shared contract (plan §9 items 3 and 8)

| File | LOC | Edit |
| --- | --- | --- |
| [`packages/api-types/src/task-management/scene-review.schema.ts`](../../../../packages/api-types/src/task-management/scene-review.schema.ts) | 110 | **Delete the whole file.** It is the sole definition site of `SCENE_REVIEW_MODE` (`analysis` / `qc-inbox`), `sceneReviewQuerySchema`, `sceneReviewEvidenceSchema`, `sceneReviewMetricsSchema`, `sceneReviewListItemSchema`, `sceneReviewDetailSchema` and their inferred types. |
| [`packages/api-types/src/task-management/index.ts`](../../../../packages/api-types/src/task-management/index.ts) | — | Delete line 21, `export * from './scene-review.schema.js';`. |

**Consumer sweep (verified exhaustive).** Every importer of `SceneReviewDetail` / `SceneReviewListItem` / `SceneReviewEvidence` / `SceneReviewMetrics` / `SceneReviewQuery*` / `SCENE_REVIEW_MODE` / `sceneReview*Schema` in `apps/**` and `packages/**` (excluding `dist/`) is itself in the delete set. Deleting the module orphans nothing. In particular `TaskQcEvidenceViewer` — the reusable viewer §9 item 7 asks to retain — is typed on its own `TaskQcEvidence` from [`features/tasks/lib/task-qc-evidence`](../../../erify_studios/src/features/tasks/lib/task-qc-evidence.ts), **not** on `SceneReviewEvidence`. It needs no change (§2.4).

`packages/api-types/dist/**` still contains the compiled `scene-review.schema.d.ts`; it is a build artifact regenerated by `pnpm --filter @eridu/api-types build` and is not a deletion target.

### 1.4 Plan §9 item 6 — the exact heuristics, located

All three named heuristics are in [`scene-review.mapper.ts`](../../src/models/task/scene-review.mapper.ts) and die with the file. Naming them explicitly so the reviewer can confirm nothing equivalent survives anywhere else:

| Plan §9 item 6 phrase | Shipped symbol | Lines |
| --- | --- | --- |
| "recursive image URL fallback" | `findFallbackEvidence(content)` — depth-first walk of the whole `task.content` blob collecting any `https?:` string that matches an image extension; invoked from `extractEvidence` whenever the snapshot schema fails to parse | 99–122, called at 129 |
| "filename-based image detection" | `IMAGE_EXTENSION_PATTERN` = `/\.(?:png\|jpe?g\|webp\|gif\|bmp)(?:\?.*)?$/i`, used both in the fallback and as an accept-rule bypass in `extractEvidence` | 45, 103, 142 |
| "provisional content-label metric extraction" | `METRIC_MATCHERS` (regex label matching for `gmv` / `viewers` / `ctr` / `cto`) + `extractMetrics(schema, content)` | 46–54, 150–171 |

`extractSubmittedAt` (lines 173–190) is a fourth item the plan does **not** list: it reads `metadata.audit.last_transition` — a `metadata.audit.*` payload the repo's core rules classify as legacy compatibility only. It dies with the file, which is the desired outcome; no replacement is needed because Scene QC pins `reviewedAt` on its own review row.

Grep gates to run after deletion (all must return zero hits outside `dist/` and this document):

```bash
grep -rn "SCENE_REVIEW_MODE\|SceneReview\|scene-review\." apps packages --include="*.ts" --include="*.tsx" | grep -v /dist/
grep -rn "findFallbackEvidence\|METRIC_MATCHERS\|IMAGE_EXTENSION_PATTERN" apps packages
```

### 1.5 `erify_studios` — the old feature folder (14 files, 1,046 LOC)

Confirmed present, confirmed **physically unreferenced** from any surviving module (Child PR 3's OQ-8 left it deliberately). Delete the whole directory `apps/erify_studios/src/features/scene-review/`:

| Path (relative to `apps/erify_studios/src/features/scene-review/`) | LOC |
| --- | --- |
| `api/get-scene-review.ts` | 76 |
| `api/__tests__/get-scene-review.test.ts` | 50 |
| `components/scene-review-context.tsx` | 86 |
| `components/scene-review-detail.tsx` | 59 |
| `components/scene-review-filter-fields.tsx` | 74 |
| `components/scene-review-mobile-drawer.tsx` | 42 |
| `components/scene-review-queue.tsx` | 122 |
| `components/scene-review-toolbar.tsx` | 193 |
| `components/scene-review-workspace.tsx` | 86 |
| `components/__tests__/scene-review-queue.test.tsx` | 83 |
| `config/scene-review-search-schema.ts` | 19 |
| `config/__tests__/scene-review-search-schema.test.ts` | 44 |
| `hooks/use-scene-review-client-filter.ts` | 26 |
| `hooks/use-scene-review-page.ts` | 86 |

`config/scene-review-search-schema.ts` is the frontend's only `SCENE_REVIEW_MODE` consumer (line 8, `mode: z.nativeEnum(SCENE_REVIEW_MODE).catch(SCENE_REVIEW_MODE.ANALYSIS)`), which closes plan §9 item 3 on the frontend side.

`components/scene-review-detail.tsx` line 9 is the only place outside `features/tasks/` that imports `TaskQcEvidenceViewer`. After deletion the viewer has exactly one consumer, [`task-qc-review-sheet.tsx`](../../../erify_studios/src/features/tasks/components/task-qc-review-sheet.tsx) — it stays where it is (§2.4).

### 1.6 Things the plan's §9 assumes but the shipped tree does not have

| Plan §9 assumption | Shipped reality | Action |
| --- | --- | --- |
| Item 3's `SCENE_REVIEW_MODE`, `analysis`, `qc-inbox` "removal" reads as three separate things | One `as const` object + two literal members, in **one** api-types file, with exactly two consumers (`scene-review-query.ts` backend, `scene-review-search-schema.ts` frontend). All in the delete set. | Nothing extra; note the single definition site in the PR description. |
| Item 5's "Scene Review methods from `TaskRepository`" (plural, unqualified) | Exactly two: `findSceneReviewCandidates` and `findSceneReviewCandidate`. No `BaseRepository` override, no shared where-builder used by another method. | §1.2. |
| Item 7's "reusable, capability-neutral evidence viewer UI" implies a move or extraction | `TaskQcEvidenceViewer` already lives in `features/tasks/`, is typed on its own local type, and is used by the surviving Task QC review sheet. Scene QC never adopted it — it built `scene-qc-image-frame.tsx` / `scene-qc-evidence-comparison.tsx` instead. | **No-op.** Record explicitly in the PR so a reviewer does not go looking for the move. |
| Item 8's "old shared schemas **and tests**" | The test lives in `erify_api` (`schemas/scene-review.schema.spec.ts`), not in `packages/api-types` — that package ships **no** test files at all. | §1.1 / §1.3. |

### 1.7 Things the shipped tree has that plan §9 does not mention

These are real cleanup obligations discovered by reading the tree, not the plan. Each is in scope.

**1.7.1 Thirty dead i18n message keys.** `apps/erify_studios/src/i18n/messages/en.json` (the Paraglide source; `src/paraglide/` is git-ignored generated output) holds 34 `scene_review_*` keys. After `features/scene-review/` is deleted, exactly **four** remain referenced — `scene_review_title`, `scene_review_description`, `scene_review_access_title`, `scene_review_access_description`, all from the surviving route/sidebar files. The other **30 are dead**, including `scene_review_analysis` and `scene_review_qc_inbox` — the literal user-facing strings for the two modes plan §9 item 3 removes:

```text
scene_review_analysis            scene_review_client              scene_review_client_empty
scene_review_client_placeholder  scene_review_close               scene_review_detail_error
scene_review_empty_description   scene_review_empty_title         scene_review_evidence_count
scene_review_filters             scene_review_filters_description scene_review_metrics
scene_review_metrics_missing     scene_review_next_page           scene_review_no_platform
scene_review_page_count          scene_review_platform            scene_review_platform_all
scene_review_platform_placeholder scene_review_previous_page      scene_review_qc_inbox
scene_review_queue_error         scene_review_reference_missing   scene_review_reference_title
scene_review_refresh             scene_review_reset               scene_review_search_placeholder
scene_review_select_prompt       scene_review_show_context        scene_review_show_date
```

Delete all 30 from `en.json`. `scene_review_close` is already dead today (pre-existing). Only `en.json` exists under `apps/erify_studios/src/i18n/messages/`, so there is no parallel locale file to keep in sync.

**1.7.2 One surviving message is now factually false.** See §2.3.

**1.7.3 Twenty-five source-code comments cite design docs this PR retires.** See §6.3 and **OQ-46**.

---

## 2. Route and Navigation Cutover

### 2.1 Already done — verify, do not redo

| Plan §9 requirement | Status | Evidence |
| --- | --- | --- |
| Item 2: retain `/studios/:studioId/scene-review` | ✅ Done (Child PR 3, OQ-8) | [`routes/studios/$studioId/scene-review/index.tsx`](../../../erify_studios/src/routes/studios/$studioId/scene-review/index.tsx) renders `<SceneQcWorkspace>` with `validateSearch: sceneQcSearchSchema`. No redirect shim, no temporary URL. |
| Item 2: retain sidebar role visibility | ✅ Done | [`config/sidebar-config.tsx:237-243`](../../../erify_studios/src/config/sidebar-config.tsx) still gates on `hasStudioRouteAccess(role, 'sceneReview')`; `STUDIO_ROUTE_ACCESS.sceneReview` is unchanged at `[DESIGNER, MANAGER, ADMIN]` ([`lib/constants/studio-route-access.ts:41-45`](../../../erify_studios/src/lib/constants/studio-route-access.ts)). |
| Route guard | ✅ Done | [`scene-review.tsx`](../../../erify_studios/src/routes/studios/$studioId/scene-review.tsx) layout still wraps `<Outlet/>` in `<StudioRouteGuard routeKey="sceneReview">`. |
| Profiles subroute | ✅ Done (Child PR 2) | `scene-review/profiles.tsx`, reached from the **Manage Scene Profiles** page action. |
| Records tab enabled; no dual-mode UI | ✅ Done (Child PR 4) | `scene-qc-tabs.tsx` has no `disabled` / "Soon" state; `scene-qc-workspace.tsx` branches only on `daily` / `records`. No `analysis` / `qc-inbox` mode survives in any rendered component. |

**Nothing about routing needs to change in this PR.** The cutover is a deletion task (§1), not a routing task.

### 2.2 Route-access key naming — keep `sceneReview`

The URL stays `/scene-review` per plan §9 item 2, so `STUDIO_ROUTE_ACCESS.sceneReview` stays. Renaming the key would force edits in `sidebar-config.tsx`, `scene-review.tsx`, `studio-route-access.test.ts`, and `sidebar-config.test.tsx` for zero user-visible benefit, and the repo has a recorded preference against churn-only route work (`route-rename-no-redirect-shims`). Decision **OQ-44**.

### 2.3 Copy edits required (small, but not optional)

Plan §7 line 361 is explicit: "Keep the existing sidebar entry and route label." So `scene_review_title` = `"Scene Review"` stays and the nav label does not change. But two surviving strings now describe a capability that no longer exists:

| Key | Current value | Problem | Proposed replacement |
| --- | --- | --- | --- |
| `scene_review_description` | `"Inspect submitted scenes and their performance context without changing task state."` | "performance context" was the deleted `extractMetrics` GMV/viewers/CTR/CTO panel. The page now records persisted PASS/MINOR/FAIL outcomes. The sentence is false on both halves. | `"Review each show's scene setup against the client's expected reference, record the outcome, and confirm the operational day."` |
| `scene_review_access_description` | `"Only studio designers, managers, and admins can access Scene Review."` | Still accurate. | No change. |

`scene_review_title` and `scene_review_access_title` are unchanged. The label/terminology mismatch (nav says "Scene Review", the PRD and every doc say "Scene QC") is deliberate per plan §7 and is recorded as a low-risk follow-up in §10.3, not resolved here.

### 2.4 Evidence viewer (plan §9 item 7)

No action. `TaskQcEvidenceViewer` is retained exactly where it is, still consumed by `task-qc-review-sheet.tsx`, still typed on `TaskQcEvidence`. The [`operations-review-surface` skill's](../../../../.agents/skills/operations-review-surface/SKILL.md) canonical-file link to `task-qc-review-sheet.tsx` therefore stays valid and needs no repair in §5.

### 2.5 `apps/erify_studios/docs` navigation references

Three docs describe the route's *content* and must be reconciled (§5.3, §5.5, §5.6); none of them describes a navigation path that changes. `apps/erify_studios/docs/README.md` line 29's index row is a **doc-lifecycle** edit (§6.2), not a navigation edit.

---

## 3. Evidence-Binding Verification

This is the one genuine data-migration gate in the PR. Read this section before scheduling the merge.

### 3.1 The blocking discovery

Child PR 2 shipped both scripts and their specs. It did **not** — and could not — populate the operator-reviewed mapping they consume:

```ts
// apps/erify_api/scripts/scene-qc-evidence-binding-map.ts
export const SCENE_QC_EVIDENCE_BINDINGS: readonly SceneQcEvidenceBinding[] = [
  // TODO(scene-qc-cutover): populate from the --report output before rollout
  // step 2. Leaving this empty makes verification fail closed for every
  // in-scope snapshot, which is the intended pre-review state.
];

export const SCENE_QC_INTENTIONALLY_UNBOUND: readonly { templateUid: string; reason: string }[] = [
  // TODO(scene-qc-cutover): populate alongside SCENE_QC_EVIDENCE_BINDINGS.
];
```

Both arrays are empty. The file's own header states that every active template feeding Scene QC must appear in exactly one of the two lists, and that `verify-scene-qc-evidence-bindings.ts` fails otherwise. With both arrays empty, the verification exits `1` for **every** in-scope snapshot, and — more importantly — the shipped resolver returns zero evidence for every Show, so on the live route every Show renders as `NO_EVIDENCE`-blocked and no operational day can ever be confirmed.

Populating those arrays requires a human to read real production Task Template data and decide, per template, which image field is Scene QC evidence. **An agent must not invent these entries.** This is escalated as **OQ-45** (§10.1) — it is a merge precondition, not an implementation step.

### 3.2 The three commands, in order

There is no `package.json` script for either file; both are invoked via `tsx`. `--since` is required by the verifier and has no default.

**Step 1 — Candidate report (read-only, run first, against a database with representative templates).**

```bash
pnpm --filter erify_api exec tsx scripts/backfill-scene-qc-evidence-refs.ts --report
```

Prints every non-deleted template's `file` fields that have a strictly image-only `validation.accept` rule and no `evidence_purpose` yet, with `templateUid`, resolved content `fieldKey`, snapshot-time `label`, and live task count. Then prints the current (empty) map's dry-run plan. **This is the input an operator reviews.** Its output is transcribed into `scene-qc-evidence-binding-map.ts` with a required `note` per binding and a required `reason` per intentional exclusion, and that file edit is committed on this PR's branch.

Guard: `ensureLocalDatabase` throws unless `DATABASE_URL` is localhost **or** `ALLOW_PROD=1` is set. Running `--report` against the target environment therefore needs `ALLOW_PROD=1`; it performs no writes.

**Step 2 — Backfill (dry-run, then apply).**

```bash
# dry run — no flags
pnpm --filter erify_api exec tsx scripts/backfill-scene-qc-evidence-refs.ts
# real
ALLOW_PROD=1 pnpm --filter erify_api exec tsx scripts/backfill-scene-qc-evidence-refs.ts --apply
```

Two passes per mapped template: (1) a durability pass that writes `evidence_purpose: 'scene_qc'` into `currentSchema` through the real `TaskTemplateService.updateTemplateWithSnapshot` path — bumping template `version` and creating a new snapshot, so a later builder edit's delete-then-recreate sync cannot silently erase the binding; (2) a historical pass that `createMany({ skipDuplicates: true })`s ref rows for every *other* snapshot referenced by a live Task, never rewriting snapshot JSON.

**This is a mutating production write.** It bumps real Task Template versions. Idempotent on replay (`already_marked` short-circuit + the `@@unique([snapshotId, fieldKey])` constraint), and Child PR 2's integration spec proves the replay idempotency.

Pass contract: exit code `0`. `main()` sets `exitCode = 1` via `hasUnresolvedOrFailedBindings()` whenever `templatesFailed > 0`, any `unresolvedFieldKeys` exist (a mapped field key absent from `currentSchema` — the current-snapshot pass then **aborts for that template rather than half-applying**), or any `unresolvedMapEntries` exist (a mapped template UID that no longer resolves).

**Step 3 — Verification gate (read-only, CI-shaped).**

```bash
ALLOW_PROD=1 pnpm --filter erify_api exec tsx scripts/verify-scene-qc-evidence-bindings.ts --since YYYY-MM-DD
# machine-readable
… --since YYYY-MM-DD --json
```

Scope: a `TaskTemplateSnapshot` is in scope when a non-deleted `Task` points at it, that Task has a non-deleted `SHOW` target, the Show is non-deleted, its `ShowStatus.systemKey` passes `isSceneQcEligibleShowStatus` (reusing Child PR 1's policy — never re-derived), and `show.start_time >= --since`.

Pass contract: **`violations.length === 0`, exit `0`.** Prints `In-scope snapshots` / `Bound` / `Intentionally unbound` / `Violations`, and one `VIOLATION <templateUid> snapshot <id> (v<n>)` line per unbound in-scope snapshot. This script performs no writes and has no `ALLOW_PROD` guard of its own — the flag above is only needed if it shares an env file with the backfill.

`--since` choice: use the earliest operational date the team intends to review in Scene QC. A `--since` far in the past inflates the in-scope set with historical snapshots nobody will ever review; a `--since` of today proves nothing. Recommend the current operational date minus 7 days, and record the exact value used in the PR description.

### 3.3 Pass/fail contract for the PR

| Gate | Contract | Blocking? |
| --- | --- | --- |
| `scene-qc-evidence-binding-map.ts` is non-empty and every entry carries a real `note` / `reason` | Committed on this branch, human-authored | **Yes** (OQ-45) |
| `backfill … --report` output attached to the PR | Screenshot or fenced log block | Yes |
| `backfill …` dry-run exits `0` | No unresolved/failed bindings | Yes |
| `backfill … --apply` against the target environment exits `0` | Summary counts recorded in the PR | **Yes** — plan §13 step 2 |
| `verify … --since <date>` exits `0` with `violations: 0` | JSON output pasted into the PR | **Yes** — plan §13 step 3, §9 item 9 |

### 3.4 The ordering problem plan §13 step 5 no longer describes

Plan §13 step 5 says "enable the replaced route only after all checks pass". **The route is already enabled** — Child PR 3's OQ-8 repointed it, and it has been live on the integration branch since #348. There is no feature flag and no second URL. The only remaining lever is *when this PR merges to `master`*. Restated for this repo: **the backfill and verification must both pass against the target environment before PR #343 merges**, because merging is the enable action. Recorded as **OQ-47**.

---

## 4. Combined End-to-End and Authorization Coverage

### 4.1 What the repo actually has (checked before recommending anything)

- `architecture:signals` reports `e2e_specs: 0`. `find apps/erify_api -name "*.e2e-spec.ts"` returns nothing. `supertest` and `@types/supertest` are declared devDependencies but are **imported nowhere**; `test/jest-e2e.json` exists with `testRegex: ".e2e-spec.ts$"` and matches no file. `pnpm --filter erify_api test:e2e` is a no-op today.
- The real cross-layer harness is [`test/integration/`](../../test/integration/) — nine specs run by `pnpm -C apps/erify_api test:integration` against an ephemeral Dockerized Postgres, composing **real Nest modules** with `ClsPluginTransactional` + `PrismaService` and a `FakeStorageService`. Four of the nine are already Scene QC's.
- Authorization is proven per-controller by `Reflect.getMetadata(STUDIO_ROLES_KEY, Controller)` assertions — the pattern in all five Scene QC controller specs and in nine other studio controller specs.

**Recommendation: do not introduce an HTTP e2e framework.** Standing up supertest + a booted app + JWT/JWKS fixtures for one feature would be the largest new surface in a PR whose entire premise is deletion, and it would be the repo's first such harness with no comparable feature to model it on. Decision **OQ-48**.

### 4.2 What the four child PRs already prove individually

| Already proven | Where |
| --- | --- |
| Scene Profile persistence, partial unique index, retire→recreate, audit-target CHECK, version-checked replace | `scene-profile-persistence.integration-spec.ts` |
| Evidence-ref sync scoping and backfill replay idempotency | `task-template-scene-qc-evidence-ref-persistence.integration-spec.ts` |
| Review save transaction, pinned evidence, snapshot, rollback | `scene-qc-review-persistence.integration-spec.ts` |
| Confirmation concurrency/lock, revision append, staleness across all six change kinds, report immutability, CSV reconciliation | `scene-qc-confirmation-persistence.integration-spec.ts` |
| Per-controller allowed role set (`[DESIGNER, MANAGER, ADMIN]`) and route path | five `*.controller.spec.ts` files under `capabilities/scene-qc/http/` |

### 4.3 The three genuine gaps, and the smallest tests that close them

**Gap 1 — no single run traverses the whole capability.** Every integration spec builds its own narrow fixture and exercises one workflow. Nothing proves that a profile saved through `SceneProfileService`, evidence bound through the Task Template path, a review saved through `SceneQcWorkflowService`, and a confirmation appended through `SceneQcConfirmationWorkflowService` compose into a report and CSV that agree — the four services are only ever tested against fixtures each spec builds for itself.

> **New:** `apps/erify_api/test/integration/scene-qc-journey.integration-spec.ts`
> One `it()`, one operational day, one actor, executed in order against real Postgres, following `scene-qc-confirmation-persistence`'s harness (real `ClsPluginTransactional`, `FakeStorageService`, `integration-scene-qc-journey:` name prefix, per-run unique suffixes):
>
> 1. save a Client Scene Profile through `SceneProfileService` (real R2-shaped object key via the fake storage);
> 2. publish a Task Template snapshot carrying `evidence_purpose: 'scene_qc'` through the **real** `TaskTemplateService.updateTemplateWithSnapshot` — the same path §3.2's backfill uses, which nothing currently exercises inside a journey;
> 3. create two eligible Shows in the day, one with two evidence images from two different Tasks, one with one;
> 4. assert `getDailySummary` reports `eligible=2, reviewed=0, blocked=0, confirmation=UNCONFIRMED`;
> 5. save one `PASS` and one `MINOR` (with feedback) through `SceneQcWorkflowService`; assert the multi-image Show is **one** queue row with **one** outcome and two pinned evidence rows;
> 6. `confirmDay`; assert revision 1, both reviews stamped `confirmedAt`, summary flips to `CURRENT`;
> 7. read the report and the CSV; assert `scope.total_shows === 2`, `pass=1 minor=1 fail=0`, CSV row count equals item count, and the `MINOR` row appears in `exceptions` with its feedback;
> 8. read Records for the date range; assert both reviews appear with `confirmation_status: CONFIRMED` and the correct `confirmation_revision`.
>
> This is the only place the *whole* Definition-of-Done sentence "every model read by Daily Review, Records, or reports has a working authorized write path" (plan §15) is executed end to end.

**Gap 2 — no single assertion covers the whole route surface's role set.** Five separate specs each assert their own controller. Nothing fails if a sixth Scene QC controller is added later without the guard, and nothing states the *negative*: that `MODERATION_MANAGER` — the one role the PRD explicitly excludes — is absent everywhere.

> **New:** `apps/erify_api/src/capabilities/scene-qc/scene-qc-authorization.spec.ts`
> A table-driven spec over **all five** Scene QC controllers (`StudioSceneProfileController`, `StudioSceneQcQueryController`, `StudioSceneQcReviewController`, `StudioSceneQcRecordsController`, `StudioSceneQcConfirmationController`):
>
> - each class's `STUDIO_ROLES_KEY` metadata `toEqual([DESIGNER, MANAGER, ADMIN])` — exact array, not `toContain`;
> - no method-level `@StudioProtected` override exists on any handler (`getAllAndOverride` means a method-level decorator silently wins — assert none is present, so a future narrower/wider override is a visible diff);
> - the excluded set `[MODERATION_MANAGER, TALENT_MANAGER, MEMBER, ACCOUNT_MANAGER]` appears in **no** Scene QC controller's role list;
> - the five `@Controller` paths are exactly the plan §6 set.
>
> Cheap, fast, no fixtures, and it is the "one pass rather than per-endpoint" coverage plan §10 asks for. Pair it with the existing frontend assertion in `lib/constants/__tests__/studio-route-access.test.ts` so the FE route key and the BE guard set are both pinned.

**Gap 3 — nothing proves the deleted surface is gone at runtime.** A stale module registration or a missed `controllers:` entry would still compile.

> **Extend:** [`test/integration/app-runtime.integration-spec.ts`](../../test/integration/app-runtime.integration-spec.ts)
> After `app.init()`, assert the five Scene QC controllers resolve, and that the app's route table contains **no** route matching `studios/:studioId/scene-review` on the API (the FE route is unaffected; the deleted backend contract was `GET /studios/:studioId/scene-review` and `/:taskId`). Enumerate routes via the Nest `HttpAdapterHost` router stack rather than importing the deleted class — importing it would not compile, which is a weaker and less legible proof.

### 4.4 What this deliberately does not add

No new frontend e2e. Child PR 3 and 4 shipped component/hook tests for every §12.3 scenario; §7.3 lists the residual ones, all of which are unit-level. Playwright is used only for §12.4 rendered evidence (§7.4), as in every prior child PR.

---

## 5. Documentation and Skill Reconciliation

The doctrine change plan §11 introduces, stated once so every edit below can point at it:

> Operational review **summaries** stay read-only. A review capability may write **only its own normalized decisions and confirmations**, never the source Task, Show, actuals, or lifecycle. Durable Scene QC confirmations use a **server-authoritative** shared operational-timezone constant; existing read-only surfaces keep their frontend-owned bounds contract until separately migrated.

Follow Child PR 2's precedent for `file-upload-presign/SKILL.md`: **a targeted section rewrite, not a wholesale rewrite.** Each edit below names the exact passage.

### 5.1 `.agents/skills/operations-review-surface/SKILL.md` — three targeted edits

**(a) Line 28, "When to use / not use".** Currently: "These surfaces are **read-only over extracted facts**; never write actuals from a review screen". Add a bounded carve-out after that sentence:

> One narrow exception exists: a review capability may persist **its own** normalized decisions — Scene QC writes `SceneQcReview`, `SceneQcDailyConfirmation`, and their pinned children, and nothing else. It still never writes `Task`, `Show`, `ShowCreator`, `ShowPlatform`, actuals, or any lifecycle state. If a new surface needs to write outside its own tables, it is not a review surface.

**(b) The heading at line 57, "Operational-day window is FE-owned (06:00 → 05:59)".** The heading is now false as an unqualified rule. Retitle to **"Operational-day window ownership"** and prepend one paragraph before the existing bullets:

> Ownership depends on whether the surface **persists** the window. Read-only surfaces (`/task-review`, `/show-run-review`, `/costs`, `/performance`) keep the frontend-owned contract described below: the FE computes local `06:00 → next-day 05:59` bounds and sends absolute ISO-8601 strings; the endpoint is timezone-agnostic and validates explicit bounds. A surface that **persists** an operational-day-scoped decision must not accept client bounds at all: it takes a date-only `operational_date` and resolves the window server-side from a shared IANA-aware constant, returning `window_start` / `window_end` / `timezone` as provenance. Scene QC is the reference — see [`scene-qc-operational-window.util.ts`](../../../apps/erify_api/src/capabilities/scene-qc/scene-qc-operational-window.util.ts) and `SCENE_QC_OPERATIONAL_TIMEZONE` in `@eridu/api-types/scene-qc`. Do not migrate the read-only surfaces to this contract as a side effect; that is separate work.

Leave the existing bullets, the `.slice` anti-pattern subsection, and the date-only-column exception untouched — all still correct.

**(c) Line 127, the paragraph inside "Read-only invariant".** This is the only passage that describes the *deleted* implementation. Replace the whole paragraph:

> Task Review exposes pre-confirmation task reads and actions only to `ADMIN`/`MANAGER`. Designer scene inspection belongs on the dedicated `/scene-review` route, whose Scene QC read models and commands admit `DESIGNER`, `ADMIN`, and `MANAGER`. Scene QC is **not** read-only: it persists its own Show-level `PASS`/`MINOR`/`FAIL` outcomes, pinned evidence, and append-only daily confirmations. It still performs no task selection, due-date edit, status action, or bulk approval, and writes no Task or Show state — those remain absent from the UI and guarded to `ADMIN`/`MANAGER` in the task API. Evidence review stays screenshot-first and responsive.

**Checklist edits (lines 129–148).** Line 147 (`No write to any actuals column from the review surface`) stays. Rewrite line 148 from `Read-only review roles use the dedicated Scene Review evidence/detail endpoints without Task Review or mutation access` to:

> - [ ] A review capability writes only its own normalized decision tables — never Task, Show, actuals, or lifecycle state
> - [ ] A surface that persists an operational-day-scoped decision resolves the window server-side from a date-only `operational_date`; only read-only surfaces send FE-computed bounds

Add `scene-qc-operational-window.util.ts` to the "Canonical files" list (line 18 area) beside the existing `operational-day-range.ts` entry, labelled as the server-authoritative counterpart.

### 5.2 `.agents/skills/erify-authorization/SKILL.md` — two targeted edits

**(a) Line 36, the `DESIGNER` row of the Studio Role Model table.** `Dashboard, own tasks, own shifts, read-only Scene Review evidence` → `Dashboard, own tasks, own shifts, full Scene QC (review, confirm, Scene Profile) — no Task Review or task mutation`.

**(b) Line 57, the paragraph under "Endpoint Role Conventions".** Replace:

> Keep review purposes separately guarded. Task Review list/detail/statistics and every task mutation remain `ADMIN`/`MANAGER` only. Every Scene QC endpoint — daily summary/items/detail, review create/update, daily confirmation, records, manager report, and Scene Profile `GET`/`PUT`/`DELETE` — admits exactly `DESIGNER`, `ADMIN`, and `MANAGER`, with no method-level narrowing. Designating a Task Template image field as Scene QC evidence is deliberately **not** on that list: it rides the existing Task Template write permissions (`[ADMIN, MANAGER]`), so Scene QC access never widens template administration. Frontend route access and sidebar visibility must use `STUDIO_ROUTE_ACCESS.reviewQueue` for Task Review and `STUDIO_ROUTE_ACCESS.sceneReview` for Scene QC.

The `ACCOUNT_MANAGER` subsection, `getAllAndOverride` note, and everything below are untouched.

### 5.3 `apps/erify_studios/docs/SCENE_REVIEW.md` — replaced, not edited

This document describes the deleted implementation top to bottom: two modes, the fallback-evidence read model, GMV/viewer/CTR/CTO context, and a "Canonical implementation" block (lines 47–56) whose six of seven paths this PR deletes. Editing it in place would be a rewrite of every section.

Per [`knowledge-sync.md`](../../../../.agents/workflows/knowledge-sync.md) §2, delete it and create **`apps/erify_studios/docs/SCENE_QC.md`** as the frontend canonical reference. Required sections, all describing shipped behavior with source references and no design rationale:

1. **Access and routes** — `/scene-review` (label retained), `/scene-review/profiles`; `STUDIO_ROUTE_ACCESS.sceneReview` = `[DESIGNER, MANAGER, ADMIN]`; the route key/guard/sidebar share one policy source.
2. **Tabs and URL state** — `tab=daily` / `tab=records`, the composed `sceneQcSearchSchema`, the tab-switch reset rule (page → 1, other tab's exclusive selection cleared, `client_id`/`platform_id` survive).
3. **Daily Review** — queue + comparison workspace + adjacent result form, no-evidence blocker, missing-profile warning, unusable-image Fail shortcut, Save & next, optimistic-conflict handling, mobile Live/Expected drawer.
4. **Confirmation states** — the four `SceneQcConfirmationCard` renderings.
5. **Records and manager report** — server pagination, lazy detail Sheet/Drawer, report sections, server-side CSV.
6. **Scene Profile manager** — client selector, single reference image, scene type, retire.
7. **Operational day** — server-resolved from `operational_date`; the browser clock supplies only the first-load default, which is [accepted tech debt](../../../../docs/tech-debt/scene-qc-default-operational-date-browser-clock.md).
8. **Canonical implementation** — the real paths: `routes/studios/$studioId/scene-review{,.tsx,/index.tsx,/profiles.tsx}`, `features/scene-qc/components/scene-qc-workspace.tsx`, `features/scene-qc/config/scene-qc-search-schema.ts`, `features/scene-qc/api/`, `packages/api-types/src/scene-qc/`, `apps/erify_api/src/capabilities/scene-qc/`.

`SCENE_REVIEW.md` line 5 ("Until that capability ships, this document remains the source of truth") is the doc's own retirement instruction — this is that moment.

### 5.4 `apps/erify_studios/docs/README.md`

Line 29: `17. [Scene Review](./SCENE_REVIEW.md) — screenshot-first Designer/Manager/Admin review with Analysis and advisory QC Inbox modes` → `17. [Scene QC](./SCENE_QC.md) — persisted Show-level daily scene review, confirmation, records, and manager report for Designer/Manager/Admin`.

### 5.5 `apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md` — two lines

- **Line 25**, High-Level Principles: `DESIGNER adds read-only submitted-task QC review to member-level access` → `DESIGNER adds the Scene QC workspace — persisted scene outcomes, daily confirmation, and Client Scene Profiles — to member-level access, without Task Review or any task mutation`.
- **Line 36**, Route Access Matrix: `| /studios/:studioId/scene-review | View | View | No access | View | No access | No access |` → change the ADMIN, MANAGER, and DESIGNER cells from `View` to `View/Review` (matching the `/task-review` row's existing `View/Review` convention on line 35). The three `No access` cells are unchanged.
- **Line 54**, Sidebar Sections: `DESIGNER sees Scene Review only` → `DESIGNER sees Scene QC only` (the entry's label stays "Scene Review" per §2.3; this sentence names the capability, not the label — add a parenthetical `(labelled "Scene Review")` if the reviewer prefers literalness).

### 5.6 `apps/erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md` — three passages

- **Line 40**, route table row 3.15: `| 3.15 | Scene Review | /studios/$studioId/scene-review | Admin/Manager/Designer | ✅ |` → keep the row, change the name cell to `Scene QC` and add a second row `| 3.16 | Scene Profiles | /studios/$studioId/scene-review/profiles | Admin/Manager/Designer | ✅ |`.
- **Lines 91–92**, §10.1: replace the whole paragraph. Proposed:

  > ### 10.1 Scene QC (Admin/Manager/Designer)
  >
  > Scene QC → pick an operational day → review each eligible Show's explicit image evidence against the Client's Scene Profile reference → record `PASS`, `MINOR`, or `FAIL` with feedback required for Minor and Fail → confirm the completed day → open the manager report or download its CSV. A Records tab queries confirmed history by date range, Client, platform, and result. Client uses the shared asynchronous combobox; platform and result are secondary filters. Desktop pairs the Show queue with a side-by-side evidence/reference workspace; mobile uses a Live/Expected drawer with the result form immediately below. Scene QC persists only its own outcomes and confirmations — it never changes Task, Manager Review, or Show state. See [Scene QC](./SCENE_QC.md).

- **Lines 107 and 109**: `Scene Review` → `Scene QC` in the sidebar-nav and role-based-access bullets; on line 109 replace `Designer sees only the read-only Scene Review entry` with `Designer sees only the Scene QC entry, which writes scene outcomes but no task or show state`.

### 5.7 `docs/features/rbac-roles.md` — three lines

- **Line 26**, role access matrix: `| Scene Review (read-only)     | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |` → `| Scene QC (review + confirm)  | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |`. Column values are unchanged — the role set did not move.
- **Line 41**, Key Product Decisions: `DESIGNER otherwise retains member-level access, with one narrow exception: the dedicated read-only Scene Review workspace.` → `DESIGNER otherwise retains member-level access, with one narrow exception: the dedicated Scene QC workspace, where it has the same permissions as MANAGER and ADMIN (review, daily confirmation, Client Scene Profiles). Scene QC persists only its own outcomes; DESIGNER still gains no Task Review or task-mutation access.`
- **Line 50**, Acceptance Record: `[x] DESIGNER can inspect Scene Review evidence without receiving Task Review or task mutation access` → `[x] DESIGNER can record and confirm Scene QC outcomes without receiving Task Review or task mutation access`.

This file is a **shipped Phase 4 feature doc**; do not restate Scene QC's own acceptance record here. That belongs in the new `docs/features/scene-qc.md` (§6.2).

### 5.8 `docs/workflows/task-and-operations-review.md` — four passages

- **Line 14**, Actors table: `Reviews submitted screenshots and layout QC evidence without approving or modifying tasks.` → `Reviews each show's scene setup, records a persisted Pass/Minor/Fail outcome, and confirms the operational day — without approving or modifying tasks.`
- **Line 27**, flow overview step 4: `4. Designer optionally inspects screenshot evidence in Scene Review (/scene-review)` → `4. Designer/Manager reviews each show's scene setup and records an outcome in Scene QC (/scene-review), then confirms the day`.
- **Lines 56–61**, §3: replace the section body. Proposed:

  > ### 3. Scene QC (`/scene-review`)
  >
  > `DESIGNER`, `MANAGER`, and `ADMIN` review each eligible Show's scene setup for one operational day (local 06:00–05:59, **resolved server-side** from a date-only `operational_date` — the browser timezone never defines the durable scope):
  >
  > - **Evidence is explicit**: only Task Template image fields designated `evidence_purpose: 'scene_qc'` feed the review. A Show with no such evidence is blocked and cannot receive an outcome.
  > - **Persisted outcome**: `PASS`, `MINOR`, or `FAIL`, with feedback required for Minor and Fail, compared against a snapshot of the Client's Scene Profile reference taken at save time.
  > - **Daily confirmation**: once every eligible Show has an outcome, an authorized operator confirms the day. Confirmation is append-only; a later scope change marks the day stale and requires a new revision. A confirmed day unlocks the manager report (in-app + CSV).
  > - **Boundary**: Scene QC writes only its own reviews, confirmations, and Scene Profiles. It performs no task selection, due-date edit, approval, rejection, block, close, or bulk approval, and changes no Task, Manager Review, or Show lifecycle state. Designating a template field as evidence uses existing Task Template permissions, not Scene QC access.
  > - **Filters**: operational date is primary. Client uses the shared asynchronous combobox; platform and review state are secondary.

- **Related Docs table (lines 150–156)**: add a row for `docs/features/scene-qc.md` (created in §6.2).

The Mermaid sequence diagram (lines 101–144) does not depict Scene Review and needs no change. Leaving it is correct: Scene QC is a parallel advisory branch, not a step in the extraction sequence.

### 5.9 Task Template evidence-designation update (plan §11 last line) — already done

Plan §11 closes with "When Task Template evidence designation ships, update the Task Template feature documentation and relevant skill in the same PR." **Child PR 2 already did both:**

- [`.agents/skills/task-template-builder/SKILL.md`](../../../../.agents/skills/task-template-builder/SKILL.md) §9 "Explicit Evidence Designation (`evidence_purpose`) — Scene QC (Child PR 2)" (lines 63–71) plus checklist line 98.
- [`docs/features/task-templates.md`](../../../../docs/features/task-templates.md) §"Explicit Evidence Designation (`evidence_purpose`)" (lines 221–238), the Documentation Sync table row (line 302), and the acceptance-record line 317.

**Two residual edits remain**, both caused by this PR retiring the design docs (§6.3), not by missing content:

| File | Edit |
| --- | --- |
| `docs/features/task-templates.md` line 238 | `See [SCENE_QC_IMPLEMENTATION_PLAN.md](…) section 5.2 for the full Scene QC evidence-binding design` → point at `docs/features/scene-qc.md` (§6.2). |
| `docs/features/task-templates.md` line 302 | Documentation Sync table row `Scene QC design reference` → retarget to `docs/features/scene-qc.md` and retitle to `Scene QC evidence binding`. |
| `.agents/skills/task-template-builder/SKILL.md` §9 heading | `— Scene QC (Child PR 2)` → `— Scene QC`. A shipped skill should not carry a child-PR label from a retired program. |

No other change to either artifact. This is the "already satisfied, but the link target moves" case, recorded as **OQ-49**.

### 5.10 Files plan §11 omits but that this PR must also touch

| File | Why | Edit |
| --- | --- | --- |
| [`apps/erify_api/docs/design/README.md`](./README.md) line 14 | Design index row for the plan this PR retires | Delete row 8; renumber. |
| [`apps/erify_studios/docs/design/README.md`](../../../erify_studios/docs/design/README.md) line 12 | Same, cross-app index | Delete row 6; renumber. |
| [`docs/prd/README.md`](../../../../docs/prd/README.md) line 57 | PRD index row; also carries stale status text ("roadmap assignment pending" — it was assigned to Phase 5 item 23 in `d98495a3`) and stale scope ("reusable expected-scene materials" — deferred to Stage 2) | Delete the row when the PRD retires (§6.2). |
| [`docs/features/README.md`](../../../../docs/features/README.md) | Feature index | Add a `Scene Quality Control` row pointing at the new `docs/features/scene-qc.md`, with canonical refs to `apps/erify_studios/docs/SCENE_QC.md` and `apps/erify_api/docs/SCENE_QC.md`. |
| [`.agents/skills/INDEX.md`](../../../../.agents/skills/INDEX.md) | Generated from skill frontmatter | Regenerate with `pnpm agents:index` if either edited skill's `description:` changes. Neither §5.1 nor §5.2 changes a description, so it should be a no-op — but `pnpm agents:validate` fails on a stale index, so run it. |

---

## 6. Knowledge-Sync and Doc-Lifecycle Bookkeeping

Per [integration PR delivery](../../../../.agents/workflows/integration-pr-delivery.md) invariant 5 and step 7, **this PR owns all of it** — no child PR retired a shared artifact.

### 6.1 Roadmap (`docs/roadmap/PHASE_5.md`)

| Location | Current | Required |
| --- | --- | --- |
| Workstream table, line 47 | `| 23 | [Scene QC replacement]… | 22 | 🚧 In progress |` | `✅ Done` |
| §23 body, line 356 | `**Status**: 🚧 In progress — Child PR 1 underway.` | `**Status**: ✅ Done — delivered by #346, #347, #348, #350, and the #343 integration merge.` |
| §23 body, line 333 | `**Source**: … [implementation plan](…SCENE_QC_IMPLEMENTATION_PLAN.md)` | Retarget to `docs/features/scene-qc.md`; the plan path dies in §6.3. |
| §23 body, line 339 | Child PR 1 described as delivering "canonical `Studio.timezone`" | **Drift** — the shipped design uses a shared `SCENE_QC_OPERATIONAL_TIMEZONE` constant and explicitly defers a `Studio.timezone` column ([studio-config-settings](../../../../docs/ideation/studio-config-settings.md) §6). Correct the sentence. |
| §23 body, line 340 | Child PR 2 described as "Profiles, **Materials**, and Explicit Evidence Feeder" with "Scene Profile/**Material** APIs" | **Drift** — reusable Materials were deferred to Stage 2 in `5c59158d`. Remove "Materials". |
| §23 body, line 358 | `**Acceptance record**: see Stage 1 Acceptance Criteria in the PRD` | Retarget to the acceptance record in `docs/features/scene-qc.md`. |

**Item 22 (`### 22. Scene Review workspace`, lines 307–329) is left intact**, per plan §11: it is the historical record of what PR #319 shipped, and its `✅ Done` row on line 46 is true of that delivery. Add exactly one forward-linking line at the end of §22, before §23's heading:

> **Superseded by** [item 23](#23-scene-qc-replacement). The read-only workspace described above was replaced by the persisted Scene QC capability; see [Scene QC](../features/scene-qc.md) for current behavior. This section is retained as the record of what item 22 shipped and is not rewritten.

Do **not** flip item 22's acceptance checkboxes or rewrite its scope-boundary paragraph. Plan §11 is explicit.

### 6.2 The PRD — promote Stage 1, forward Stage 2/3, delete

`docs/prd/scene-qc.md` (360 lines) is a mixed artifact: Stage 1 is now shipped, Stage 2 and Stage 3 are uncommitted. [`doc-lifecycle`](../../../../.agents/skills/doc-lifecycle/SKILL.md)'s Simple Artifact Model resolves this: a PRD holds only committed work, uncommitted scope belongs in `docs/ideation/`, and the default path ends "→ current truth → retire the PRD".

| Content | Destination |
| --- | --- |
| Summary, Problem, Goals, Terminology, Users and Authorization, Product Rules, Scene Profile, Evidence Requirements, UX Requirements, Lifecycle and Audit §Stage 1, Stage 1 Acceptance Criteria (checkboxes → `[x]`) | **New `docs/features/scene-qc.md`**, in the shape of [`docs/features/rbac-roles.md`](../../../../docs/features/rbac-roles.md): `> **Status**: ✅ Shipped — Phase 5 item 23`, Problem, Users, rules, **Key Product Decisions** (lift plan §2's locked-decision table — it is the durable rationale and is the one thing that would be genuinely lost when the plan is deleted), **Acceptance Record**, canonical references. |
| "Delivery Stages → Stage 2 — Governance and Advanced Profile Operations", "Lifecycle and Audit → Stage 2" | Fold into the existing [`docs/ideation/material-management.md`](../../../../docs/ideation/material-management.md), which plan §14 already names as the forwarding address for reusable Materials, composition, and applicability. Add the amendment-workflow bullets there or in a short new ideation doc if they do not fit that document's scope. |
| "Taxonomy and Structured Findings", "Delivery Stages → Stage 3" | Fold into [`docs/ideation/studio-config-settings.md`](../../../../docs/ideation/studio-config-settings.md), already named by plan §14 for taxonomy governance. |
| Everything else (Non-Goals, planning framing) | Dropped. Git history is the archive (doc-lifecycle step 6). |

Then delete `docs/prd/scene-qc.md` and its `docs/prd/README.md` row (§5.10).

An `apps/erify_api/docs/SCENE_QC.md` is also required — **the API contract has no other home once the plan is deleted.** Plan §6 (routes, request/response shapes, report + CSV column list), §5 (persisted model), and §8 (transaction semantics) are documented nowhere else, and `apps/erify_api/docs/` has an established pattern of exactly this doc (`STUDIO_SHOW_MANAGEMENT.md`, `SCHEDULE_CONTINUITY.md`, `COMPENSATION_LINE_ITEMS.md`). Keep it short: the 12 endpoints with their guard set and pagination envelope, the five tables and their key invariants (one review head per `(showId, operationalDate)`; append-only confirmations under the advisory lock; snapshot-not-reference for the expected image; the partial unique index on `scene_profiles`), the evidence-resolution contract, the two cutover scripts, and source references. Add it to `apps/erify_api/docs/README.md`.

### 6.3 Design-doc retirement — five files, and the 25 code comments that cite them

`knowledge-sync.md` §2 is unambiguous: "When an app/package design doc is implemented: delete it from the design folder, create or update the canonical root doc, update the local `docs/README.md`, and replace all references to the old design path. Do not keep stubs in `docs/design/`."

Delete:

- `apps/erify_api/docs/design/SCENE_QC_IMPLEMENTATION_PLAN.md`
- `apps/erify_api/docs/design/SCENE_QC_CHILD_PR_3_BREAKDOWN.md`
- `apps/erify_api/docs/design/SCENE_QC_CHILD_PR_4_BREAKDOWN.md`
- **this file** (`SCENE_QC_MAIN_PR_BREAKDOWN.md`) — a breakdown is a transient planning artifact and must not outlive its PR
- (Child PR 1 and 2 produced no committed breakdown file in this directory.)

**The cost this creates.** Twenty-five source-code doc comments cite these documents as their rationale anchor, e.g. `scene-qc-confirmation.repository.ts:51` → "SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 1.6.1/1.7", `scene-qc-evidence.resolver.ts:126` → "see SCENE_QC_CHILD_PR_3_BREAKDOWN.md OQ-1". Full inventory:

```bash
grep -rn "SCENE_QC_IMPLEMENTATION_PLAN\|SCENE_QC_CHILD_PR\|SCENE_QC_MAIN_PR" apps packages \
  --include="*.ts" --include="*.tsx" --include="*.md" | grep -v /dist/
```

Distribution: 12 in `apps/erify_api/src/capabilities/scene-qc/`, 7 in `apps/erify_studios/src/features/scene-qc/`, 5 in `packages/api-types/src/scene-qc/`, 1 in `packages/api-types/src/task-management/template-definition.schema.ts`.

Retarget every one to `apps/erify_api/docs/SCENE_QC.md` or `docs/features/scene-qc.md` with a **section name rather than a section number** (numbers will not survive the rewrite). Where a comment cites a specific OQ decision whose reasoning is worth keeping — `scene-qc-evidence.resolver.ts:126` (OQ-1's exclude-non-derivable-object-key rule) and `scene-qc-confirmation-state.policy.ts` (OQ-22/OQ-23's coupling of `version`-not-bumped to `CURRENT` resolution) — **inline the one-sentence reason into the comment** instead of pointing anywhere. Those two are load-bearing invariants that a future editor could silently break. Recorded as **OQ-46**.

### 6.4 Memory

| Artifact | Action |
| --- | --- |
| `.agents/memory/` | No entry needed. This PR performs a deletion and a doc reconciliation; neither is the "major component refactoring, file relocation, or architectural cutover" that `AGENTS.md` requires a memory file for. The one durable pattern — capability-first placement with private persistence — is already in [`.agents/memory/erify-api-capability-refactoring.md`](../../../../.agents/memory/erify-api-capability-refactoring.md). |
| `.claude/agent-memory/pr-quality-gate/scene-qc-child-pr-patterns.md` | Tool-specific review memory, 17.6 KB, references the design docs at lines 13, 62, 199, 207. Add a short closing note that the program merged and the plan/breakdowns were retired, and retarget those four references. Do **not** delete the file — its recurring-review-finding content stays useful. |
| `.claude/memory/MEMORY.md` (user auto-memory) | Out of scope for a repo PR. |

### 6.5 Tech-debt register

No new entry is created by this PR (see §10.3 for why each candidate is rejected). Re-check the five existing `docs/tech-debt/scene-qc-*.md` files for a **changed trigger**, not a fix:

- `scene-qc-daily-read-models-duplicate-evidence-resolution.md` and `scene-qc-report-status-recomputes-eligible-set.md` — triggers are load-based; the deletion does not move them. Confirm in the PR that they were checked.
- `scene-qc-confirmation-items-cascade-with-show-delete.md` — trigger is "a hard-delete path for Show or Client is introduced". Deleting `scene-review.mapper.ts` removes no delete path. Unchanged.
- `scene-qc-profile-save-r2-probe-inside-transaction.md` — unchanged.
- `scene-qc-default-operational-date-browser-clock.md` — its "Origin" line says PR #339 and it references `lib/operational-day-range.ts`. Confirm the reference is still accurate after this PR (it is — that file is untouched) and that the `Status: Accepted` line still reflects reality.

---

## 7. Verification Plan

### 7.1 Plan §12.1 required commands

```bash
pnpm --filter @eridu/api-types lint && pnpm --filter @eridu/api-types typecheck \
  && pnpm --filter @eridu/api-types test && pnpm --filter @eridu/api-types build
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck \
  && pnpm --filter erify_api test && pnpm --filter erify_api build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck \
  && pnpm --filter erify_studios test && pnpm --filter erify_studios build

pnpm -C apps/erify_api test:integration    # guarded real-DB gate -- record the result
pnpm agents:validate
pnpm agents:index                          # only if a skill description changed; validate:check fails on a stale INDEX.md
pnpm architecture:signals
pnpm lint:markdown
pnpm sherif                                # no dependency change expected -- run to confirm
```

Order matters: `@eridu/api-types` must **build** before `erify_api`/`erify_studios` typecheck, because deleting `scene-review.schema.ts` changes the package's emitted `dist/` surface. A stale `dist/` will let a dangling import typecheck green.

**No Prisma work.** Plan §12.1's "Also run Prisma format, validate, generate, and the official migration command" does not apply: this PR adds no model and generates no migration. Run `pnpm --filter erify_api db:validate` + `db:generate` once as a no-op sanity check and say so in the PR, rather than skipping silently.

### 7.2 `architecture:signals` — the expected delta (this PR's is the only negative one)

Measured baseline on the integration branch at `3211b73f`:

| Signal | Now | After deletion | Δ |
| --- | --- | --- | --- |
| `typescript_files` | 597 | 589 | **−8** |
| `production_services` | 75 | 74 | **−1** (`SceneReviewService`) |
| `controllers` | 59 | 58 | **−1** (`StudioSceneReviewController`) |
| `specs` | 187 | 183 (+1 for §4.3's new spec → **184**) | **−4 raw, −3 net** |
| `repositories` | 31 | 31 | 0 — `TaskRepository` survives, minus two methods |
| `nest_modules` | 85 | 85 | 0 — no module is deleted |
| `static_local_module_edges` | 261 | 261 | 0 — `StudioTaskModule → TaskModule` survives for `StudioTaskController` |
| `exported_repositories` | 5 | 5 | 0 |
| `static_module_cycles` | 0 | 0 | 0 — must stay 0 (blocking) |
| `e2e_specs` | 0 | 0 | 0 — §4.1's decision, stated explicitly |

Record the before/after JSON in the PR description. The historical [`architecture-signals-baseline.json`](../architecture-signals-baseline.json) is a fixed `f677b627` snapshot for the capability-refactoring program and is **not** updated by this PR; compare against the PR base as `pr-review.md` instructs.

Refactoring-target preflight to record: **RT-01** (active — no new placement; a table-first slice is *removed* from `models/task`, which moves toward the target), **RT-06** (touch-gated — `TaskRepository` shrinks by two methods and `models/task` loses a service; no consolidation attempted, no new module), **RT-07** (active — the §4.3 tests are the "smallest real-database or Nest application test that proves the moved invariant"). RT-05 is untouched: no repository export changes.

### 7.3 Residual §12.2 / §12.3 scenarios

Every §12.2 backend scenario is already owned by a child PR's shipped spec except the three below, which are cross-capability by construction and therefore land here:

| §12.2 scenario | Already covered? | This PR |
| --- | --- | --- |
| "each allowed role can read, review, manage the Stage 1 Scene Profile, and confirm; excluded roles receive authorization failure" | Partially — five per-controller metadata specs. No single assertion covers the surface, and `MODERATION_MANAGER`'s exclusion is asserted nowhere as a negative. | `scene-qc-authorization.spec.ts` (§4.3 Gap 2) |
| "every model read by Daily Review, Records, or reports has a working authorized write path" (plan §15 DoD, not a numbered §12.2 line) | No — each write path is proven in isolation | `scene-qc-journey.integration-spec.ts` (§4.3 Gap 1) |
| Deleted contract is absent at runtime | No — new obligation created by §1 | extended `app-runtime.integration-spec.ts` (§4.3 Gap 3) |

All remaining §12.2 lines map to `scene-profile-persistence`, `task-template-scene-qc-evidence-ref-persistence`, `scene-qc-review-persistence`, and `scene-qc-confirmation-persistence`. Confirm each in the PR description with the owning spec name rather than re-testing.

§12.3 frontend scenarios are all owned by Child PR 3/4 component and hook tests. Two residual items belong here because they are consequences of §1 and §2.3:

- `sidebar-config.test.tsx` and `studio-route-access.test.ts` still pass unchanged (route path and role set did not move) — assert this rather than editing them.
- Add or extend a test asserting the route page renders `m.scene_review_description()`'s **new** copy, so a future revert of §2.3 is visible.

### 7.4 §12.4 rendered evidence

Child PR 3 captured daily queue + selected review, no-evidence blocker, missing-profile warning, and Minor/Fail feedback. Child PR 4 captured complete-day confirmation, stale-day reconfirmation, Records filters + detail, and manager report. **All eight §12.4 items are already captured.**

This PR's obligation is different: plan §10 asks the main PR for "desktop and mobile screenshot evidence" of the *integrated* result, and §15's DoD requires it "attached to the main PR". Capture a fresh desktop + mobile pass of the full §12.4 set on the merged integration branch — the child shots were taken before later children changed the surrounding shell (Child PR 4 moved `SceneQcTabs` up into `SceneQcWorkspace` and replaced the 5th summary `StatCard`), so the earlier shots no longer show the shipped composition. Use the [`pr-ui-screenshot-review`](../../../../.agents/skills/pr-ui-screenshot-review/SKILL.md) skill.

---

## 8. Rollout Sequencing

### 8.1 Plan §13 step 1 — already satisfied; confirm, do not repeat

"Apply the generated migration, marked partial index, and audit side-table constraint" describes a single migration event. In this repo the migrations landed **incrementally, one per child PR**, and are all checked in:

```text
20260726235634_scene_qc_foundation                    (Child PR 1)
20260727050141_task_template_scene_qc_evidence_binding (Child PR 2)
20260727152709_scene_qc_audit_target_audit_id_index    (Child PR 2)
20260727164956_scene_qc_review                         (Child PR 3)
20260728012640_scene_qc_daily_confirmation             (Child PR 4)
```

Pre-merge action: run `pnpm --filter erify_api db:migrate:status` against the target environment and confirm nothing is pending beyond these five. `prisma migrate deploy` still runs at deploy time — this PR neither adds nor edits a migration, and must not.

Two environment preconditions to state in the PR description (carried forward from Child PR 4's residual risks 4 and from the `scene_profiles` index hazard):

1. **PostgreSQL ≥ 11** — `hashtextextended(text, bigint)` backs the confirmation advisory lock. Verify the target server version.
2. **`scene_profiles_active_client_key` exists** — the partial unique index is invisible to Prisma and `migrate dev` repeatedly tries to drop it. Confirm it is present in the target database (`\di scene_profiles*`), not just in the migration file. `scene-profile-persistence.integration-spec.ts` asserts this in CI; production is a separate check.

### 8.2 The actual order

| # | Step | Gate |
| --- | --- | --- |
| 1 | Confirm the five migrations are applied and nothing is pending (§8.1) | `db:migrate:status` clean |
| 2 | Confirm the two environment preconditions (§8.1) | Postgres version; index present |
| 3 | Run `backfill … --report` against the target environment (`ALLOW_PROD=1`, read-only) | Output attached to PR |
| 4 | **Operator reviews the report and authors `scene-qc-evidence-binding-map.ts`** | **OQ-45 — human required** |
| 5 | Run `backfill …` dry-run | exit 0 |
| 6 | Run `backfill … --apply` (`ALLOW_PROD=1`) | exit 0; summary in PR |
| 7 | Run `verify … --since <date>` | `violations: 0`, exit 0; JSON in PR |
| 8 | Smoke-test in the target environment: one Scene Profile save, one multi-image Show, one blocked Show, one confirmation, Records, report + CSV download (plan §13 step 4) | All six pass |
| 9 | Merge PR #343 to `master` — **this is the "enable the route" action** (§3.4) | Final review |
| 10 | Post-merge: re-run `verify …` once against production to confirm the deploy did not change the picture | `violations: 0` |

Steps 3–7 are pre-merge because the route is already live on the branch and there is no flag to gate it (§3.4).

### 8.3 Rollback

Plan §13's rollback stands and is unchanged by this PR: restore the previous route build; leave the additive Scene QC tables intact; do **not** drop tables or rewrite evidence bindings during an emergency rollback. Two clarifications to write into the PR description:

- **The old backend contract is gone after this merge.** A rollback that restores a pre-#343 frontend build would call `GET /studios/:studioId/scene-review` against an API that no longer serves it. A true rollback is `git revert` of the merge commit (or redeploying the pre-merge `master` build of **both** apps), not a frontend-only revert. This is a real consequence of atomic cutover and should be stated, not discovered.
- **Step 6's backfill is not rolled back.** The `evidence_purpose` markers and ref rows are additive, idempotent, and harmless to the old code path (which ignored them entirely). Leave them.

---

## 9. Sequencing

Linear order for a single implementer. Each step ends with something verifiable. Steps 1–5 are pure deletion and should land as one reviewable commit each; steps 6–12 are the doc/test work.

1. **`@eridu/api-types` first.** Delete `task-management/scene-review.schema.ts` and its `index.ts` export line. → `pnpm --filter @eridu/api-types lint typecheck test build`. *Why first: it turns every dangling consumer into a compile error, which is the cheapest possible completeness proof for steps 2–3.*
2. **`erify_api` deletions.** The eight files (§1.1) plus the six surgical edits (§1.2). → `pnpm --filter erify_api lint typecheck test build`. Run the §1.4 grep gates.
3. **`erify_studios` deletions.** `rm -r src/features/scene-review/`, then the 30 dead i18n keys (§1.7.1) and the `scene_review_description` copy edit (§2.3). → `pnpm --filter erify_studios lint typecheck test build`. *Paraglide regenerates `src/paraglide/` from `en.json`; that directory is git-ignored and must not appear in the diff.*
4. **`pnpm architecture:signals`** and record the delta against §7.2's table. *Do this before any test is added, so the deletion delta is clean and separable from step 6's `+1 spec`.*
5. **Full-repo dangling-reference sweep.** The §1.4 greps plus `grep -rn "scene-review" apps packages --include="*.ts" --include="*.tsx" | grep -v /dist/` — the only surviving hits should be the four route/sidebar files and the surviving i18n keys.
6. **`scene-qc-authorization.spec.ts`** (§4.3 Gap 2). Cheap, no fixtures, immediately runnable. → `pnpm --filter erify_api test`.
7. **Extend `app-runtime.integration-spec.ts`** (§4.3 Gap 3). → `pnpm -C apps/erify_api test:integration`.
8. **`scene-qc-journey.integration-spec.ts`** (§4.3 Gap 1). The largest new file in the PR; write it against the finished, undeleted-from tree. → `pnpm -C apps/erify_api test:integration`, result recorded.
9. **Canonical docs.** Create `docs/features/scene-qc.md`, `apps/erify_studios/docs/SCENE_QC.md`, and `apps/erify_api/docs/SCENE_QC.md`; delete `apps/erify_studios/docs/SCENE_REVIEW.md`. → `pnpm lint:markdown`. *Before the design docs are deleted, so their content can be lifted rather than recovered from git.*
10. **Skill + doc reconciliation.** The eight plan §11 files (§5.1–§5.8), the §5.9 Task Template link retargets, and the §5.10 index files. → `pnpm agents:validate`, `pnpm lint:markdown`.
11. **Lifecycle bookkeeping.** PHASE_5 status + §22 forward link (§6.1); PRD promotion, Stage 2/3 forwarding, PRD deletion (§6.2); design-doc deletion **including this file** and the 25 code-comment retargets (§6.3); `.claude/agent-memory` note (§6.4); tech-debt trigger re-check (§6.5). → `pnpm lint:markdown` + a final link sweep: `grep -rn "SCENE_QC_IMPLEMENTATION_PLAN\|SCENE_QC_CHILD_PR\|SCENE_QC_MAIN_PR\|SCENE_REVIEW.md\|docs/prd/scene-qc" . --include="*.md" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git` returns zero.
12. **Full verification sweep** (§7.1) + Playwright evidence (§7.4) + PR description: refactoring-target preflight (RT-01, RT-06, RT-07), the `architecture:signals` delta, the integration-gate result, the §3 evidence-binding command outputs, the §8.1 environment preconditions, and the §8.3 rollback clarifications.

**Steps 3–8 must not start before OQ-45 is resolved** if the team wants steps 3–8 and the §8.2 operational steps to land in one reviewable PR. The code deletion itself (steps 1–5) is independent of the binding map and can proceed while the operator review is scheduled.

---

## 10. Open Questions and Risks

Numbering continues from Child PR 4's OQ-42.

### 10.0 Decisions (this breakdown's recommendations — record as accepted in the PR description)

| # | Decision |
| --- | --- |
| OQ-43 | There is no `src/models/task/schemas/scene-review.schema.ts` — only its `.spec.ts`. Plan §9 item 8's "old shared schemas and tests" maps to `packages/api-types/src/task-management/scene-review.schema.ts` (schema) + `apps/erify_api/src/models/task/schemas/scene-review.schema.spec.ts` (test). `packages/api-types` ships no tests at all. |
| OQ-44 | Keep the `STUDIO_ROUTE_ACCESS.sceneReview` key name and the `/scene-review` URL. The plan mandates the URL; renaming the key would be churn-only across four files, against the repo's recorded `route-rename-no-redirect-shims` preference. |
| OQ-46 | Delete the plan and both child breakdowns per `knowledge-sync.md` §2, and retarget all 25 code comments to the new canonical docs **by section name, not number**. For the two load-bearing invariants (`scene-qc-evidence.resolver.ts:126` OQ-1; `scene-qc-confirmation-state.policy.ts` OQ-22/23), **inline the one-sentence reason** rather than pointing anywhere — a future editor must not need a deleted document to know why the rule exists. |
| OQ-47 | Plan §13 step 5's "enable the replaced route only after all checks pass" has no referent: the route was enabled by Child PR 3 (OQ-8) and there is no flag. Read it as **"merge PR #343 only after §8.2 steps 1–8 pass"**; the merge *is* the enable action. Do not add a feature flag now to make the sentence literally true. |
| OQ-48 | Do **not** introduce an HTTP e2e harness. `e2e_specs: 0`, no `*.e2e-spec.ts` exists, `supertest` is an unused devDependency, and the repo's comparable cross-layer proof is the service-level `test/integration/` harness. "Combined end-to-end and authorization coverage" is delivered as one journey integration spec + one consolidated authorization spec + one runtime-absence assertion (§4.3). |
| OQ-49 | Plan §11's Task Template documentation requirement is **already satisfied** by Child PR 2 (`task-template-builder` SKILL §9, `docs/features/task-templates.md` §Explicit Evidence Designation). This PR only retargets the two links that pointed at the retired plan and drops the `(Child PR 2)` label from the skill heading. Do not re-document `evidence_purpose`. |
| OQ-50 | Create three canonical docs, not one: `docs/features/scene-qc.md` (cross-app product behavior + acceptance record, replacing the PRD), `apps/erify_studios/docs/SCENE_QC.md` (frontend reference, replacing `SCENE_REVIEW.md`), `apps/erify_api/docs/SCENE_QC.md` (API/persistence reference). The third is not optional: the API contract and persistence invariants live **only** in the plan being deleted, and `apps/erify_api/docs/` has three direct precedents for exactly this doc shape. |
| OQ-51 | Lift plan §2's locked-decision table verbatim into `docs/features/scene-qc.md`'s **Key Product Decisions** section. It is the single highest-value block in the retired plan and the only place the *reasoning* behind one-review-per-Show, the uniform role set, the append-only confirmation model, and the hardcoded timezone constant is recorded. |
| OQ-52 | Keep `scene_review_title` = "Scene Review" as the nav label (plan §7 line 361 is explicit) but rewrite `scene_review_description`, which describes deleted behavior ("performance context"). The resulting label/terminology mismatch is a recorded follow-up (§10.3), not a decision reversal. |
| OQ-53 | Delete all 30 orphaned `scene_review_*` i18n keys from `en.json`. `src/paraglide/` is git-ignored generated output and is not a deletion target. Only `en.json` exists, so there is no sibling locale to keep in sync. |

### 10.1 Needs explicit sign-off before implementation starts

**OQ-45 — The evidence-binding map is empty, and only a human can fill it.** *(This is the one item in this breakdown matching the OQ-1 / Child-PR-4-escalation pattern. It is deliberately left unresolved.)*

`apps/erify_api/scripts/scene-qc-evidence-binding-map.ts` ships with both `SCENE_QC_EVIDENCE_BINDINGS` and `SCENE_QC_INTENTIONALLY_UNBOUND` empty behind `TODO(scene-qc-cutover)` markers. The file's own header states the pre-review state is intentional and fail-closed. Two consequences, both real:

1. **Filling it is a data-review task, not a code task.** It requires reading production Task Template schemas and deciding, per template, which image field constitutes Scene QC evidence — and recording a human `note` per binding and a human `reason` per deliberate exclusion. Inventing plausible entries would produce a silently wrong evidence set that looks correct in every automated check. **An agent must not author these entries.**
2. **The route is already live, so an empty map ships a broken feature.** With no bindings, the evidence resolver returns nothing, every Show renders `NO_EVIDENCE`-blocked, no day can be confirmed, and no report can exist. There is no flag to hide this.

The genuine two-sided decision, which needs the user, not this document:

| Option | For | Against |
| --- | --- | --- |
| **A — Merge blocks on the operator review.** §8.2 steps 3–7 complete against the target environment, the map is committed on this branch, and PR #343 merges only after `verify` returns `violations: 0`. | Matches plan §13 and §9 item 9 exactly. Nothing broken ever reaches `master`. The one atomic-cutover promise the whole program was designed around is kept. | Couples the code merge to an operational data-review task with an unknown lead time, and puts production Task Template UIDs into the repository as source. |
| **B — Merge now, backfill after.** Ship the deletion + docs, run §8.2 steps 3–7 as a post-merge deploy activity. | Unblocks the code work immediately; the deletion has no dependency on the map. | Violates plan §13 step 5 and §15's DoD. Ships a route where every Show is blocked and no day can be confirmed — visible to Designer, Manager, and Admin on `master` from the moment of merge, with no flag to hide it. Contradicts plan §9's "Do not ship a hybrid UI" spirit. |

This breakdown recommends **A** and will not resolve it unilaterally: option B has a real, non-trivial advantage (it decouples a code merge from an operational task with unknown scheduling), and choosing B is a deliberate product decision to ship a temporarily non-functional surface. That is exactly the shape of tradeoff Child PR 3's OQ-1 escalated. **Route to the user before step 3 of §9.**

A secondary question rides on the same decision and should be answered together: **should `scene-qc-evidence-binding-map.ts` live in the repository at all**, given it will contain production template UIDs? The alternatives (an env-var-supplied JSON path, or a database-side configuration table) each have costs, and Child PR 2 already chose the in-repo file with review sign-off. Raising it only because this PR is the first time the file gets real contents.

### 10.2 Drift between the plan's prose and the shipped tree

**OQ-54 — Plan §13 step 1 describes one migration event; five landed incrementally.** Each child PR generated and merged its own migration (§8.1). "Apply the generated migration" is now a *confirmation* step, not an action. Do not attempt to squash or regenerate — three of the five are already deployed to shared environments, which the repo's core rules forbid rewriting.

**OQ-55 — PHASE_5 §23's child-PR descriptions were written before two scope changes.** Line 339 credits Child PR 1 with a "canonical `Studio.timezone`" (the design moved to a shared constant in `92c47350`/`8f1b3e70`, deferring the column to `studio-config-settings` §6) and line 340 names Child PR 2 "Profiles, **Materials**, and Explicit Evidence Feeder" (Materials were re-scoped out in `5c59158d`). Correct both in §6.1. Distinct from item 22, which is preserved verbatim as history.

**OQ-56 — Plan §9 item 7 implies work that does not exist.** "Retain reusable, capability-neutral evidence viewer UI where it still fits" reads as a move-or-extract instruction. `TaskQcEvidenceViewer` already lives in `features/tasks/`, is typed on its own local `TaskQcEvidence`, and is still consumed by the surviving `task-qc-review-sheet.tsx`. Scene QC never adopted it. **Item 7 is a no-op**; state that in the PR so a reviewer does not go hunting for the missing move.

**OQ-57 — Plan §11 lists eight files; five more need reconciliation.** `apps/erify_api/docs/design/README.md`, `apps/erify_studios/docs/design/README.md`, `docs/prd/README.md`, `docs/features/README.md`, and `.agents/skills/INDEX.md` all carry rows or entries this PR invalidates (§5.10). Two of them (`docs/prd/README.md`'s row) additionally carry status text that has been stale since `d98495a3`.

**OQ-58 — Plan §12.4 asks for evidence the child PRs already captured.** All eight scenes were shot by Child PR 3 and 4. The main PR's obligation is a *fresh integrated* capture, because Child PR 4 restructured the shell around the Child PR 3 shots (tabs hoisted into `SceneQcWorkspace`, the 5th summary card replaced by `SceneQcConfirmationCard`). Re-shoot rather than re-attach (§7.4).

### 10.3 Residual risks — record, do not solve here

1. **Nav label vs. product terminology.** After this PR the sidebar says "Scene Review" while the PRD, every doc, every skill, the API route prefix (`/scene-qc/*`), and every UID prefix say "Scene QC". Plan §7 locked the label deliberately (avoiding retraining cost on a live surface), and the route path must stay per §9 item 2. *Trigger for revisiting:* an operator reports confusion, or a second scene-related surface ships and the two need distinguishing. Not tech debt; a recorded product choice with a stated reason.
2. **The `--since` window is a judgment call with no default.** `verify-scene-qc-evidence-bindings.ts` requires `--since` and has no fallback. A generous value inflates the in-scope set with snapshots nobody will review; a tight value proves little. Record the exact value used and its rationale in the PR. *Trigger:* if the verification is ever wired into CI, `--since` must become a documented, committed constant rather than an ad-hoc flag.
3. **`hasUnresolvedOrFailedBindings` covers the backfill, not partial success across templates.** The backfill's current-snapshot pass fails closed *per template* (aborting rather than half-applying), but a run over N templates can leave template 1 bound and template 2 aborted, with exit `1`. Re-running is safe (idempotent), but the operator must read the summary, not just the exit code. Say so in the PR's runbook section.
4. **This PR removes the only `metadata.audit.last_transition` reader in `models/task`.** `extractSubmittedAt` dies with the mapper (§1.4). That is the desired direction — the repo's core rules class `metadata.audit.*` as legacy compatibility only — but other readers may exist elsewhere. Out of scope; do not go looking, and do not delete any other reader in this PR.
5. **Twenty-five code comments will be edited in a PR that is otherwise deletions.** The §6.3 retargeting inflates the diff with mechanical churn in files this PR does not otherwise touch. Land it as its own commit (sequencing step 11) so review can separate it from the deletion. If review objects to the volume, the fallback is to retarget only the 13 comments citing a *section number* (which cannot survive) and leave bare document-name mentions to a follow-up — but a follow-up leaves dangling references, which `pr-review.md`'s Wrap-up gate treats as not-ready.
6. **`pnpm --filter erify_api test:e2e` remains a no-op after this PR.** OQ-48 accepts that. It is worth one line in the PR noting the script exists and matches nothing, so a future reader does not assume e2e coverage was lost with the deletion. *Trigger:* the first feature that genuinely needs HTTP-level contract tests.
