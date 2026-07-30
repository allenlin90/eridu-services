# Scene QC Backend Reference

> **Status**: ✅ Implemented — Phase 5 item 23
> **Owner app**: `apps/erify_api`
> **Product contract**: [docs/features/scene-qc.md](../../../docs/features/scene-qc.md)
> **Frontend reference**: [apps/erify_studios/docs/SCENE_QC.md](../../erify_studios/docs/SCENE_QC.md)

## Purpose

Scene QC is a capability-owned, Show-anchored persisted quality-review workflow: a Client Scene Profile (expected-scene reference), Show-level review outcomes, append-only daily confirmations, records, and a manager report. It replaced the read-only, Task-anchored Scene Review implementation from PR #319, which persisted no QC outcome.

Scene QC never writes `Task`, `TaskTarget`, `Show`, `ShowStatus`, or Manager Review data. Designating a Task Template image field as Scene QC evidence rides existing Task Template write permissions (`[ADMIN, MANAGER]`) — Scene QC access never widens template administration.

## Routes

All 12 endpoints admit exactly `DESIGNER`, `MANAGER`, `ADMIN` via `@StudioProtected`, with no method-level override (asserted by `scene-qc-authorization.spec.ts`). List reads return the shared paginated envelope (`items` + `total`); studio-scoped path params use `UidValidationPipe`.

```text
GET    /studios/:studioId/scene-profiles/:clientId
PUT    /studios/:studioId/scene-profiles/:clientId
DELETE /studios/:studioId/scene-profiles/:clientId

GET    /studios/:studioId/scene-qc/summary
GET    /studios/:studioId/scene-qc/items
GET    /studios/:studioId/scene-qc/items/:showId

POST   /studios/:studioId/scene-qc-reviews
PATCH  /studios/:studioId/scene-qc-reviews/:reviewId

POST   /studios/:studioId/scene-qc-confirmations
GET    /studios/:studioId/scene-qc-confirmations/:confirmationId/report
GET    /studios/:studioId/scene-qc-confirmations/:confirmationId/report.csv

GET    /studios/:studioId/scene-qc-records
GET    /studios/:studioId/scene-qc-records/:reviewId
```

`PUT` on Scene Profile creates or replaces the Client's single profile in one version-checked call — there is no separate create/update distinction. Every daily query, review command, and confirmation request sends a date-only `operational_date`; the server resolves the exact local `06:00`–`05:59` window from `SCENE_QC_OPERATIONAL_TIMEZONE` and returns `window_start` / `window_end` / `timezone` as provenance. Clients never submit bounds or timezone.

## Persisted Model

Five tables, all under `apps/erify_api/prisma/schema.prisma`:

| Table | Key invariant |
| --- | --- |
| `SceneProfile` | At most one non-deleted row per Client, enforced by the partial unique index `scene_profiles_active_client_key` (`CREATE UNIQUE INDEX ... ON scene_profiles (client_id) WHERE deleted_at IS NULL`) — invisible to Prisma, so `migrate dev` will try to drop it; confirm its presence directly in any target environment. |
| `TaskTemplateSceneQcEvidenceRef` | Denormalizes `evidence_purpose: 'scene_qc'` per immutable Task Template snapshot (`(snapshotId, fieldKey)` unique). Written by the real Task Template save/publish path, never by a heuristic. |
| `SceneQcReview` + `SceneQcReviewEvidence` | One review head per `(showId, operationalDate)` (unique index) — a review from a prior operational date is never effective after the Show crosses the day boundary. `expectedObjectKey` / `expectedFileUrl` / `expectedSceneType` are a **snapshot-not-reference** of the Client's Scene Profile at save time: a later profile replacement never rewrites a review's expected-image context. |
| `SceneQcDailyConfirmation` + `SceneQcDailyConfirmationItem(Platform)` | Append-only: one revision number per `(studioId, operationalDate, revision)`. The confirm command takes `pg_advisory_xact_lock(hashtextextended('scene-qc-confirmation:{studioId}:{operationalDate}', 0))`, reads the max revision, and appends the next one — it never rewrites a prior revision's rows. |
| `SceneQcAuditTarget` | Capability-owned typed-FK side table on the standard `Audit` envelope (`sceneProfileId` / `sceneQcReviewId` / `sceneQcDailyConfirmationId`, `CHECK (num_nonnulls(...) = 1)`), so Scene QC's own audit-target growth never lands on the shared `audit_targets` table. |

Five migrations landed incrementally, one per child PR, and are all checked in — this capability generates no migration of its own:

```text
20260726235634_scene_qc_foundation
20260727050141_task_template_scene_qc_evidence_binding
20260727152709_scene_qc_audit_target_audit_id_index
20260727164956_scene_qc_review
20260728012640_scene_qc_daily_confirmation
```

## Evidence Resolution

`SceneQcEvidenceResolver` (`src/capabilities/scene-qc/scene-qc-evidence.resolver.ts`) is the ONLY evidence binding source:

1. finds Tasks targeted to the Show;
2. joins their immutable snapshots to `TaskTemplateSceneQcEvidenceRef` rows;
3. reads only the corresponding `task.content[fieldKey]` value;
4. accepts only values the storage service can derive a real object key from — a URL that doesn't derive back to an R2 object key is foreign content and is excluded rather than pinned and rendered unverified;
5. returns every eligible image with object key, source Task UID, field key, label, and Task version.

It never falls back to recursive URL discovery, filename matching, or provisional content-label metric matching — the heuristics the retired PR #319 Scene Review mapper used. There is no permanent heuristic compatibility path.

## Transaction Semantics

- **Review save** (`SceneQcWorkflowService.createReview` / `updateReview`, `@Transactional()`): resolves and authorizes the Show, resolves and pins the operational window, resolves evidence (rejecting if none), resolves and snapshots the Client's current Scene Profile if any, validates the result/feedback contract, replaces the draft's pinned evidence set, writes Audit — all in one transaction. After `confirmedAt` is set, the update command rejects further edits.
- **Confirmation** (`SceneQcConfirmationWorkflowService.confirmDay`, `@Transactional()`): acquires the advisory lock, recomputes the eligible Show set with no UI filters, resolves one effective review per Show, rejects incomplete/blocked scope, appends confirmation + item rows, snapshots confirmation-time Show/Client/platform report dimensions, marks newly included reviews confirmed, writes Audit.
- Confirmation state is a pure comparison of the latest confirmation's pinned scope against the current eligible set: `UNCONFIRMED` (none exists), `CURRENT` (scopes match), `STALE` (a Show was added, reactivated, moved in/out of the day, or terminally cancelled since the pinned revision).

## Cutover Scripts

Two standalone NestJS-context scripts, invoked via `ts-node -r tsconfig-paths/register` (not `tsx` — `tsx` is esbuild-based and drops `emitDecoratorMetadata`, which silently breaks NestJS constructor-injection):

- `scripts/backfill-scene-qc-evidence-refs.ts` — `--report` prints candidate Task Template image fields for operator review; the default run is a dry-run; `--apply` (requires `ALLOW_PROD=1` against a non-local database) writes `evidence_purpose: 'scene_qc'` through the real `TaskTemplateService.updateTemplateWithSnapshot` path and backfills historical-snapshot ref rows. Idempotent on replay.
- `scripts/verify-scene-qc-evidence-bindings.ts` — read-only, requires `--since YYYY-MM-DD`; exits non-zero unless every in-scope `TaskTemplateSnapshot` (referenced by a live Task on a non-deleted, Scene-QC-eligible Show at or after `--since`) is bound or intentionally excluded in `scripts/scene-qc-evidence-binding-map.ts`.

Both scripts are already committed with real operator-reviewed content and are not touched by routine Scene QC feature work.

## Source References

- Capability: `src/capabilities/scene-qc/`
- HTTP controllers: `src/capabilities/scene-qc/http/`
- Shared API types: `packages/api-types/src/scene-qc/`
- Frontend: [apps/erify_studios/docs/SCENE_QC.md](../../erify_studios/docs/SCENE_QC.md)
- Authorization: [`.agents/skills/erify-authorization/SKILL.md`](../../../.agents/skills/erify-authorization/SKILL.md)
- Operational-day pattern: [`.agents/skills/operations-review-surface/SKILL.md`](../../../.agents/skills/operations-review-surface/SKILL.md)
