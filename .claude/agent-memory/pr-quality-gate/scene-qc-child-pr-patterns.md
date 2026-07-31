---
name: scene-qc-child-pr-patterns
description: Scene QC integration program (PR #343 umbrella) child-PR review patterns — Child PR 1 was re-scoped after its first review pass (2026-07-27); do not review against the original Material/Profile/Revision/Assignment model
metadata:
  type: project
---

## Program closed (2026-07-30)

The program merged: main integration PR #343 landed the atomic cutover, and
the implementation plan plus both child-PR breakdown docs this file cites
were retired per `knowledge-sync.md` §2 (design docs are deleted once
promoted). Canonical references are now `docs/features/scene-qc.md`,
`apps/erify_api/docs/SCENE_QC.md`, and `apps/erify_studios/docs/SCENE_QC.md`.
This file's recurring-review-finding content below stays useful for future
Scene QC PRs; the four inline references to the retired design docs are
retargeted to the canonical docs rather than removed.

## Program structure

Scene QC replaces the PR #319 Task-anchored Scene Review with a persisted,
Show-level capability. Delivered via `.agents/workflows/integration-pr-delivery.md`:
one integration branch `feat/scene-qc-integration`, four child PRs targeting it,
one atomic main PR to `master`. Canonical doc: `apps/erify_api/docs/SCENE_QC.md`.
Product doc: `docs/features/scene-qc.md`. When reviewing any child PR, diff against
`origin/feat/scene-qc-integration`, not `origin/master` — "should target master"
is not a valid finding for these branches.

## Scope correction (2026-07-27) — read this before reviewing any Child PR 1 diff

The original Child PR 1 design (reviewed as PR #345, verdict READY on 2026-07-26)
built `SceneMaterial`/`SceneMaterialRevision`/`SceneProfile`/`SceneProfileRevision`/
`SceneProfileRevisionMaterial`/`SceneProfileAssignment` (composed, versioned,
per-Studio/per-platform-applicable Scene Profiles) plus a required per-Studio
`Studio.timezone` column with a nullable→backfill→NOT NULL migration. After
review, the product owner rejected this scope as premature (materials/profiles
not yet validated with a real Client-configuration flow; YAGNI) and asked
whether repositories were still needed under the just-landed
`erify-api-capability-refactoring` guidance (PR #344). The PRD and implementation
plan were rewritten accordingly:

- **Scene Profile is now one mutable row per Client** (`SceneProfile`: uid,
  clientId unique, objectKey, fileUrl, mimeType, fileSize, sceneType, version,
  timestamps). No `SceneMaterial`, no revisions, no composition, no per-Studio/
  per-platform applicability, no per-Show assignment override. Replacing the
  image is a normal version-checked update; the "don't rewrite confirmed review
  context" product rule is satisfied by `SceneQcReview` snapshotting
  `expectedObjectKey`/`expectedFileUrl`/`expectedSceneType` at save time, not by
  a profile revision table.
- **No repository for Scene Profile.** Under the persistence matrix, a
  single-model version-checked update is shallow CRUD — `SceneProfileService`
  calls `txHost.tx.sceneProfile` directly. (`SceneQcReview`/
  `SceneQcDailyConfirmation` persistence is unaffected and still justifies a
  repository — multi-row evidence pinning, advisory-locked append-only
  confirmation, revision replace.)
- **No `Studio.timezone` column.** Stage 1 hardcodes a shared operational-timezone
  constant (`Asia/Bangkok`). The DST-safe `studio-operational-window.util.ts`
  utility (see below) is unaffected — it's still IANA-parameterized, just called
  with the constant instead of a DB value. `docs/tech-debt/scene-qc-studio-timezone-no-write-path.md`
  was deleted (moot — there's no column to have a missing write path for).
  `docs/ideation/studio-config-settings.md` §6 no longer claims Scene QC already
  promotes this column.
- **Cross-Studio-impact authorization is gone entirely** — it only existed to
  guard mutations affecting a Material/Profile composition used outside the
  route Studio, which no longer exists.
- Child PR 2 is renamed **"Scene Profile API and Explicit Evidence Feeder"**
  (previously "Profiles, Materials, and Explicit Evidence Feeder") — the
  Scene Profile GET/PUT/DELETE routes now live there alongside the evidence
  feeder, since the persistence-only Child PR 1 ships no controllers.

PR #345 predates this rewrite and was superseded by the rescoped design. Do not
apply the "Verified-correct patterns" below as if the old model still exists —
cross-check `apps/erify_api/docs/SCENE_QC.md` ("Persisted Model") for the
authoritative persisted-model shape before reviewing.

## Verified-correct patterns that remain valid after the rescope

- **`studio-operational-window.util.ts`**: reference implementation for
  DST-safe IANA timezone wall-clock↔UTC conversion using only `Intl` (no date
  library dependency in `erify_api`). Two-pass guess-format-correct algorithm.
  Its spec file is the reference for how to actually prove TZ-independence
  (mutate `process.env.TZ` across runs, assert identical output) and DST
  correctness (assert continuity — no gap/overlap — across 20 consecutive days
  spanning both a spring-forward and fall-back transition), not just "a test
  exists." Deliberately a separate utility from `operational-day.util.ts`
  (which buckets from a frontend-supplied date + fixed offset, no per-entity
  timezone, no DST) — the two are not meant to share an implementation despite
  both starting at a 06:00 local cutover hour. This utility is still needed
  post-rescope; it's now called with a hardcoded constant instead of a
  `Studio.timezone` column value.
- **Capability-owned audit-target side table pattern** (shape, not the specific
  FK set): a private junction table with a `num_nonnulls(...) = 1` CHECK
  constraint scoped to only the FKs the current PR actually adds, with an
  explicit schema comment telling later child PRs to `DROP`/re-`ADD` the
  constraint when they widen it. Post-rescope this starts with a single
  `sceneProfileId` FK, not three.
- **Guarded real-DB gate self-assessment can be wrong**: PR #345's own
  description claimed the gate didn't apply ("touches no BaseRepository/...
  surface") while its new repositories literally `extends BaseRepository` and
  wired a new module into `AppModule`. Always independently judge whether the
  gate applies from the diff, not from the PR's own checklist — then actually
  run it (`docker compose -f apps/erify_api/test/docker-compose.yml up -d --wait`
  then `ERIFY_API_TEST_DATABASE_URL=postgresql://erify_test:erify_test@localhost:55432/erify_api_test pnpm -C apps/erify_api test:integration`,
  then `docker compose -f apps/erify_api/test/docker-compose.yml down`). It's
  self-contained (own docker-compose, own ephemeral tmpfs DB) and cheap
  (~15s) — no excuse to skip it when the diff touches persistence/CLS/module
  wiring. This applies regardless of the Scene Profile model's shape.
- **Nullable→backfill→verify→NOT NULL migration shape** (general pattern, not
  a Scene QC-specific reference anymore): still the correct rollout shape for
  any *future* required column on a populated table — nullable ADD, explicit
  reviewed `VALUES` mapping keyed on a human-readable unique field, a
  `DO $$ ... RAISE EXCEPTION` verify block, then `SET NOT NULL`, no `DEFAULT`
  clause. Just no longer exemplified inside Scene QC itself.

## Obsolete findings — do not re-flag

- Anything about `SceneMaterial`, `SceneMaterialRevision`, `SceneProfileRevision`,
  `SceneProfileRevisionMaterial`, `SceneProfileAssignment`, cross-Client material
  composition guards, advisory-locked default-profile swaps, or per-Studio/
  per-platform material applicability — none of this exists in the current plan.
- `Studio.timezone` no-write-path — there's no column, so this class of finding
  no longer applies.
- The "5-FK audit-target side table" framing — it's a 1-FK table now, growing to
  3 across Child PR 3/4, not 5.

## PR #346 — Child PR 1 (v2), READY, merged as first implementation of the 2026-07-27 rescope

Reviewed 2026-07-27 against `origin/feat/scene-qc-integration`. This is the
actual first implementation of the rescoped design described above (the
rescope notes were written the same day, ahead of this PR). Verdict: READY,
no blocking findings. Confirms the rescoped design works end to end:

- `SceneProfileService` (`apps/erify_api/src/capabilities/scene-qc/scene-profile.service.ts`)
  calls `txHost.tx.sceneProfile` directly, zero repository files anywhere in
  the capability folder. `scene-qc.module.spec.ts` asserts this at runtime
  (`provider.name.endsWith('Repository') === false`) in addition to the
  static absence.
- No `Studio.timezone` anywhere in the schema diff; `scene-qc-operational-window.util.ts`
  hardcodes `OPERATIONAL_TIMEZONE = 'Asia/Bangkok'` as an exported constant
  and takes timezone as a required parameter to `resolveOperationalWindow`/`resolveOperationalDate`.
- No `status` field on `SceneProfile` — `deletedAt` is the only lifecycle
  marker, and in this PR's scope literally nothing but `SceneProfileService`
  itself reads `sceneProfile` rows (grep-verified), so "a retired profile has
  no reader" holds trivially true for now.
- Migration `20260726235634_scene_qc_foundation` (purpose-only name, no PR/phase
  in the folder name): partial unique index (`scene_profiles_active_client_key`
  on `client_id` WHERE `deleted_at IS NULL`) and the `num_nonnulls(scene_profile_id) = 1`
  CHECK both live inside `-- CUSTOM SQL START/END` markers, both with widening
  comments for later child PRs.
- `saveProfileForClient` correctly implements all four version-check cases
  (no-profile/no-version→create, no-profile/version→409, profile/no-version→409,
  profile/version→version-checked replace); retire guards version in the
  `where` but never increments it; unique-constraint (create race) and
  record-not-found (replace/retire race) both map to 409, never 500/unhandled.
  All four cases have individual unit tests plus a real-DB integration spec
  exercising the actual constraints.
- `SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS = ['CANCELLED']` only — the spec
  file even cross-checks against the real `CANCELLATION_GATE_OWNED_SHOW_STATUS_SYSTEM_KEYS`
  constant to prove the two lists are deliberately different, not a stale copy.
- Operational window util is genuinely `Intl`-based two-pass wall-clock↔UTC
  (no fixed offset, no host-local `Date` accessors) with explicit 23h
  spring-forward / 25h fall-back assertions and a describe-block title
  ("no TZ env pinning required") backing the TZ-independence claim.
- `scene-qc.module.spec.ts`'s non-registration check reads `app.module.ts` as
  raw text (`readFileSync` + `.not.toContain('SceneQcModule')`) instead of
  importing `AppModule`, because importing it triggers `ConfigModule.forRoot`
  needing a full `.env`. Judged this an acceptable substitution: a literal
  substring `.not.toContain` is if anything *stricter* than a real import
  check (it fails on a stray comment mentioning the name too), and an
  independent repo-wide grep for `SceneQcModule`/`SceneProfileService` outside
  the `scene-qc/` folder confirmed zero references anywhere, including the MCP
  module graph. Minor gap noted, not blocking: `app-runtime.integration-spec.ts`
  (the real-DB gate's AppModule-boots test) doesn't itself assert
  `SceneQcModule`'s absence — it just happens to pass either way.
- `@eridu/api-types/scene-qc/schemas.ts`: `SCENE_PROFILE_ALLOWED_MIME_TYPES`
  (`image/jpeg`/`png`/`webp`) is confirmed narrower than the shared
  `FILE_UPLOAD_USE_CASE_RULES.SCENE_REFERENCE` rule (which also allows
  `application/pdf`); `SCENE_PROFILE_MAX_FILE_SIZE_BYTES` is derived via
  `getUploadMaxFileSizeBytes(FILE_UPLOAD_USE_CASE.SCENE_REFERENCE)`, no
  duplicated byte-size literal.
- UID prefix `scprof` doesn't collide (isn't a string-prefix of, and has no
  existing prefix as its own string-prefix) with any entry in `UID_PREFIXES`.
- Nice idiom worth reusing: a compile-time-only unit test that assigns
  `{} as Prisma.SceneProfileUpdateInput` to the payload type under
  `@ts-expect-error`, proving the public payload type structurally rejects a
  raw Prisma input type (`scene-profile.service.spec.ts:260`). Good pattern
  for any future "services must not accept Prisma types" claim — asserts it
  at the type checker rather than only via convention/comment.
- All verification independently re-run and green: `db:validate`; api-types
  lint/typecheck/build; erify_api lint/typecheck (174 suites/1722 tests
  passed, including all 5 new scene-qc spec files)/build; erify_studios
  typecheck; `architecture:signals` (0 cycles, no new exported repositories);
  `agents:validate`; `lint:markdown`; `sherif`; and the guarded real-DB
  integration gate (migration applied cleanly, partial index and CHECK both
  observed rejecting bad writes in the Prisma error log, cascade/CLS/rollback
  specs all passed).

## Recurring minor pattern to watch for regardless of scope

When a repository/service is genuinely justified (multi-row, optimistic-lock,
raw SQL, revision-append), individual shallow lookup methods on it sometimes
skip the literal `// Engineering decision:` comment tag even when a justifying
docstring exists. Treat as a non-blocking consistency note, not a blocker, when
the reasoning is evident from the docstring or from being the model's canonical
findOne/findByUid-equivalent lookup.

## PR #348 — Child PR 3 (Daily Review Journey), reviewed 2026-07-28

Diffed against `feat/scene-qc-integration` (merge-base `6a2ec632`), not
`master`. Implementation matches the (now-retired) Child PR 3 breakdown almost
exactly — schema, migration (including the documented spurious DROP INDEX
strip and the CHECK-widen custom SQL), repository, evidence resolver
(bulk, deterministic sortOrder `(taskUid, fieldKey)`, dedup by fileUrl),
workflow service (§8.2 chain, order of operations, 409-vs-403 re-read on
update conflict), query service (unfiltered summary vs filtered items,
in-memory blocked-state filtering per OQ-11, 500-cap loud failure),
controllers, module wiring, audit writer, `StorageService.deriveObjectKeyFromPublicUrl`,
route swap (OQ-8, no temp route), and the OQ-2 re-sign-claim correction were
all verified line-by-line against the breakdown's decisions table (§6.0) and
found correct. All gates independently
re-run and green: api-types lint/typecheck/build (no test script — pre-existing,
not this PR's gap); erify_api lint/typecheck/build, test (185 suites/1880
tests); erify_studios lint/typecheck/build, test (217 files/1039 tests);
guarded real-DB integration gate (all 6 required §4.2 scenarios present and
passing, including rollback-leaves-no-partial-rows and the
`scene_profiles_active_client_key` regression guard); `architecture:signals`
(0 cycles, `SceneQcRepository` correctly absent from `exported_repositories`);
`lint:markdown`.

Two real, previously-unflagged findings (both WARNING, not blocking):

1. **`saveAndNext()` race against invalidation** (`use-scene-qc-daily.ts`
   + `scene-qc-daily-workspace.tsx`'s `handleSave`): `useCreateSceneQcReview`/
   `useUpdateSceneQcReview`'s `onSuccess` calls `void queryClient.invalidateQueries(...)`
   (fire-and-forget, not awaited) — so `form.save()`'s resolved promise does
   NOT wait for `itemsQuery` to refetch. `handleSave` then synchronously calls
   `controller.saveAndNext()`, which reads `itemsQuery.data` — still the
   pre-mutation stale cache at that instant. `saveAndNext`'s logic
   (`items.slice(currentIndex + 1).find(isUnreviewed) ?? items.find(isUnreviewed)`)
   falls back to searching from the start including the current item when
   nothing unreviewed remains after it — so if the just-saved item was the
   last unreviewed one in the queue, the stale cache still shows it as
   unreviewed and `saveAndNext` reselects the SAME item instead of correctly
   returning `false` (no more items). Self-heals once the background refetch
   lands a moment later (summary/queue update correctly), so no data
   integrity impact — just a one-tick UX glitch at the end of a review
   session. The hook's own unit tests don't catch this because they inject
   `itemsQuery.data` already reflecting the post-save state, which glosses
   over the real timing gap between mutation resolution and cache
   invalidation. Not caught by any of the "known deviations" the PR
   description called out.

2. **`SceneQcReviewPanel` / `SceneQcMobileDrawer` don't branch on
   `blocked_reason === 'NOT_ELIGIBLE'`** — both only check `NO_EVIDENCE`
   (blocked panel) and `CONFIRMED` (read-only banner); `NOT_ELIGIBLE` falls
   through to rendering the normal editable result form even though
   `can_review` is `false`. Reachable when the URL still carries a `show_id`
   whose window no longer matches the current `operational_date` (e.g. after
   a Show's start time moved, or stale back/forward navigation) — the detail
   endpoint's `findEligibleShowForReview` only filters `deletedAt`/`studio`,
   not the window, so `NOT_ELIGIBLE` really can come back from the API. Not a
   security/data-integrity gap — `SceneQcWorkflowService.createReview`/
   `updateReview` independently re-check eligibility and would reject the
   save server-side — but it lets an operator fill out and attempt a doomed
   save instead of seeing a clear reason up front. The breakdown's own §3.4
   state-mapping table never assigns `NOT_ELIGIBLE` a UI treatment either, so
   this is a spec gap inherited by the implementation, not a regression
   introduced by this PR specifically — still worth a WARNING since the
   response schema explicitly enumerates the value.

Payload types in `schemas/scene-qc-review.schema.ts`
(`CreateSceneQcReviewPayload.result: PrismaSceneQcResult`,
`UpdateSceneQcReviewPayload.result`) import the Prisma-generated enum
directly rather than the `@eridu/api-types/scene-qc` domain `SceneQcResult`
type, and these payload types flow into the *exported* `SceneQcWorkflowService`'s
public signature. Judged non-blocking: this mirrors the already-reviewed-READY
precedent in `scene-profile.schema.ts` (`sceneType: SceneType` from
`@prisma/client`), and the project's "schemas may import Prisma types" rule
does not distinguish enum re-exports (plain string-literal unions, no ORM
query DSL) from the `Prisma.*Input`/`Prisma.*WhereInput` shapes the rule is
actually guarding against. Flag as a 💡 suggestion only if asked to be
stricter than existing precedent.

## PR #343 — Main Integration PR, READY, merged (reviewed 2026-07-30)

The atomic cutover to `master`. Correctly scope this kind of review to
`git diff <last-child-PR-merge-sha>..HEAD` (here `3211b73f..HEAD`, the "Child
PR 4" merge commit), not `master...HEAD` — the latter is the full ~21.7k-line
program diff including all four already-reviewed child PRs. The integration-
only diff was 99 files / +1189/-5231. All of the following independently
re-verified and green: `@eridu/api-types` lint/typecheck/build (no test
script, pre-existing); `erify_api` lint/typecheck/build, test (190 suites/1947
tests); `erify_studios` lint/typecheck/build, test (223 files/1075 tests, 1
pre-existing skip); `architecture:signals` matched the PR's own predicted
first-negative-delta exactly (typescript_files 597→590, production_services
75→74, controllers 59→58, specs 187→184, `exported_repositories` unchanged at
5, 0 module cycles); `agents:validate`; `lint:markdown`; `sherif`; and the
guarded real-DB integration gate (10 suites, 1 pre-existing skip, 53 passed
including the new whole-capability `scene-qc-journey.integration-spec.ts` and
the extended `app-runtime.integration-spec.ts` route-table-absence assertion).
Three dangling-reference greps (retired docs, `SceneReview`/`scene-review.`
identifiers, old heuristic identifiers `findFallbackEvidence`/
`METRIC_MATCHERS`/`IMAGE_EXTENSION_PATTERN`) came back clean — the one
`METRIC_MATCHERS`/`IMAGE_EXTENSION_PATTERN` hit is a same-named-but-unrelated
pre-existing utility in `features/tasks/lib/task-qc-evidence.ts` (PR #319,
Task Review's own evidence heuristics, untouched by this PR) — a false
positive, not a residual.

Deletion of the PR #319 Scene Review implementation was clean: `TaskRepository`
lost exactly `findSceneReviewCandidates`/`findSceneReviewCandidate` (both had
`// Engineering decision:` tags), `task-relation-query.ts` lost only
`sceneReviewCandidateInclude` while `showHydrationTargetSelect` (shared by both
surviving includes) was correctly kept, `TaskQcEvidenceViewer` in
`features/tasks/` is untouched and still wired into `task-qc-review-sheet.tsx`.
The `/studios/:studioId/scene-review` route, nav label, and
`STUDIO_ROUTE_ACCESS.sceneReview` key were retained by design (now serving
Scene QC under the old URL/nav slug) — component/i18n identifiers there
(`SceneReviewLayout`, `scene_review_access_title`) still literally say "scene
review," which is an intentional, disclosed naming carryover, not a defect.

New tests are all genuinely strong, not tautological:
`scene-qc-authorization.spec.ts` table-drives all 5 controllers, asserts the
exact role array via `Reflect.getMetadata`, asserts no method-level override,
and asserts an exclusion list (`MODERATION_MANAGER`/`TALENT_MANAGER`/`MEMBER`/
`ACCOUNT_MANAGER`) is absent. `app-runtime.integration-spec.ts`'s addition
enumerates the actual booted Express route table (skips the Nest catch-all)
and asserts the deleted `/scene-review` and `/scene-review/:taskId` routes are
genuinely gone, with an `arrayContaining` sanity check proving the enumeration
itself would have caught something. `scene-qc-journey.integration-spec.ts`
is the first spec to compose all four child capabilities in one flow (profile
save → real `TaskTemplateService.updateTemplateWithSnapshot` evidence binding
→ two reviews → confirmation → report/CSV/Records) with concrete value
assertions at every step (evidence counts, MINOR/PASS results, confirmation
revision, report scope totals, CSV row count, records confirmation status).

The two script fixes (`backfill-scene-qc-evidence-refs.ts`,
`verify-scene-qc-evidence-bindings.ts`) add a `ConfigModule.forRoot({
isGlobal: true, cache: true, validate: ... })` block that textually mirrors
`AppModule`'s (`apps/erify_api/src/app.module.ts`) — confirmed by direct
diff — and correct their own header-comment invocation from `tsx` to
`ts-node -r tsconfig-paths/register` (correct: `tsx`'s esbuild transform drops
`emitDecoratorMetadata`, so Nest's implicit constructor DI silently receives
`undefined`). Also switched `logger: false` → `logger: ['error', 'warn']` so a
DI bootstrap failure is diagnosable instead of a silent `process.exit(1)`. A
new tech-debt doc (`docs/tech-debt/erify-api-scripts-missing-config-module.md`)
honestly discloses two *other*, unrelated pre-existing scripts
(`consolidate-duplicate-mechanics.ts`, `backfill-product-promotion-mechanics.ts`)
sharing the same bootstrap gap, explicitly not fixed here as out of scope —
good hygiene, not scope creep.

`scene-qc-evidence-binding-map.ts`'s single bound field
(`fld_cmkmx9knubz`/"On air_check") and 11 intentionally-unbound entries each
carry an individually-verified reason; the fieldKeys use the v2 `field.id`
content-key convention, consistent with the shared `getFieldContentKey`
helper (`@eridu/api-types/task-management`, also used by
`TaskTemplateRepository` and the backfill script itself) that the binding map
is designed to match.

Doc reconciliation spot-checked and accurate: both skill files
(`erify-authorization`, `operations-review-surface`) correctly narrow the
former absolute "every review surface is read-only" rule to a bounded
carve-out scoped to Scene QC's own normalized tables;
`docs/features/rbac-roles.md`'s role matrix row
(`❌/✅/❌/✅/❌/✅` for MEMBER/DESIGNER/MODERATION_MANAGER/MANAGER/
TALENT_MANAGER/ADMIN) matches the shipped `[DESIGNER, MANAGER, ADMIN]`
`@StudioProtected` set exactly. `docs/roadmap/PHASE_5.md` item 22 (the PR #319
historical record) was left untouched except for one added "Superseded by
item 23" forward-link paragraph, confirmed by diff. The two comments required
to be inlined rather than retargeted (`scene-qc-evidence.resolver.ts`'s OQ-1
exclude-non-derivable-object-key rule, `scene-qc-confirmation-state.policy.ts`'s
OQ-22/23 version-not-bumped coupling) both read as fully self-contained
explanations now, no reference to a deleted doc needed.

No blocking or warning findings. Verdict: READY, merged.
