---
name: scene-qc-child-pr-patterns
description: Scene QC integration program (PR #343 umbrella) child-PR review patterns — Child PR 1 was re-scoped after its first review pass (2026-07-27); do not review against the original Material/Profile/Revision/Assignment model
metadata:
  type: project
---

## Program structure

Scene QC replaces the PR #319 Task-anchored Scene Review with a persisted,
Show-level capability. Delivered via `.agents/workflows/integration-pr-delivery.md`:
one integration branch `feat/scene-qc-integration`, four child PRs targeting it,
one atomic main PR to `master`. Plan: `apps/erify_api/docs/design/SCENE_QC_IMPLEMENTATION_PLAN.md`.
PRD: `docs/prd/scene-qc.md`. When reviewing any child PR, diff against
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

PR #345 predates this rewrite and will be superseded or substantially reworked.
Do not apply the "Verified-correct patterns" below as if the old model still
exists — cross-check the current `apps/erify_api/docs/design/SCENE_QC_IMPLEMENTATION_PLAN.md`
§5 for the authoritative persisted-model shape before reviewing.

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

## Recurring minor pattern to watch for regardless of scope

When a repository/service is genuinely justified (multi-row, optimistic-lock,
raw SQL, revision-append), individual shallow lookup methods on it sometimes
skip the literal `// Engineering decision:` comment tag even when a justifying
docstring exists. Treat as a non-blocking consistency note, not a blocker, when
the reasoning is evident from the docstring or from being the model's canonical
findOne/findByUid-equivalent lookup.
