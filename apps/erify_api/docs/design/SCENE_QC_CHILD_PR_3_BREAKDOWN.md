# Scene QC — Child PR 3 Implementation Breakdown (Daily Review Journey)

> **Parent plan**: [Scene QC Implementation Plan](./SCENE_QC_IMPLEMENTATION_PLAN.md) — §10 "Child PR 3"
> **Product contract**: [Scene Quality Control PRD](../../../../docs/prd/scene-qc.md)
> **Branch**: `feat/scene-qc-child-pr-3-daily-review-journey` (targets `feat/scene-qc-integration`)
> **Status**: Planning artifact — no code written yet
> **Baseline**: Child PR 1 (persistence foundation) and Child PR 2 (Scene Profile API + evidence binding) are merged into the integration branch

## 0. Scope Boundary

**In scope (this PR)**

- `SceneQcReview` + `SceneQcReviewEvidence` persistence and the `SceneQcAuditTarget` widening for `sceneQcReviewId`.
- The Scene QC **evidence resolver** (§5.2 read path — Child PR 2 shipped only the write path / ref projection).
- `GET /scene-qc/summary`, `GET /scene-qc/items`, `GET /scene-qc/items/:showId`.
- `POST /scene-qc-reviews`, `PATCH /scene-qc-reviews/:reviewId`.
- Shared `@eridu/api-types/scene-qc` daily-review contracts.
- The full Daily Review frontend journey: URL state, queue, comparison workspace, inline result form, blocked/missing/empty states, mobile layout, Save & next, optimistic-conflict handling.

**Explicitly out of scope (Child PR 4)**

- `SceneQcDailyConfirmation*` models, `POST /scene-qc-confirmations`, the advisory-lock confirmation transaction, staleness/reconfirmation.
- Records (`GET /scene-qc-records*`), the manager report, and CSV.
- Current-day-only refetch policy is *partially* in scope (see §3.6) — the Records/report half is PR 4.

**Explicitly out of scope (Main Integration PR)**

- Deleting `models/task/scene-review.*`, `StudioSceneReviewController`, `TaskRepository.findSceneReviewCandidate*`, `SCENE_REVIEW_MODE`, and `features/scene-review/`. See open question OQ-8 for what PR 3 does to the route in the meantime.

---

## 1. Backend

### 1.1 Prisma models and migration

One new generated migration, purpose-named `scene_qc_review` (no PR number, no phase label — per the repo migration-naming rule).

#### 1.1.1 New enum

```prisma
enum SceneQcResult {
  PASS
  MINOR
  FAIL
}
```

#### 1.1.2 `SceneQcReview`

```prisma
model SceneQcReview {
  id                BigInt                  @id @default(autoincrement())
  uid               String                  @unique
  showId            BigInt                  @map("show_id")
  show              Show                    @relation(fields: [showId], references: [id], onDelete: Cascade)
  // Date-only operational anchor, stored at UTC midnight. This IS the bucket
  // key (see operations-review-surface skill's date-only-column exception), so
  // `toISOString().slice(0, 10)` is the correct serializer here and only here.
  operationalDate   DateTime                @map("operational_date") @db.Date
  windowStart       DateTime                @map("window_start")
  windowEnd         DateTime                @map("window_end")
  timezone          String
  result            SceneQcResult
  feedback          String?
  reviewedById      BigInt                  @map("reviewed_by_id")
  reviewedBy        User                    @relation(fields: [reviewedById], references: [id], onDelete: Restrict)
  reviewedAt        DateTime                @map("reviewed_at")
  expectedObjectKey String?                 @map("expected_object_key")
  expectedFileUrl   String?                 @map("expected_file_url")
  expectedSceneType SceneType?              @map("expected_scene_type")
  version           Int                     @default(1)
  confirmedAt       DateTime?               @map("confirmed_at")
  createdAt         DateTime                @default(now()) @map("created_at")
  updatedAt         DateTime                @updatedAt @map("updated_at")
  evidence          SceneQcReviewEvidence[]
  auditTargets      SceneQcAuditTarget[]

  @@unique([showId, operationalDate])
  @@index([uid])
  @@index([operationalDate])
  @@index([showId])
  @@index([confirmedAt])
  @@map("scene_qc_reviews")
}
```

Notes:

- **No `deletedAt`.** There is no public delete action for a review (§7.8 — "There is no public Delete review action"). Do not add a soft-delete column "for symmetry".
- `@@unique([showId, operationalDate])` is the DB enforcement of "one review head per Show per operational date" (§5.3). It is expressible in Prisma, so it does **not** need custom SQL.
- `reviewedBy` uses `onDelete: Restrict` deliberately: a review must remain attributable. `User` is soft-deleted in practice, so this is not an operational blocker. (Contrast `Audit.actor`, which is `SetNull` because engine writes have no actor.)
- `@@index([confirmedAt])` supports Child PR 4's "mark newly included draft reviews confirmed" and the immutability check; it is cheap to add now rather than in a second migration.

#### 1.1.3 `SceneQcReviewEvidence`

```prisma
model SceneQcReviewEvidence {
  id                BigInt        @id @default(autoincrement())
  reviewId          BigInt        @map("review_id")
  review            SceneQcReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  sortOrder         Int           @map("sort_order")
  // Nullable + SetNull, plus a denormalized UID: ShowOrchestrationService hard-
  // deletes orphaned Tasks (show-orchestration.service.ts), and a required
  // cascading FK would silently erase a historical pinned-evidence row. See OQ-4.
  sourceTaskId      BigInt?       @map("source_task_id")
  sourceTask        Task?         @relation(fields: [sourceTaskId], references: [id], onDelete: SetNull)
  sourceTaskUid     String        @map("source_task_uid")
  sourceTaskVersion Int           @map("source_task_version")
  sourceFieldKey    String        @map("source_field_key")
  sourceLabel       String        @map("source_label")
  objectKey         String?       @map("object_key")
  fileUrl           String        @map("file_url")
  createdAt         DateTime      @default(now()) @map("created_at")

  @@unique([reviewId, sortOrder])
  @@index([reviewId])
  @@index([sourceTaskId])
  @@map("scene_qc_review_evidence")
}
```

- `objectKey` is **nullable** because Task content stores only a public `file_url` string, not the object key — see risk **OQ-1**. `fileUrl` is the always-present render source; `objectKey` is best-effort provenance derived by inverting `StorageService.resolvePublicFileUrl`.
- Add `sceneQcReviewEvidence SceneQcReviewEvidence[]` to `model Task`.

#### 1.1.4 `SceneQcAuditTarget` widening

Schema change (mirrors what Child PR 1 established for `sceneProfileId`):

```prisma
model SceneQcAuditTarget {
  // ...existing...
  sceneQcReviewId BigInt?        @map("scene_qc_review_id")
  sceneQcReview   SceneQcReview? @relation(fields: [sceneQcReviewId], references: [id], onDelete: Cascade)

  @@index([auditId])
  @@index([sceneProfileId])
  @@index([sceneQcReviewId])
  @@map("scene_qc_audit_targets")
}
```

Migration custom-SQL block (append inside the generated migration file):

```sql
-- CUSTOM SQL START: widen the single-target rule for Scene QC review audits
ALTER TABLE "scene_qc_audit_targets"
    DROP CONSTRAINT "scene_qc_audit_targets_single_target_check";

ALTER TABLE "scene_qc_audit_targets"
    ADD CONSTRAINT "scene_qc_audit_targets_single_target_check"
    CHECK (num_nonnulls("scene_profile_id", "scene_qc_review_id") = 1);
-- CUSTOM SQL END
```

Also update the doc comment on `SceneQcAuditTarget` in `schema.prisma`: it currently says "Child PR 3 adds `sceneQcReviewId`" — reword to "Child PR 4 adds `sceneQcDailyConfirmationId`".

#### 1.1.5 Migration hazards (must-read for the implementer)

1. **`prisma migrate dev` will try to `DROP INDEX "scene_profiles_active_client_key"`.** That partial unique index is invisible to Prisma. The `SceneProfile` model comment already warns about this. **Delete that statement from the generated migration** before committing, and keep the integration assertion that the index still exists.
2. Do not touch the existing `scene_qc_foundation` migration. The CHECK widening is a drop-and-re-add inside the **new** migration only.
3. Run `prisma format` → `prisma validate` → `prisma generate` → the official migration command. Never hand-write the DDL for the tables themselves.

### 1.2 UID prefix

Add to `packages/api-types/src/constants.ts`:

```ts
SCENE_QC_REVIEW: 'scqcr',
```

Rationale and the conflict with the plan's literal `scene_qc_review_*` are recorded in **OQ-3**.

### 1.3 Capability files to add

All under `apps/erify_api/src/capabilities/scene-qc/`. This workflow is **"Complex transactional workflow"** in the capability-refactoring skill's decision matrix (§4 of the plan already decided the private repository), so the shape is:

```text
stable facade (SceneQcWorkflowService / SceneQcQueryService)
  -> pure policy functions (result/feedback, eligibility — PR 1)
  -> private transaction-aware persistence (SceneQcRepository)
  -> private read collaborator (SceneQcEvidenceResolver)
```

| File | Kind | Responsibility | Module visibility |
| --- | --- | --- | --- |
| `scene-qc-review.repository.ts` (`SceneQcRepository`) | Injectable | Every Scene QC read projection and multi-row write. Purpose-shaped eligible-Show projection, review-head reads with evidence counts, optimistic conditional review writes, transactional evidence replacement. All access through `txHost.tx`. | **Private** — providers only, never `exports` |
| `scene-qc-evidence.resolver.ts` (`SceneQcEvidenceResolver`) | Injectable | §5.2 read path: bulk-resolve explicit image evidence for a set of Shows through Task → snapshot → `TaskTemplateSceneQcEvidenceRef` → `task.content[fieldKey]`. No heuristics, ever. | **Private** |
| `scene-qc-result.policy.ts` | Pure functions | `validateResultFeedback(result, feedback)`, `normalizeFeedback(...)`, `isReviewEditable(review)`. No Nest provider — deterministic, no runtime config (skill §6). | n/a (module-scoped export) |
| `scene-qc-query.service.ts` (`SceneQcQueryService`) | Injectable | The three GET read models. Enforces studio scope, bounded pagination, lean projections. | **Exported** (capability API) |
| `scene-qc-review-workflow.service.ts` (`SceneQcWorkflowService`) | Injectable | `createReview` / `updateReview` — the `@Transactional()` command owning §8.2 end to end. | **Exported** (capability API) |
| `schemas/scene-qc-review.schema.ts` | Schemas/DTOs | Payload types, `Prisma.*Include` constants, DTO transforms (camelCase → snake_case), `createZodDto` classes for the review commands. | n/a |
| `schemas/scene-qc-daily.schema.ts` | Schemas/DTOs | Query DTOs (`operational_date`, filters, pagination) and summary/items/detail response DTOs. | n/a |
| `http/studio-scene-qc-query.controller.ts` | Controller | `GET studios/:studioId/scene-qc/{summary,items,items/:showId}` | registered in `SceneQcHttpModule` |
| `http/studio-scene-qc-review.controller.ts` | Controller | `POST studios/:studioId/scene-qc-reviews`, `PATCH .../:reviewId` | registered in `SceneQcHttpModule` |

Wiring changes:

- `scene-qc.module.ts` — add `SceneQcRepository`, `SceneQcEvidenceResolver`, `SceneQcQueryService`, `SceneQcWorkflowService` to `providers`; add only the two services to `exports`. `SceneProfileService` is already exported and is consumed **in-module** by the workflow (step 5). No new module imports are expected beyond what already exists (`PrismaModule`, `UidGeneratorModule`, `StorageModule`, `UserModule`).
- `scene-qc-http.module.ts` — register the two new controllers. `ClientModule`/`ShowModule` are already imported (used by the profile controller); the new controllers do **not** need them (see §1.5 on Show authorization).
- `scene-qc.module.spec.ts` — extend the existing module-composition assertions (still registered transitively via `StudiosModule`, still no `AuditModule` import, repository/resolver still absent from `exports`).

### 1.4 `SceneQcAuditWriter` extension

Add one method beside `recordSceneProfileChange`, following the identical nested-create shape so the widened CHECK is structurally satisfied:

```ts
async recordSceneQcReviewChange(input: {
  action: Extract<AuditAction, 'CREATE' | 'UPDATE'>;
  actorId: bigint;
  sceneQcReviewId: bigint;
  metadata: AuditMetadata;
}): Promise<{ uid: string }>
```

Metadata contract (business fields live in normalized tables — audit metadata stays thin, per §5.5):

```text
event: 'scene_qc_review_saved'
scene_qc_review_uid, show_uid, studio_uid, actor_uid, operational_date
old_value: { result, feedback_present } | null
new_value: { result, feedback_present, evidence_count }
```

Do **not** persist raw feedback text in audit metadata — it is already a first-class column on the review.

### 1.5 Endpoint → method mapping (§6.2's five endpoints)

Authorization is uniform: `@StudioProtected([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN])` on both controllers. Unlike Scene Profile (Client-owned, needing the studio↔client linkage probe), **Shows carry `studioId` directly**, so scoping is a `show: { studio: { uid: studioId } }` predicate inside the repository — no extra linkage query.

| Endpoint | Controller method | Service method | Repository / collaborator calls |
| --- | --- | --- | --- |
| `GET /studios/:studioId/scene-qc/summary` | `StudioSceneQcQueryController.summary` | `SceneQcQueryService.getDailySummary(studioUid, operationalDate)` | `resolveOperationalWindow` → `SceneQcRepository.findEligibleShowsInWindow` (unfiltered) → `SceneQcRepository.findReviewHeadsForShows` → `SceneQcEvidenceResolver.resolveForShows` (blocked count) |
| `GET /studios/:studioId/scene-qc/items` | `.items` | `SceneQcQueryService.listDailyItems(studioUid, query)` | same window resolution → `findEligibleShowsInWindow` **with** `client_id` / `platform_id` / `search` predicates → evidence resolve → in-memory `review_state` filter + sort + page slice |
| `GET /studios/:studioId/scene-qc/items/:showId` | `.itemDetail` | `SceneQcQueryService.getDailyItemDetail(studioUid, showUid, operationalDate)` | `findEligibleShowForReview` → `SceneQcEvidenceResolver.resolveForShows([showId])` → `SceneProfileService.getActiveProfileForClient` → `findReviewByShowAndDate(..., { includeEvidence: true })` |
| `POST /studios/:studioId/scene-qc-reviews` | `StudioSceneQcReviewController.create` | `SceneQcWorkflowService.createReview(studioUid, payload, context)` | §8.2 chain below |
| `PATCH /studios/:studioId/scene-qc-reviews/:reviewId` | `.update` | `SceneQcWorkflowService.updateReview(studioUid, reviewUid, payload, context)` | §8.2 chain below |

`:showId` and `:reviewId` path params use `UidValidationPipe` (`ShowService.UID_PREFIX`, `UID_PREFIXES.SCENE_QC_REVIEW`). All three GETs carry `@ReadBurstThrottle()`. All responses go through `@ZodResponse(...)`.

### 1.6 `SceneQcRepository` surface

Every method resolves through `txHost.tx`. Nothing returns or accepts a `Prisma.*` argument type across the class boundary — inputs are explicit domain parameters, outputs are declared read-model types.

```ts
// --- Reads -----------------------------------------------------------------
findEligibleShowsInWindow(input: {
  studioUid: string;
  windowStart: Date;
  windowEnd: Date;
  clientUid?: string;
  platformUid?: string;
  search?: string;
}): Promise<EligibleShowRow[]>          // lean: id, uid, name, startTime,
                                        // statusSystemKey, client{id,uid,name},
                                        // platforms[{uid,name}]

findEligibleShowForReview(input: {
  studioUid: string; showUid: string;
}): Promise<EligibleShowRow | null>

findReviewHeadsForShows(input: {
  showIds: bigint[]; operationalDate: Date;
}): Promise<ReviewHeadRow[]>            // + reviewer {uid,name}, + _count.evidence

findReviewByShowAndDate(input: {
  showId: bigint; operationalDate: Date; includeEvidence?: boolean;
}): Promise<SceneQcReviewRecord | null>

findReviewForUpdate(input: {
  studioUid: string; reviewUid: string;
}): Promise<SceneQcReviewRecord | null> // includes show + client + evidence

// --- Writes ----------------------------------------------------------------
createReviewWithEvidence(input: CreateReviewPersistenceInput): Promise<SceneQcReviewRecord>

replaceReviewWithEvidence(input: {
  reviewId: bigint;
  expectedVersion: number;
  data: ReviewMutablePersistenceFields;
  evidence: PinnedEvidenceInput[];
}): Promise<SceneQcReviewRecord | null> // null == optimistic conflict
```

Persistence rules the repository owns:

- `createReviewWithEvidence` uses a nested `evidence: { create: [...] }` so the head and its pins are one statement. A `P2002` on `(showId, operationalDate)` maps to a 409 in the workflow (concurrent create race).
- `replaceReviewWithEvidence` does `updateMany({ where: { id, version: expectedVersion, confirmedAt: null }, data: { ..., version: { increment: 1 } } })` → if `count === 0`, return `null` (the workflow decides 409 vs 403 by re-reading). Then `deleteMany({ where: { reviewId } })` + `createMany` for the new pin set, then re-read with includes. All inside the ambient transaction.
- `findEligibleShowsInWindow` applies: `deletedAt: null`, `studio: { uid }`, `startTime: { gte: windowStart, lt: windowEnd }` (half-open, matching `isShowEligibleForSceneQc`), and `showStatus: { systemKey: { notIn: SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS } }`. Because `systemKey` is nullable and the policy treats `null` as eligible, the predicate must be `OR: [{ showStatus: { systemKey: null } }, { showStatus: { systemKey: { notIn: [...] } } }]` — a bare `notIn` silently drops `NULL` rows in SQL.
- Bounded input: `limit` capped at 50 in the query schema; the eligible-show projection is naturally bounded by shows-per-day.

**Architecture note requiring reviewer sign-off (OQ-9):** `findEligibleShowsInWindow` and the evidence resolver read `txHost.tx.show` / `txHost.tx.task` — tables owned by other capabilities. This is a deliberate **read-only, capability-local, purpose-shaped projection**, chosen over injecting the exported `ShowRepository` (which would spread Scene QC window/eligibility semantics into `models/show` and work against RT-05). Scene QC never writes those tables. Record the decision and the RT-01/RT-05/RT-06 preflight outcome in the PR description, as Child PR 1 did for the audit side table.

### 1.7 `SceneQcEvidenceResolver`

One bulk API — never per-Show in a loop (§ "Prefer bulk DB operations… over N+1"):

```ts
resolveForShows(showIds: bigint[]): Promise<Map<bigint, ResolvedEvidence[]>>
```

Implementation, matching §5.2's six numbered rules:

1. One `task.findMany` where `deletedAt: null`, `targets: { some: { targetType: 'SHOW', showId: { in: showIds }, deletedAt: null } }`, `snapshotId: { not: null }`.
2. `select` only: `id, uid, version, content, targets: { select: { showId } }, snapshot: { select: { sceneQcEvidenceRefs: { select: { fieldKey, label } } } }`. The join to explicit refs is the **only** binding source; the snapshot JSON is never re-parsed for discovery.
3. For each ref, read `content[fieldKey]`. Accept only a `string` that parses as an `https:`/`http:` URL (reuse the existing `isSafeRemoteUrl` predicate, relocated into the resolver — do **not** import from `models/task/scene-review.mapper.ts`, which the main PR deletes).
4. Derive `objectKey` via a new `StorageService.deriveObjectKeyFromPublicUrl(fileUrl): string | null` (the inverse of `resolvePublicFileUrl`: strip the configured public base, split on `/`, `decodeURIComponent` each segment). `null` is tolerated (**OQ-1**).
5. Emit `{ sourceTaskId, sourceTaskUid, sourceTaskVersion, sourceFieldKey, sourceLabel, objectKey, fileUrl }`.
6. **Deterministic `sortOrder`**: sort by `(task.uid ASC, fieldKey ASC)` and assign a 0-based index. Dedupe by `fileUrl` within a Show so the same asset bound twice yields one evidence row. (**OQ-16** — the plan does not specify an ordering rule.)

No recursive URL discovery, no filename matching, no metric-label matching. The old `findFallbackEvidence` / `IMAGE_EXTENSION_PATTERN` heuristics must not be copied forward.

### 1.8 §8.1 Operational Scope → code

| §8.1 step | Owner |
| --- | --- |
| 1. Validate date-only value, resolve one operational day | Zod `operationalDateSchema` at the transport boundary (400) + `resolveOperationalWindow(date, OPERATIONAL_TIMEZONE)` in the service (defense-in-depth `INVALID_OPERATIONAL_DATE`) |
| 2. Load non-deleted Shows in the studio within bounds | `SceneQcRepository.findEligibleShowsInWindow` |
| 3. Exclude terminal `cancelled` | `SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS` (Child PR 1) — as a SQL predicate in the repository, with `isSceneQcEligibleShowStatus` asserting the same rule in tests |
| 4. Include `cancelled_pending_resolution` | same deny-list; nothing to add |
| 5. No Task status / Manager Review filter | negative assertion in the query-service spec |
| Summary & confirmation use the **unfiltered** set; list filters affect only visible rows | `getDailySummary` never receives filter params; `listDailyItems` takes them. Enforced by the method signatures, not by a runtime flag. |

### 1.9 §8.2 Review Save Transaction → code

`SceneQcWorkflowService.createReview` / `.updateReview`, both `@Transactional()`. The transaction boundary is the workflow method (skill §3 — transaction ownership at the application workflow).

| §8.2 step | Class / function |
| --- | --- |
| 1. Lock or optimistic-check the review head | **create**: no head yet; the `@@unique([showId, operationalDate])` constraint is the race guard (`P2002` → 409). **update**: `SceneQcRepository.findReviewForUpdate` then `replaceReviewWithEvidence`'s `where: { version: expectedVersion }` conditional write. No `SELECT … FOR UPDATE` and no advisory lock — a single-row optimistic check is sufficient here; the advisory lock belongs to Child PR 4's cross-row confirmation. |
| 2. Resolve and authorize the Show within the studio | `@StudioProtected` guard (role) + `SceneQcRepository.findEligibleShowForReview({ studioUid, showUid })` → `null` ⇒ `HttpError.notFound('Show')` |
| 3. Resolve and pin operational date/window; reject terminally cancelled or out-of-window context | `resolveOperationalWindow(...)` + `isShowEligibleForSceneQc(show, window)` (pure, Child PR 1) ⇒ `HttpError.badRequest`/`conflict` on failure. Pins `windowStart`, `windowEnd`, `timezone`, `operationalDate` onto the row. |
| 4. Resolve explicit image evidence; require ≥ 1 | `SceneQcEvidenceResolver.resolveForShows([show.id])` ⇒ empty ⇒ `HttpError.unprocessableEntity`/`badRequest` ("This Show has no Scene QC evidence and cannot be reviewed") |
| 5. Resolve the Client's current Scene Profile and snapshot it | `SceneProfileService.getActiveProfileForClient(show.client.uid)` → copy `objectKey` / `fileUrl` / `sceneType` into `expected*`; `null` ⇒ all three stay `null` |
| 6. Validate result and feedback contract | `validateResultFeedback(result, feedback)` in `scene-qc-result.policy.ts` (also enforced by the shared Zod schema — belt and braces, per PR 3's exit criterion) |
| 7. Create or update the draft review and replace its pinned evidence | `SceneQcRepository.createReviewWithEvidence` / `replaceReviewWithEvidence` |
| 8. Write Audit | `SceneQcAuditWriter.recordSceneQcReviewChange` (CREATE / UPDATE) |
| 9. Commit, then invalidate frontend query families | `@Transactional()` commit; FE invalidation in `useSaveSceneQcReview.onSuccess` (§3.4) |

Additional workflow guards not numbered in §8.2 but required by §5.3:

- `confirmedAt !== null` ⇒ reject the update (`HttpError.conflict('This review has been confirmed and can no longer be edited.')`). Checked in the workflow *and* in the `updateMany` predicate (`confirmedAt: null`) so a race cannot slip through.
- `reviewedById` / `reviewedAt` are set to the current actor and `new Date()` on **every accepted save** (create and update), including a save that does not change `result` (**OQ-14**).
- Negative guarantee: the workflow imports no Task/Show/ShowStatus **write** path. Assert this with a spec that the injected collaborator list contains no writer.

---

## 2. Shared API Types

New file `packages/api-types/src/scene-qc/daily-review.schemas.ts`, re-exported from `packages/api-types/src/scene-qc/index.ts`. Keeping it separate from `schemas.ts` (Scene Profile) prevents one oversized module and mirrors how PR 4 will add `records.schemas.ts`.

Conventions to follow (already established in `schemas.ts`): snake_case fields, `z.string().startsWith(UID_PREFIXES.X)` for identifiers, `z.iso.datetime()` for instants, `createPaginatedResponseSchema` from `../pagination/schemas.js` for list envelopes, `as const` object + derived `z.enum` for enums.

### 2.1 Constants and enums

```ts
export const SCENE_QC_RESULT = { PASS: 'PASS', MINOR: 'MINOR', FAIL: 'FAIL' } as const;
export const SCENE_QC_REVIEW_STATE = { ALL: 'all', UNREVIEWED: 'unreviewed', REVIEWED: 'reviewed', BLOCKED: 'blocked' } as const;
export const SCENE_QC_CONFIRMATION_STATE = { UNCONFIRMED: 'UNCONFIRMED', CURRENT: 'CURRENT', STALE: 'STALE' } as const;

// Hoisted so the browser can compute the DEFAULT operational date in the same
// zone the server resolves windows in. See OQ-10.
export const SCENE_QC_OPERATIONAL_TIMEZONE = 'Asia/Bangkok';
export const SCENE_QC_OPERATIONAL_DAY_START_HOUR = 6;

export const operationalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
```

`apps/erify_api/src/capabilities/scene-qc/scene-qc-operational-window.util.ts` must be changed to **re-export** `SCENE_QC_OPERATIONAL_TIMEZONE` as its `OPERATIONAL_TIMEZONE` rather than declaring the literal, so there is exactly one source of truth. Leave `OPERATIONAL_DAY_START_HOUR` sourced from `@/lib/utils/operational-day.util` as today, and add a unit assertion that the two constants agree.

### 2.2 Query schemas

```ts
export const sceneQcSummaryQuerySchema = z.object({ operational_date: operationalDateSchema });

export const sceneQcItemsQuerySchema = paginationBaseSchema.extend({
  operational_date: operationalDateSchema,
  client_id:   z.string().startsWith(UID_PREFIXES.CLIENT).optional(),
  platform_id: z.string().startsWith(UID_PREFIXES.PLATFORM).optional(),
  review_state: sceneQcReviewStateSchema.default(SCENE_QC_REVIEW_STATE.ALL),
  search:      z.string().trim().min(1).max(100).optional(),
  limit:       z.coerce.number().int().min(1).max(50).default(20),
});

export const sceneQcItemDetailQuerySchema = z.object({ operational_date: operationalDateSchema });
```

### 2.3 Response schemas

```ts
export const sceneQcOperationalWindowSchema = z.object({
  operational_date: operationalDateSchema,
  window_start: z.iso.datetime(),
  window_end:   z.iso.datetime(),
  timezone:     z.string().min(1),
});

export const sceneQcDailySummarySchema = sceneQcOperationalWindowSchema.extend({
  eligible_count: z.number().int().min(0),
  reviewed_count: z.number().int().min(0),
  pass_count: z.number().int().min(0),
  minor_count: z.number().int().min(0),
  fail_count: z.number().int().min(0),
  blocked_no_evidence_count: z.number().int().min(0),
  remaining_count: z.number().int().min(0),
  // Child PR 4 populates these. PR 3 always returns UNCONFIRMED / nulls so the
  // contract is additive-stable. See OQ-6.
  confirmation: sceneQcConfirmationStateSchema,
  confirmation_id: z.string().nullable(),
  confirmation_revision: z.number().int().nullable(),
  confirmed_by: z.object({ id: z.string(), name: z.string() }).nullable(),
  confirmed_at: z.iso.datetime().nullable(),
});

export const sceneQcDailyItemSchema = z.object({
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  show_name: z.string(),
  scheduled_start_time: z.iso.datetime(),
  client: z.object({ id: ..., name: z.string() }).nullable(),
  platforms: z.array(z.object({ id: ..., name: z.string() })),
  evidence_count: z.number().int().min(0),
  has_scene_profile: z.boolean(),
  is_blocked: z.boolean(),
  result: sceneQcResultSchema.nullable(),
  has_feedback: z.boolean(),
  reviewed_by: z.object({ id: ..., name: z.string() }).nullable(),
  reviewed_at: z.iso.datetime().nullable(),
  review_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_REVIEW).nullable(),
  review_version: z.number().int().nullable(),
  is_confirmed: z.boolean(),
});

export const sceneQcDailyItemsResponseSchema = createPaginatedResponseSchema(sceneQcDailyItemSchema);

export const sceneQcEvidenceSchema = z.object({
  sort_order: z.number().int().min(0),
  source_task_id: z.string().startsWith(UID_PREFIXES.TASK),
  source_task_version: z.number().int(),
  source_field_key: z.string(),
  label: z.string(),
  object_key: z.string().nullable(),
  file_url: z.string().min(1),
});

export const sceneQcExpectedReferenceSchema = z.object({
  object_key: z.string().nullable(),
  file_url: z.string().min(1),
  scene_type: sceneTypeSchema,
});

export const sceneQcReviewSchema = sceneQcOperationalWindowSchema.extend({
  id: z.string().startsWith(UID_PREFIXES.SCENE_QC_REVIEW),
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  result: sceneQcResultSchema,
  feedback: z.string().nullable(),
  reviewed_by: z.object({ id: ..., name: z.string() }),
  reviewed_at: z.iso.datetime(),
  expected_reference: sceneQcExpectedReferenceSchema.nullable(),
  version: z.number().int(),
  confirmed_at: z.iso.datetime().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  evidence: z.array(sceneQcEvidenceSchema),
});

export const sceneQcDailyItemDetailSchema = z.object({
  show: z.object({ id, name, scheduled_start_time, client, platforms }),
  operational_window: sceneQcOperationalWindowSchema,
  evidence: z.array(sceneQcEvidenceSchema),          // LIVE, re-resolved
  scene_profile: sceneQcExpectedReferenceSchema.nullable(),
  review: sceneQcReviewSchema.nullable(),
  allowed_actions: z.object({
    can_review: z.boolean(),
    blocked_reason: z.enum(['NO_EVIDENCE', 'CONFIRMED', 'NOT_ELIGIBLE']).nullable(),
  }),
});
```

Note `expected_reference` groups the three `expected*` columns into one nullable object at the API boundary — cleaner for the frontend than three independently-nullable fields, and it makes "the profile existed at save time" a single check.

### 2.4 Command schemas

```ts
const feedbackRule = (data, ctx) => {
  const needsFeedback = data.result === 'MINOR' || data.result === 'FAIL';
  const provided = (data.feedback ?? '').trim().length > 0;
  if (needsFeedback && !provided) ctx.addIssue({ path: ['feedback'], message: '…required…' });
  if (!needsFeedback && provided) { /* allowed but normalized to null server-side */ }
};

export const createSceneQcReviewInputSchema = z.object({
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  operational_date: operationalDateSchema,
  result: sceneQcResultSchema,
  feedback: z.string().trim().max(2000).nullish(),
}).superRefine(feedbackRule);

export const updateSceneQcReviewInputSchema = z.object({
  result: sceneQcResultSchema,
  feedback: z.string().trim().max(2000).nullish(),
  version: z.number().int().positive(),
}).superRefine(feedbackRule);
```

The update contract deliberately omits `show_id` / `operational_date` — `:reviewId` already identifies the pinned Show and date, and re-accepting them would invite a client to re-anchor a review. See **OQ-15**.

Backend-side transforms (snake → camel payloads, `createZodDto` classes) live in `apps/erify_api/src/capabilities/scene-qc/schemas/`, exactly as `scene-profile.schema.ts` does today.

---

## 3. Frontend (`apps/erify_studios`)

### 3.1 Routes

| File | Change |
| --- | --- |
| `src/routes/studios/$studioId/scene-review.tsx` | Unchanged (layout + `StudioRouteGuard` already correct) |
| `src/routes/studios/$studioId/scene-review/index.tsx` | **Rewritten**: `validateSearch` uses the new `sceneQcDailySearchSchema`; renders `<SceneQcDailyWorkspace />`; keeps the existing **Manage Scene Profiles** action button. The old `useSceneReviewPage` / `SceneReviewWorkspace` imports are dropped. See **OQ-8**. |
| `src/routes/studios/$studioId/scene-review/profiles.tsx` | Unchanged |

### 3.2 URL state (§7.1)

`src/features/scene-qc/config/scene-qc-daily-search-schema.ts`:

```ts
export const sceneQcDailySearchSchema = z.object({
  tab: z.enum(['daily', 'records']).catch('daily'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined), // undefined ⇒ current operational day
  client_id: z.string().startsWith('client_').optional().catch(undefined),
  platform_id: z.string().startsWith('plt_').optional().catch(undefined),
  review_state: z.enum(['all', 'unreviewed', 'reviewed', 'blocked']).catch('all'),
  show_id: z.string().startsWith('show_').optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(20),
});
```

- `.catch(...)` on every field matches the shipped `sceneProfileSearchSchema` / `sceneReviewSearchSchema` convention: an invalid selection degrades rather than throwing.
- Changing any scope filter (`date`, `client_id`, `platform_id`, `review_state`, `search`) resets `page: 1` **and** clears `show_id`. Changing `page` clears `show_id`. This is the `changeScope` helper pattern already used by `use-scene-review-page.ts`.
- `tab=records` renders a disabled/placeholder tab in this PR (**OQ-7**).
- `date` left `undefined` in the URL means "current operational day"; the hook resolves it via `getCurrentOperationalDate()` (§3.3) and writes it into the URL on first navigation so back/forward is stable.

### 3.3 New feature files

Under `apps/erify_studios/src/features/scene-qc/`, extending — not duplicating — Child PR 2's structure.

**`api/scene-qc-query-keys.ts`** — extend the existing factory in place:

```ts
export const sceneQcKeys = {
  all: ['scene-qc'] as const,
  profilePrefix: (studioId) => [...],           // existing, untouched
  profile: (studioId, clientId) => [...],       // existing, untouched
  dailyPrefix: (studioId: string) => [...sceneQcKeys.all, 'daily', studioId] as const,
  summary: (studioId, date) => [...sceneQcKeys.dailyPrefix(studioId), 'summary', date] as const,
  itemsPrefix: (studioId, date) => [...sceneQcKeys.dailyPrefix(studioId), 'items', date] as const,
  items: (studioId, date, filters) => [...sceneQcKeys.itemsPrefix(studioId, date), filters] as const,
  itemDetail: (studioId, date, showId) => [...sceneQcKeys.dailyPrefix(studioId), 'item', date, showId] as const,
} as const;
```

**`api/`**

| File | Contents |
| --- | --- |
| `get-scene-qc-summary.ts` | `getSceneQcSummary()` + `useSceneQcSummaryQuery(studioId, date, { isCurrentDay })` — `refetchInterval: isCurrentDay ? OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS : false`, `refetchIntervalInBackground: false` (mirrors `get-show-run-review-summary.ts`) |
| `get-scene-qc-items.ts` | `useSceneQcItemsQuery(studioId, params, { isCurrentDay })` — same refetch policy, `placeholderData: keepPreviousData` for pagination |
| `get-scene-qc-item-detail.ts` | `useSceneQcItemDetailQuery(studioId, date, showId)` — `enabled: Boolean(showId)` (§8.4 "Detail is enabled only with a valid selected Show") |
| `save-scene-qc-review.ts` | `useCreateSceneQcReview` / `useUpdateSceneQcReview`, sharing one `onSuccess` that invalidates `summary`, `itemsPrefix(studioId, date)`, and `itemDetail(...)`. **Must not** touch task/show caches (§8.4) — assert this in a test the way `scene-qc-mutations-invalidation.test.tsx` already does for the profile mutations. |

**`lib/scene-qc-operational-date.ts`** — `getCurrentOperationalDate()` and `shiftOperationalDate(date, ±1)`, computed with `Intl.DateTimeFormat(… { timeZone: SCENE_QC_OPERATIONAL_TIMEZONE })` and a `SCENE_QC_OPERATIONAL_DAY_START_HOUR` rollback. **Do not** reuse `@/lib/operational-day-range`'s `toOperationalDateInputValue` — it reads the *browser's* local calendar and would violate §12.3's "date selection uses the server-returned operational-timezone window rather than the browser timezone".

**`hooks/`**

| File | Responsibility |
| --- | --- |
| `use-scene-qc-daily.ts` | View-model: resolves the effective date, builds list params, runs the three queries, derives `isCurrentDay`, owns `selectShow`, `changeScope`, `changePage`, `goToPreviousDay/NextDay/Today`, and `saveAndNext` (picks the next `unreviewed` row from the current page, falling back to focusing the confirmation region when none remains) |
| `use-scene-qc-review-form.ts` | Local draft form state: `result`, `feedback`, `dirty`. **Resets on `show_id` change only** — never on evidence/reference selection (§12.3: "changing evidence or expected reference does not lose draft result text"). On a 409 it **preserves the typed feedback**, refetches the detail, and surfaces an explicit retry (§7.3 last row). Use the latest-ref guard already established in `use-scene-profile-editor.ts` so a slow in-flight save cannot clobber a newer selection. |

**`components/`**

| Component | §7 mapping |
| --- | --- |
| `scene-qc-daily-workspace.tsx` | Container. Keep under 200 LOC — it composes only; queries live in the hook, presentation config in the child components. |
| `scene-qc-daily-toolbar.tsx` | §7.2 (1) — title area actions, prev/today/next operational-date navigation, `Manage Scene Profiles` link |
| `scene-qc-tabs.tsx` | §7.2 (2) — Daily Review / Records (Records disabled this PR) |
| `scene-qc-summary-cards.tsx` | §7.2 (3) — total / reviewed / remaining / blockers / confirmation state. Pure presentation over the summary response. |
| `scene-qc-filter-fields.tsx` | §7.2 (4) — Client async combobox (reuse the existing pattern from `use-scene-profile-client-options.ts`), platform select, review-state select, search input. `ALL` maps to `undefined`, never a literal in the URL. |
| `scene-qc-show-queue.tsx` + `scene-qc-queue-row.tsx` | §7.2 (5 left) — scheduled time, Show, Client, platforms, evidence count, one state chip (Unreviewed / Pass / Minor / Fail / Blocked) with a **text label plus color** (§7.8). Selected row stays visible while the workspace loads. |
| `scene-qc-review-panel.tsx` | §7.2 (5 right) — orchestrates comparison + form + blocked panel |
| `scene-qc-evidence-comparison.tsx` | §7.2 (6) — desktop side-by-side Live vs Expected; reuses the shared evidence viewer (zoom/fit) where it fits |
| `scene-qc-evidence-selector.tsx` | thumbnail strip + labels, keyboard reachable (§7.8) |
| `scene-qc-expected-reference-panel.tsx` | Expected side; renders the missing-profile warning above an empty panel |
| `scene-qc-result-form.tsx` | §7.2 (7–8) — Pass/Minor/Fail, inline required feedback for Minor/Fail, **Image blank or not viewable** shortcut (selects Fail + focuses feedback, never auto-saves), Save & next with pending state and duplicate-submit prevention |
| `scene-qc-blocked-panel.tsx` | §7.3 row 2 — replaces the result form; names the missing upstream evidence requirement; no Pass/Minor/Fail controls |
| `scene-qc-image-frame.tsx` | `onError` → retry / open-original controls; **never** auto-selects Fail (§7.3 row 3, §12.3) |
| `scene-qc-empty-states.tsx` | §7.3 rows 1 and 5 — day-empty vs filtered-empty (the summary still describes the full day) |
| `scene-qc-mobile-drawer.tsx` | §7.4 — full-height drawer: Show context → Live/Expected segmented toggle → image + selector → result controls → inline feedback → sticky Save & next. No compressed two-column view, no swipe gestures. |

`useIsMobile()` from `@eridu/ui/hooks/use-is-mobile` drives desktop-vs-drawer, matching `use-scene-review-page.ts`. On desktop the hook auto-selects the first queue row when `show_id` is absent; on mobile it does not (same guard as the shipped hook).

### 3.4 §7.3 state → component mapping

| §7.3 state | Rendered by | Data condition |
| --- | --- | --- |
| No Shows in the operational day | `scene-qc-empty-states` (day empty) | `summary.eligible_count === 0` |
| No evidence record | `scene-qc-blocked-panel` | `detail.allowed_actions.blocked_reason === 'NO_EVIDENCE'` |
| Evidence fails to render | `scene-qc-image-frame` + preserved `scene-qc-result-form` | local `onError` |
| No Scene Profile | `scene-qc-expected-reference-panel` warning | `detail.scene_profile === null` |
| Filter returns no rows | `scene-qc-empty-states` (filtered empty) | `items.meta.total === 0 && filtersActive` |
| Incomplete day | `scene-qc-summary-cards` (confirm action disabled + reason) | `remaining_count > 0 \|\| blocked_no_evidence_count > 0` |
| Current / stale confirmation | **Child PR 4** — PR 3 renders the `UNCONFIRMED` case only | — |
| Optimistic conflict | `use-scene-qc-review-form` + inline alert | mutation 409 |

### 3.5 i18n

Add message keys to the Paraglide catalogue as the shipped `scene_profiles_*` keys did. Per the repo's recorded decision, inline English in `erify_studios` is acceptable where the surrounding feature already does it — match whatever `features/scene-qc` currently does rather than introducing a second convention.

### 3.6 Refresh policy (§8.4, PR 3's half)

- Current operational day: summary + items poll at `OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS` (5 min), foreground only.
- Historical days: no polling.
- Detail: `enabled` only with a selected Show.
- Mutations invalidate exactly the Scene QC daily key families.
- Scene Profile mutations (PR 2) should additionally invalidate `sceneQcKeys.dailyPrefix(studioId)` so a newly created profile clears the "no Scene Profile" warning — a small addition to the existing `save-scene-profile.ts` / `retire-scene-profile.ts` `onSuccess`.

---

## 4. Test Plan

### 4.1 Backend unit specs (this PR's §12.2 responsibilities)

| §12.2 scenario | Spec file |
| --- | --- |
| Explicit evidence resolution returns every designated image and no undesignated image | `scene-qc-evidence.resolver.spec.ts` |
| Zero-evidence Show counts as blocked and review create fails | `scene-qc-query.service.spec.ts` (blocked count) + `scene-qc-review-workflow.service.spec.ts` (create rejection) |
| Pass accepts empty feedback; Minor and Fail reject empty feedback | `scene-qc-result.policy.spec.ts` (pure), `packages/api-types` schema spec, and `scene-qc-review-workflow.service.spec.ts` |
| A draft update pins current evidence + the Client's current profile snapshot and increments version | `scene-qc-review-workflow.service.spec.ts` |
| Moving a Show across the 06:00 boundary makes the prior-date review ineffective and permits a new review for the new date | `scene-qc-review-workflow.service.spec.ts` + `scene-qc-query.service.spec.ts` |
| A confirmed review rejects normal edits | `scene-qc-review-workflow.service.spec.ts` |
| Terminal `cancelled` excluded, `cancelled_pending_resolution` included | `scene-qc-query.service.spec.ts` (the pure policy is already covered by Child PR 1) |
| Filtered items and the unfiltered summary use different scopes | `scene-qc-query.service.spec.ts` |
| Each allowed role can read and review; excluded roles fail | `studio-scene-qc-query.controller.spec.ts`, `studio-scene-qc-review.controller.spec.ts` |
| No Scene QC mutation writes Task/Show state | `scene-qc-review-workflow.service.spec.ts` (collaborator/negative assertion) |
| Module composition unchanged (no `AuditModule`, repository not exported) | extend `scene-qc.module.spec.ts` |

Test altitude: assert behavior and contracts. Keep repository mock-argument assertions minimal — soft-delete/tenant/status-exclusion predicates and branch selection only, not full ORM plumbing.

`objectKey` derivation gets its own focused spec on the new `StorageService.deriveObjectKeyFromPublicUrl` (round-trip against `resolvePublicFileUrl`, including percent-encoded segments, plus a non-matching base returning `null`).

### 4.2 Backend real-DB integration gate (required)

This PR adds a new `@Transactional()` multi-row write and changes Nest module composition, so the guarded gate applies. Run `pnpm -C apps/erify_api test:integration` and record the result in the PR.

New: `apps/erify_api/test/integration/scene-qc-review-persistence.integration-spec.ts`

1. `@@unique([showId, operationalDate])` rejects a second review head for the same Show and date.
2. The widened CHECK accepts a review-only target row, still accepts a profile-only row, and rejects both-null and both-set.
3. Review head + evidence rows + `Audit` + `SceneQcAuditTarget` all commit together; an error thrown after the evidence write rolls back **all four** (§12.2 "review rollback leaves no partial Audit or pinned-child rows").
4. Evidence replacement on update deletes the prior pin set inside the same transaction (read-your-own-writes).
5. Optimistic version conflict: a stale `expectedVersion` produces no write and no audit row.
6. Regression: `scene_profiles_active_client_key` still exists after this migration (guards the `migrate dev` DROP-INDEX hazard from §1.1.5).

### 4.3 Frontend tests (§12.3 responsibilities)

| §12.3 scenario | Test file |
| --- | --- |
| Default date is the current operational day; prev/next/date selection preserve correct bounds | `lib/__tests__/scene-qc-operational-date.test.ts` + `hooks/__tests__/use-scene-qc-daily.test.tsx` |
| Date selection uses the server-returned window, not the browser timezone | `lib/__tests__/scene-qc-operational-date.test.ts` (fake browser TZ) |
| URL back/forward restores filters, pagination, selected Show | `config/__tests__/scene-qc-daily-search-schema.test.ts` + hook test |
| Queue loading / empty / error / filtered-empty / blocked / selected states render | `components/__tests__/scene-qc-show-queue.test.tsx`, `scene-qc-daily-workspace.test.tsx` |
| Desktop side-by-side and mobile Live/Expected keep the form adjacent | `components/__tests__/scene-qc-review-panel.test.tsx`, `scene-qc-mobile-drawer.test.tsx` |
| Changing evidence or expected reference does not lose draft result text | `hooks/__tests__/use-scene-qc-review-form.test.tsx` |
| No-evidence state removes result controls | `components/__tests__/scene-qc-blocked-panel.test.tsx` |
| Missing-profile state preserves result controls | `components/__tests__/scene-qc-expected-reference-panel.test.tsx` |
| Image load failure offers retry and explicit Fail but does not auto-submit | `components/__tests__/scene-qc-image-frame.test.tsx` |
| Minor/Fail focus inline feedback validation | `components/__tests__/scene-qc-result-form.test.tsx` |
| Save & next selects the next unreviewed Show | `hooks/__tests__/use-scene-qc-daily.test.tsx` |
| Optimistic conflict preserves typed feedback before refresh | `hooks/__tests__/use-scene-qc-review-form.test.tsx` |
| Mutations invalidate exactly the Scene QC key families | extend `api/__tests__/scene-qc-mutations-invalidation.test.tsx` |

**Not this PR**: Records pagination/detail, CSV export, and confirmation-state action tests.

### 4.4 Rendered evidence (§12.4 subset)

Capture Playwright desktop + mobile screenshots for: daily queue with a selected side-by-side review; no-evidence blocker; missing Scene Profile warning; Minor/Fail feedback. Confirmation, stale-day, Records, and report shots belong to Child PR 4.

### 4.5 Verification commands

```bash
pnpm --filter @eridu/api-types lint && pnpm --filter @eridu/api-types typecheck && pnpm --filter @eridu/api-types test && pnpm --filter @eridu/api-types build
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test && pnpm --filter erify_api build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
pnpm -C apps/erify_api test:integration     # guarded real-DB gate — record the result
pnpm architecture:signals                    # compare to the committed baseline
pnpm lint:markdown
```

`architecture:signals` will show +0 Nest modules (no new module), +1 repository, +0 exported repositories. Note that delta in the PR.

---

## 5. Sequencing

Linear order that avoids rework. Each step ends with something verifiable.

1. **Shared contracts first.** Add `SCENE_QC_REVIEW: 'scqcr'` to `constants.ts`; create `daily-review.schemas.ts`; hoist the timezone/start-hour constants; re-export from the scene-qc index. → `pnpm --filter @eridu/api-types test build`. *Why first: both the backend DTOs and the frontend API layer type against these; changing them later ripples everywhere.*
2. **Prisma + migration.** Add the enum and both models, widen `SceneQcAuditTarget`, generate the migration, strip the spurious `DROP INDEX`, append the CUSTOM SQL CHECK swap. → `prisma format/validate/generate` + apply locally.
3. **Storage inverse.** `StorageService.deriveObjectKeyFromPublicUrl` + spec. *Small, self-contained, unblocks the resolver.*
4. **Evidence resolver** + spec. *Pure-ish read path; provable before any write path exists.*
5. **Result policy** (pure) + spec.
6. **`SceneQcRepository`** — reads first (`findEligibleShowsInWindow`, `findReviewHeadsForShows`), then writes.
7. **`SceneQcWorkflowService`** + `SceneQcAuditWriter.recordSceneQcReviewChange` + spec. Wire the §8.2 chain end to end.
8. **`SceneQcQueryService`** + spec. (After the workflow, so summary/items can be tested against real review shapes.)
9. **Backend schemas/DTOs + both controllers + module wiring** + controller specs + `scene-qc.module.spec.ts` update. → `pnpm --filter erify_api lint typecheck test build`.
10. **Real-DB integration spec** (§4.2). *Runs against the finished transaction; writing it earlier means rewriting it.*
11. **Frontend data layer**: search schema, query-key extension, four `api/` modules, `scene-qc-operational-date.ts`, plus their tests.
12. **Frontend desktop UI**: workspace container → toolbar/tabs → summary cards → filters → queue → review panel → comparison/selector/expected → result form → blocked panel → empty states.
13. **Frontend mobile**: drawer + segmented toggle + sticky save.
14. **Frontend tests** for the components/hooks added in 12–13; extend the invalidation test.
15. **Route swap**: repoint `scene-review/index.tsx` at the new workspace (**OQ-8**).
16. **Verification sweep** (§4.5) + Playwright evidence + PR description with the refactoring-target preflight (RT-01, RT-05, RT-06), migration notes, and the integration-gate result.

Steps 4–9 each land with their spec in the same commit; do not batch all backend tests to the end.

---

## 6. Open Questions and Risks

Items marked **BLOCKING** need a decision before the corresponding step starts. The rest can be decided during implementation but must be recorded in the PR.

### 6.0 Decisions (resolved before implementation starts)

Every open question below is resolved as this breakdown's own **Recommendation** — reviewed and accepted, no deviations. Record these as accepted (not merely proposed) in the Child PR 3 description:

| # | Decision |
| --- | --- |
| OQ-1 | `SceneQcReviewEvidence.objectKey` is nullable; `fileUrl` is the render source; best-effort `deriveObjectKeyFromPublicUrl` provenance. Never reject evidence solely for a non-derivable object key. |
| OQ-2 | Drop the "re-sign pinned evidence from objectKey" scenario from Stage 1 — `StorageService` has no presigned-GET and R2 URLs are permanent public URLs today, so the plan's premise doesn't hold. `fileUrl` is documented as durable. Presigned-GET reads are deferred work, tracked if the bucket ever stops being publicly readable. Correct `SCENE_QC_IMPLEMENTATION_PLAN.md` §5.3/§12.2 in this PR to remove the stale claim (see note below). |
| OQ-3 | `SCENE_QC_REVIEW: 'scqcr'` (reserve `scqcc` for PR 4's confirmation, not created in this PR). |
| OQ-4 | `sourceTaskId` nullable + `onDelete: SetNull`, plus denormalized `sourceTaskUid`. |
| OQ-5 | `operationalDate` is `DateTime @db.Date` (UTC-midnight bucket key), matching `StudioShift.date`. PR 4 must use the identical type. |
| OQ-6 | Confirmation fields ship in the shared summary schema now; PR 3 always returns `UNCONFIRMED`/nulls behind `TODO(scene-qc-confirmation)`. |
| OQ-7 | `records` is a valid `tab` value; PR 3 renders it disabled/"available soon". |
| OQ-8 | PR 3 repoints `scene-review/index.tsx` directly at the new workspace — no temporary route. The old Task-anchored feature/contract stay physically in the tree, unreferenced, until the main integration PR deletes them per §9. No redirect shim, no second temporary URL. |
| OQ-9 | `SceneQcRepository`/`SceneQcEvidenceResolver` read `txHost.tx.show`/`txHost.tx.task`/`txHost.tx.taskTemplateSceneQcEvidenceRef` directly as capability-local, read-only, purpose-shaped projections. Flag for the same `erify_api` refactor-program sign-off Child PR 1's audit side table received; record the RT-01/RT-05/RT-06 preflight outcome in the PR. |
| OQ-10 | Hoist `SCENE_QC_OPERATIONAL_TIMEZONE`/`SCENE_QC_OPERATIONAL_DAY_START_HOUR` into `@eridu/api-types/scene-qc`; add a Scene-QC-specific `getCurrentOperationalDate()`; do not touch `operational-day-range.ts`. |
| OQ-11 | Cap the eligible-Show-per-operational-day projection at 500. Exceeding it fails loudly (`HttpError.unprocessableEntity` or equivalent), never silently truncates. |
| OQ-12 | `search` matches Show name only, case-insensitive `contains`. |
| OQ-13 | A Show with `studioId: null` is correctly excluded from every studio's eligible set; assert this in the query-service spec rather than treating it as a gap. |
| OQ-14 | Every accepted save (create or update, result changed or not) updates `reviewedById`/`reviewedAt` and increments `version`. |
| OQ-15 | `PATCH` body carries only `result`, `feedback`, `version`. The server re-derives Show/window from the stored head. If the Show has moved to a different operational date since the head was created, `PATCH` is rejected (`HttpError.conflict`) and the client must `POST` a new head. |
| OQ-16 | Evidence `sortOrder` is `(sourceTaskUid ASC, sourceFieldKey ASC)`, 0-based, deduped by `fileUrl` within a Show. |

**Plan correction required (OQ-2):** `SCENE_QC_IMPLEMENTATION_PLAN.md` §5.3 ("Historical reads re-sign `objectKey` through the storage service…") and §12.2 ("pinned evidence can be re-signed from `objectKey` after its stored URL expires") assert a capability `StorageService` does not have. Fix both passages in this PR to describe the durable-public-URL reality, alongside the code changes — do not leave the accepted plan asserting a superseded design (same rule the `file-upload-presign` skill doc violated in Child PR 2).

### Drift between the plan's prose and Child PR 1/2's shipped code

**OQ-1 — BLOCKING. Task content stores a file URL, not an object key.**
§5.2 says the resolver "accepts image records with safe existing storage object keys and URLs", and §5.3 gives `SceneQcReviewEvidence.objectKey` as a plain (implicitly non-null) column. In shipped code, `components/json-form/json-form.tsx:261` writes `presigned.file_url` — a bare string — into `task.content[fieldKey]`. **There is no object key in Task content.** The only recovery path is inverting `StorageService.resolvePublicFileUrl`, which fails for any URL whose base is not the current `R2_PUBLIC_BASE_URL` (env change, legacy asset, externally-pasted URL).
*Recommendation*: make `objectKey` nullable on `SceneQcReviewEvidence`, treat `fileUrl` as the render source, and add `deriveObjectKeyFromPublicUrl` as best-effort provenance. *Alternative*: reject evidence whose object key cannot be derived — safer provenance, but it would silently hide legitimate evidence and could make Shows spuriously "blocked". **Needs a call.**

**OQ-2 — Re-signing pinned evidence is not implementable today.**
§5.3 says "Historical reads re-sign `objectKey` through the storage service; persisted `fileUrl` is never the sole render source", and §12.2 lists "pinned evidence can be re-signed from `objectKey` after its stored URL expires" as a scenario. But `StorageService` has no presigned-GET method: `resolvePublicFileUrl` builds a **permanent public** URL from `R2_PUBLIC_BASE_URL`, and `generatePresignedUploadUrl` is upload-only. Stored URLs do not expire.
*Recommendation*: drop the re-sign scenario from Stage 1, document `fileUrl` as durable, and record presigned-GET reads as deferred work (it becomes necessary the moment the bucket stops being publicly readable). *Alternative*: add `getSignedReadUrl` to `StorageService` in this PR — real scope growth touching every image render path.

**OQ-3 — Review UID prefix.**
§5.3 writes the external UID as `scene_qc_review_*`, but §5 also mandates "short tokens … that are not a string-prefix of any other UID prefix", and Child PR 1 shipped `scprof` (not `scene_profile`).
*Recommendation*: `SCENE_QC_REVIEW: 'scqcr'` (and `scqcc` for PR 4's confirmation), consistent with the shipped precedent. Confirm before step 1, since the prefix is baked into every schema, fixture, and URL.

**OQ-10 — The frontend's operational-day helpers are browser-local.**
`apps/erify_studios/src/lib/operational-day-range.ts` computes dates from `date.getFullYear()` etc. — the *browser's* calendar. §12.3 requires "date selection uses the server-returned operational-timezone window rather than the browser timezone", and the server's `OPERATIONAL_TIMEZONE` currently lives only in `apps/erify_api/src/capabilities/scene-qc/scene-qc-operational-window.util.ts` (not shared).
*Recommendation*: hoist the constant into `@eridu/api-types/scene-qc` and have the backend util re-export it, then add a Scene-QC-specific `getCurrentOperationalDate()` on the frontend. Do **not** extend `operational-day-range.ts` — other surfaces depend on its current browser-local semantics.

**OQ-9 — Cross-capability Prisma reads need the same sign-off the audit side table got.**
`SceneQcRepository` and `SceneQcEvidenceResolver` will read `txHost.tx.show`, `txHost.tx.task`, and `txHost.tx.taskTemplateSceneQcEvidenceRef` directly. §4's diagram sanctions "Show and Task evidence reads" but does not say through what. Reading via the exported `ShowRepository` conflicts with RT-05; reading via `ShowService` cannot produce the purpose-shaped projection.
*Recommendation*: capability-local read-only projections, documented in the PR and flagged for architecture review exactly as Child PR 1's `SceneQcAuditTarget` was.

### Design decisions the plan leaves open

**OQ-4 — `sourceTaskId` delete behavior.** `ShowOrchestrationService` hard-deletes orphaned Tasks (`show-orchestration.service.ts:176`). A required cascading FK would erase historical pinned evidence rows from a possibly-confirmed review. *Recommendation*: nullable FK + `onDelete: SetNull` + a denormalized `sourceTaskUid` so the record stays attributable. This adds one column the plan does not list.

**OQ-5 — `operationalDate` column type.** `DateTime @db.Date` (UTC-midnight, matching `StudioShift.date`, enabling PR 4's Records range filters and letting `.slice(0, 10)` be the *correct* serializer under the documented date-only-column exception) versus a plain `String`. *Recommendation*: `@db.Date`. Whichever is chosen must be identical for PR 4's `SceneQcDailyConfirmation.operationalDate`.

**OQ-6 — Confirmation fields in the summary response.** §6.2 lists them; §10 puts confirmation in PR 4. *Recommendation*: define the fields in the shared schema now and have PR 3 always return `UNCONFIRMED` / nulls behind a `TODO(scene-qc-confirmation)` marker, so PR 4 is purely additive. The alternative (omit and widen later) breaks the frontend contract mid-branch.

**OQ-7 — The Records tab in PR 3.** The tab bar is part of §7.2's accepted hierarchy, but Records ships in PR 4. *Recommendation*: include `records` in the search enum, render the tab **disabled** with a short "available soon" state; PR 4 enables it. Alternative: omit the tab entirely and have PR 4 add it (cleaner PR 3, but the accepted layout is then unverifiable at PR 3 review time).

**OQ-8 — Route swap timing.** §9 assigns removal of the PR #319 implementation to the main integration PR, but PR 3 needs `/studios/:studioId/scene-review/` to render the new Daily Review to be testable and screenshot-able. *Recommendation*: PR 3 **repoints** the index route at `SceneQcDailyWorkspace` and leaves `features/scene-review/` + the Task-anchored backend contract physically in the tree for the main PR to delete. Consequence: the integration branch carries an unreferenced feature folder and its tests between PR 3 and the main PR. Alternative: a temporary `/scene-review/daily` route — avoids dead code but ships a URL the main PR must then remove, which §9 discourages.

**OQ-11 — `review_state=blocked` cannot be a SQL predicate.** Blocked-ness depends on **live** evidence resolution, so `items` must resolve evidence for the whole eligible day, then filter and paginate in memory. Same for `blocked_no_evidence_count` on the summary. Shows-per-day is small today (tens), so this is acceptable, but it is an unbounded-in-principle read. *Recommendation*: add an explicit guard rail — cap the eligible-Show projection (e.g. 500/day) and fail loudly rather than silently truncating. Needs a number.

**OQ-12 — `search` filter semantics are unspecified.** §6.2 lists `search` without saying what it matches. *Recommendation*: Show name only (case-insensitive `contains`), matching the old `SCENE_REVIEW` behavior, since Client and platform already have dedicated filters.

**OQ-13 — `Show.studioId` is nullable.** A Show with no studio can never be in a studio's eligible set. Confirm this is intended (it follows directly from the studio-scoped route) and assert it in the query-service spec.

**OQ-14 — Does an unchanged-result save bump `reviewedAt` and `version`?** §5.3 defines `reviewedAt` as "time of the latest accepted draft decision". *Recommendation*: any accepted save updates `reviewedById`/`reviewedAt` and increments `version` — the evidence pin set may have changed even when the result did not, and `version` is the client's staleness token. This is a semantic user-visible mutation, so the version bump is correct under the repo's optimistic-lock rule.

**OQ-15 — PATCH contract shape.** §6.2 says "Review create/update accepts `show_id`, `operational_date`, `result`, `feedback`, and `version` for updates", but the PATCH route is keyed by `:reviewId`, which already pins both. *Recommendation*: PATCH body carries only `result`, `feedback`, `version`; the server re-derives Show and window from the stored head. If the Show has since moved to a different operational date, PATCH must be rejected and the client must POST a new head (§5.3's cross-boundary rule). Confirm.

**OQ-16 — Evidence `sortOrder` determinism.** §5.3 calls it "stable display order" without a rule. *Recommendation*: `(sourceTaskUid ASC, sourceFieldKey ASC)`, 0-based, deduped by `fileUrl` within a Show. Without a fixed rule, replacing the pin set on every save would reshuffle the display order.

### Residual risks

- **`prisma migrate dev` DROP-INDEX hazard** (§1.1.5) — a silently-accepted generated migration would drop the Scene Profile partial unique index and re-enable duplicate active profiles. Mitigated by the integration assertion in §4.2 item 6, but the implementer must catch it at generation time.
- **Contract-surface size.** This PR adds five endpoints plus ~15 shared schemas. Land the api-types step (sequencing step 1) as its own reviewable commit so contract review is not buried under UI diffs.
- **Old and new Scene Review code coexist on the integration branch** between PR 3 and the main PR (OQ-8). The main PR's cutover checklist (§9 items 3–8) is the mitigation; nothing in PR 3 should start deleting it piecemeal.
