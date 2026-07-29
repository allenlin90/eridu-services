# Scene QC — Child PR 4 Implementation Breakdown (Confirmation, Records, and Manager Report)

> **Parent plan**: [Scene QC Implementation Plan](./SCENE_QC_IMPLEMENTATION_PLAN.md) — §10 "Child PR 4"
> **Product contract**: [Scene Quality Control PRD](../../../../docs/prd/scene-qc.md)
> **Prior sibling**: [Child PR 3 breakdown](./SCENE_QC_CHILD_PR_3_BREAKDOWN.md) — conventions, OQ-1…OQ-16
> **Branch**: `feat/scene-qc-child-pr-4-confirmation-records-report` (targets `feat/scene-qc-integration`)
> **Status**: Planning artifact — no code written yet
> **Baseline**: Child PR 1 (persistence foundation), Child PR 2 (Scene Profile API + evidence binding), and Child PR 3 (Daily Review journey) are all merged into the integration branch

## 0. Scope Boundary

**In scope (this PR)**

- `SceneQcDailyConfirmation`, `SceneQcDailyConfirmationItem`, `SceneQcDailyConfirmationItemPlatform` persistence and the **third and final** `SceneQcAuditTarget` CHECK widening (`sceneQcDailyConfirmationId`).
- The §8.3 confirmation transaction: advisory-locked, cross-row, append-only revision append.
- `POST /studios/:studioId/scene-qc-confirmations` (listed in §6.2, but delivered here per §10).
- `GET /studios/:studioId/scene-qc-records`, `GET .../scene-qc-records/:reviewId`.
- `GET /studios/:studioId/scene-qc-confirmations/:confirmationId/report`, `GET .../report.csv`.
- Wiring **real** confirmation state into the already-shipped `SceneQcQueryService.getDailySummary` (removing the `TODO(scene-qc-confirmation)` stub in two places).
- Shared `@eridu/api-types/scene-qc` confirmation / records / report contracts.
- Frontend: Records tab (enabled), Records table + detail Sheet/Drawer, Manager Report view + CSV download, and the §7.3 `CURRENT` / `STALE` confirmation states Child PR 3 explicitly deferred.
- The §8.4 Records/report half of the refresh policy.
- The actionable `TODO(scene-qc-reporting)` marker in the report query module (§6.3).

**Explicitly out of scope (already shipped by Child PR 1–3)**

- `SceneProfile`, the evidence-ref projection and backfill, the evidence resolver, `SceneQcReview`/`SceneQcReviewEvidence`, the review save transaction, the daily summary/items/detail read models, the whole Daily Review UI, `scene-qc-eligibility-policy.ts`, `scene-qc-operational-window.util.ts`, `scene-qc-result.policy.ts`. This PR **reuses** all of them and reimplements none.

**Explicitly out of scope (Main Integration PR #343)**

- Deleting `models/task/scene-review.*`, `StudioSceneReviewController`, `TaskRepository.findSceneReviewCandidate*`, `SCENE_REVIEW_MODE`, `features/scene-review/`.
- Final route/nav cutover, evidence-binding verification command run, and the cross-cutting doc/skill reconciliation set in plan §11.
- Combined end-to-end authorization coverage and the full §12.4 screenshot set (this PR captures only its own new shots).

---

## 1. Backend

### 1.1 Prisma models and migration

One new generated migration, purpose-named **`scene_qc_daily_confirmation`** (no PR number, no phase label).

#### 1.1.1 `SceneQcDailyConfirmation`

```prisma
// Append-only daily confirmation. One row per (studio, operational date,
// revision). NEVER updated after insert -- a changed Show scope appends a new
// revision instead (plan section 5.4). There is deliberately no `updatedAt`,
// no `deletedAt`, and no `version`: an immutable historical artifact has no
// mutable state to lock.
model SceneQcDailyConfirmation {
  id              BigInt                         @id @default(autoincrement())
  uid             String                         @unique
  studioId        BigInt                         @map("studio_id")
  studio          Studio                         @relation(fields: [studioId], references: [id], onDelete: Cascade)
  // Same type as SceneQcReview.operationalDate (Child PR 3 OQ-5) -- UTC-midnight
  // date-only bucket key. The two MUST match or the join/compare breaks.
  operationalDate DateTime                       @map("operational_date") @db.Date
  windowStart     DateTime                       @map("window_start")
  windowEnd       DateTime                       @map("window_end")
  timezone        String
  revision        Int
  confirmedById   BigInt                         @map("confirmed_by_id")
  // Restrict, matching SceneQcReview.reviewedBy: a confirmation must remain
  // attributable. User is soft-deleted in practice.
  confirmedBy     User                           @relation(fields: [confirmedById], references: [id], onDelete: Restrict)
  confirmedAt     DateTime                       @map("confirmed_at")
  createdAt       DateTime                       @default(now()) @map("created_at")
  items           SceneQcDailyConfirmationItem[]
  auditTargets    SceneQcAuditTarget[]

  @@unique([studioId, operationalDate, revision])
  @@index([uid])
  @@index([studioId, operationalDate])
  @@map("scene_qc_daily_confirmations")
}
```

- `@@unique([studioId, operationalDate, revision])` is the DB backstop behind the advisory lock — expressible in Prisma, so no custom SQL. If the lock ever fails to serialize, the second writer gets `P2002` instead of a duplicate revision.
- `@@index([studioId, operationalDate])` backs "latest revision for this day", which the summary hits on every 5-minute poll.
- Add `sceneQcDailyConfirmations SceneQcDailyConfirmation[]` to `model Studio` and `model User`.

#### 1.1.2 `SceneQcDailyConfirmationItem`

```prisma
// One pinned Show per confirmation revision. Report identity, Show detail, and
// Client/platform breakdowns read THESE columns, never the current mutable Show
// / Client relations (plan section 5.4, section 6.3). The FKs below are
// provenance and join keys only.
model SceneQcDailyConfirmationItem {
  id                 BigInt                                 @id @default(autoincrement())
  confirmationId     BigInt                                 @map("confirmation_id")
  confirmation       SceneQcDailyConfirmation               @relation(fields: [confirmationId], references: [id], onDelete: Cascade)
  showId             BigInt                                 @map("show_id")
  show               Show                                   @relation(fields: [showId], references: [id], onDelete: Cascade)
  reviewId           BigInt                                 @map("review_id")
  review             SceneQcReview                          @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  // Version of the effective review at confirmation time. Stage 2 amendment
  // detection compares this against the review's current version.
  reviewVersion      Int                                    @map("review_version")
  // Confirmation-time display facts. See OQ-27 for why the UIDs are
  // denormalized alongside the names the plan lists.
  showUid            String                                 @map("show_uid")
  showName           String                                 @map("show_name")
  scheduledStartTime DateTime                               @map("scheduled_start_time")
  clientId           BigInt                                 @map("client_id")
  client             Client                                 @relation(fields: [clientId], references: [id], onDelete: Cascade)
  clientUid          String                                 @map("client_uid")
  clientName         String                                 @map("client_name")
  createdAt          DateTime                               @default(now()) @map("created_at")
  platforms          SceneQcDailyConfirmationItemPlatform[]

  @@unique([confirmationId, showId])
  @@index([confirmationId])
  @@index([showId])
  @@index([reviewId])
  @@map("scene_qc_daily_confirmation_items")
}
```

- `@@unique([confirmationId, showId])` enforces "each Show contributes once" (§6.3's Client-breakdown rule depends on it).
- `@@index([reviewId])` backs the Records list's "which confirmation pins this review" lookup.
- Add the back-relations to `model Show`, `model Client`, and `model SceneQcReview`.

#### 1.1.3 `SceneQcDailyConfirmationItemPlatform`

```prisma
// One normalized confirmation-time platform identity + label per item. A
// multi-platform Show contributes one row per linked platform, so platform
// breakdown totals are NOT expected to sum to the confirmed-Show total
// (plan section 6.3).
model SceneQcDailyConfirmationItemPlatform {
  id           BigInt                       @id @default(autoincrement())
  itemId       BigInt                       @map("item_id")
  item         SceneQcDailyConfirmationItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  // Platform is shared reference data; SetNull + denormalized uid/name so
  // deleting a Platform row never erases a historical report line.
  platformId   BigInt?                      @map("platform_id")
  platform     Platform?                    @relation(fields: [platformId], references: [id], onDelete: SetNull)
  platformUid  String                       @map("platform_uid")
  platformName String                       @map("platform_name")

  @@unique([itemId, platformUid])
  @@index([itemId])
  @@index([platformId])
  @@map("scene_qc_daily_confirmation_item_platforms")
}
```

Add `sceneQcConfirmationItemPlatforms SceneQcDailyConfirmationItemPlatform[]` to `model Platform`.

#### 1.1.4 `SceneQcAuditTarget` — third and final widening

```prisma
model SceneQcAuditTarget {
  // ...existing sceneProfileId / sceneQcReviewId...
  sceneQcDailyConfirmationId BigInt?                   @map("scene_qc_daily_confirmation_id")
  sceneQcDailyConfirmation   SceneQcDailyConfirmation? @relation(fields: [sceneQcDailyConfirmationId], references: [id], onDelete: Cascade)

  @@index([auditId])
  @@index([sceneProfileId])
  @@index([sceneQcReviewId])
  @@index([sceneQcDailyConfirmationId])
  @@map("scene_qc_audit_targets")
}
```

Custom SQL appended to the **new** migration only:

```sql
-- CUSTOM SQL START: widen the single-target rule for Scene QC confirmation audits
ALTER TABLE "scene_qc_audit_targets"
    DROP CONSTRAINT "scene_qc_audit_targets_single_target_check";

ALTER TABLE "scene_qc_audit_targets"
    ADD CONSTRAINT "scene_qc_audit_targets_single_target_check"
    CHECK (num_nonnulls("scene_profile_id", "scene_qc_review_id", "scene_qc_daily_confirmation_id") = 1);
-- CUSTOM SQL END
```

Also update the model's doc comment: it currently reads "Child PR 4 adds `sceneQcDailyConfirmationId`, widening the … CHECK in its own migration." Reword to state that the target set is now complete for Stage 1 and that any further typed FK must widen the CHECK the same way.

#### 1.1.5 Migration hazards (must-read)

1. **`prisma migrate dev` will again try to `DROP INDEX "scene_profiles_active_client_key"`.** That partial unique index is invisible to Prisma and the schema comment already warns about it. **Delete that statement from the generated migration** before committing. §4.2 keeps the regression assertion.
2. Do not touch the `scene_qc_foundation` or `scene_qc_review` migrations. The CHECK swap is a drop-and-re-add inside the **new** migration only.
3. `prisma format` → `prisma validate` → `prisma generate` → the official migration command. Never hand-write the DDL for the tables themselves.
4. `hashtextextended(text, bigint)` (§1.6) requires PostgreSQL ≥ 11. Confirm the target environment's server version before merging (see residual risks).

### 1.2 UID prefix

Add to `packages/api-types/src/constants.ts`, next to the existing `SCENE_PROFILE: 'scprof'` / `SCENE_QC_REVIEW: 'scqcr'`:

```ts
SCENE_QC_CONFIRMATION: 'scqcc',
```

Reserved by Child PR 3's OQ-3 precisely for this PR. Not a string-prefix of any other registered prefix (`scqcr` and `scqcc` diverge at the fifth character). See **OQ-17**.

### 1.3 Capability files

All under `apps/erify_api/src/capabilities/scene-qc/`. The confirmation command is the capability-refactoring skill's **"complex transactional workflow"** shape; the report is a **purpose-shaped query provider**. Neither justifies a new Nest module.

| File | Kind | Responsibility | Module visibility |
| --- | --- | --- | --- |
| `scene-qc-confirmation.repository.ts` (`SceneQcConfirmationRepository`) | Injectable | Advisory lock acquisition, max-revision read, the append-only confirmation + item + platform write, the bulk `confirmedAt` stamp, latest-confirmation-with-scope read, confirmation-by-UID read, and the report's item↔review join. All through `txHost.tx`. | **Private** — providers only |
| `scene-qc-confirmation-state.policy.ts` | Pure functions | `resolveSceneQcConfirmationState(...)`, `diffConfirmationScope(...)`. Deterministic; no provider. | n/a (module-scoped export) |
| `scene-qc-confirmation-workflow.service.ts` (`SceneQcConfirmationWorkflowService`) | Injectable | `confirmDay(...)` — the `@Transactional()` command owning §8.3 end to end. | **Exported** (capability API) |
| `scene-qc-records.query.service.ts` (`SceneQcRecordsQueryService`) | Injectable | Records list + detail read models. | **Exported** |
| `scene-qc-report.service.ts` (`SceneQcReportService`) | Injectable | The §6.3 report read model + status resolution. Hosts the `TODO(scene-qc-reporting)` marker. | **Exported** |
| `scene-qc-report-csv.ts` | Pure functions | `serializeSceneQcReportToCsv(report)` — the exact §6.3 column list, RFC 4180 quoting, UTF-8 BOM, CSV-injection prefix guard. | n/a |
| `schemas/scene-qc-confirmation.schema.ts` | Schemas/DTOs | Confirmation payload types, `Prisma.*Include` constants, DTO transforms, `createZodDto` classes. | n/a |
| `schemas/scene-qc-records.schema.ts` | Schemas/DTOs | Records query DTOs + row/detail mappers. | n/a |
| `schemas/scene-qc-report.schema.ts` | Schemas/DTOs | Report read-model types + response mapper. | n/a |
| `http/studio-scene-qc-confirmation.controller.ts` | Controller | `POST studios/:studioId/scene-qc-confirmations`, `GET .../:confirmationId/report`, `GET .../:confirmationId/report.csv` | `SceneQcHttpModule` |
| `http/studio-scene-qc-records.controller.ts` | Controller | `GET studios/:studioId/scene-qc-records`, `GET .../:reviewId` | `SceneQcHttpModule` |

**Extended, not new:**

- `scene-qc-review.repository.ts` (`SceneQcRepository`) gains the three Records read projections (§1.7). It already owns `SceneQcReview`; Records is a read over that table, so it belongs here rather than in a third provider. The file goes from ~300 to ~420 LOC — under the 600-LOC refactor trigger. See **OQ-26**.
- `scene-qc-audit.writer.ts` gains `recordDailyConfirmation` (§1.5).
- `scene-qc-query.service.ts` gains the real confirmation state (§1.9).
- `schemas/scene-qc-daily.schema.ts` — `toSceneQcDailySummaryDto` takes a confirmation argument; the `TODO(scene-qc-confirmation)` marker is deleted.

**Wiring:**

- `scene-qc.module.ts` — `providers` += `SceneQcConfirmationRepository`, `SceneQcConfirmationWorkflowService`, `SceneQcRecordsQueryService`, `SceneQcReportService`; `exports` += the three services only. No new module imports (`PrismaModule`, `UidGeneratorModule`, `StorageModule`, `UserModule` already cover it). `AuditModule` stays deliberately absent.
- `scene-qc-http.module.ts` — register the two new controllers.
- `scene-qc.module.spec.ts` — extend: still no `AuditModule`; `SceneQcConfirmationRepository` absent from `exports`; both new controllers resolvable through `StudiosModule`.
- `architecture:signals` delta: **+0 Nest modules, +1 repository, +0 exported repositories.** Record it in the PR.

### 1.4 Endpoint → method mapping (§6.3's four endpoints + §6.2's confirmation POST)

Authorization is uniform with the rest of the capability: `@StudioProtected([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN])`. Shows carry `studioId` directly, so scoping is a `show: { studio: { uid: studioId } }` predicate inside the repository; the confirmation tables carry `studioId` themselves.

| Endpoint | Controller method | Service method | Collaborators |
| --- | --- | --- | --- |
| `POST /studios/:studioId/scene-qc-confirmations` | `StudioSceneQcConfirmationController.confirm` | `SceneQcConfirmationWorkflowService.confirmDay(studioUid, operationalDate, context)` | §8.3 chain (§1.6) |
| `GET /studios/:studioId/scene-qc-confirmations/:confirmationId/report` | `.report` | `SceneQcReportService.getReport(studioUid, confirmationUid)` | `SceneQcConfirmationRepository.findConfirmationForReport` → status resolution → aggregation |
| `GET /studios/:studioId/scene-qc-confirmations/:confirmationId/report.csv` | `.reportCsv` | `SceneQcReportService.getReport(...)` then `serializeSceneQcReportToCsv(...)` | same read model — the two endpoints can never drift |
| `GET /studios/:studioId/scene-qc-records` | `StudioSceneQcRecordsController.list` | `SceneQcRecordsQueryService.listRecords(studioUid, query)` | `SceneQcRepository.findReviewRecords` + `.countReviewRecords` |
| `GET /studios/:studioId/scene-qc-records/:reviewId` | `.detail` | `SceneQcRecordsQueryService.getRecordDetail(studioUid, reviewUid)` | `SceneQcRepository.findReviewRecordDetail` + `.findReviewAuditHistory` + `SceneQcConfirmationRepository.findConfirmationRefForReview` |

- Path params: `:confirmationId` → `new UidValidationPipe(UID_PREFIXES.SCENE_QC_CONFIRMATION, 'Scene QC confirmation')`; `:reviewId` → `UID_PREFIXES.SCENE_QC_REVIEW`.
- All four GETs carry `@ReadBurstThrottle()`.
- The three JSON responses use `@ZodResponse(...)`. **`report.csv` does not** — see §1.8.

### 1.5 `SceneQcAuditWriter.recordDailyConfirmation`

Third method, structurally identical to the two shipped ones so the widened CHECK is satisfied by construction:

```ts
async recordDailyConfirmation(input: {
  action: Extract<AuditAction, 'CREATE'>;
  actorId: bigint;
  sceneQcDailyConfirmationId: bigint;
  metadata: AuditMetadata;
}): Promise<{ uid: string }>
```

Metadata contract (thin — business facts live in the normalized confirmation/item tables, per §5.5):

```text
event: 'scene_qc_day_confirmed'
scene_qc_confirmation_uid, studio_uid, actor_uid, operational_date
old_value: { revision, show_count } | null      # the superseded revision, when reconfirming
new_value: { revision, show_count, pass_count, minor_count, fail_count,
             newly_confirmed_review_count }
```

`action` is always `'CREATE'` — a confirmation is never updated. Do **not** persist Show/Client/platform lists in metadata; they are normalized rows.

### 1.6 §8.3 Confirmation Transaction → code

`SceneQcConfirmationWorkflowService.confirmDay`, `@Transactional()`. The transaction boundary is the workflow method (capability skill §3).

| §8.3 step | Class / function | Notes |
| --- | --- | --- |
| 1. Acquire `pg_advisory_xact_lock(hashtextextended('scene-qc-confirmation:' \|\| studioId \|\| ':' \|\| operationalDate, 0))` | `SceneQcConfirmationRepository.acquireDayLock({ studioUid, operationalDate })` | First statement in the transaction, before any read. Lock key uses the studio **UID** (**OQ-20**). Mechanics in §1.6.1. |
| 2. Recompute eligible Shows without UI filters | `resolveOperationalWindow(date, OPERATIONAL_TIMEZONE)` → `SceneQcRepository.findEligibleShowsInWindow({ studioUid, windowStart, windowEnd })` — **no** `clientUid`/`platformUid`/`search` | Same unfiltered path `getDailySummary` uses (§8.1). The 500-row cap (OQ-11) applies and fails loudly. |
| 3. Resolve one effective review per Show | `SceneQcRepository.findReviewHeadsForShows({ showIds, operationalDate })` | Keyed by `(showId, operationalDate)`, so a review from another date is never effective. |
| 4. Reject missing reviews, no-evidence blockers, or optimistic conflicts | `assertDayComplete(...)` in the workflow | See §1.6.2. |
| 4b. Replay guard | `resolveSceneQcConfirmationState(...)` against the latest existing confirmation | If already `CURRENT`, return it **without appending** (**OQ-19**). |
| 5. Append confirmation and item rows | `SceneQcConfirmationRepository.appendConfirmation(...)` | `revision = (max revision for the day) + 1`, read inside the lock. |
| 6. Append confirmation-time Show, Client, and platform report dimensions | same call, nested `items: { create: [{ …, platforms: { create: [...] } }] }` | One nested write; avoids an id round-trip for the platform children. |
| 7. Mark newly included draft reviews confirmed | `SceneQcConfirmationRepository.markReviewsConfirmed({ reviewIds, confirmedAt })` → `updateMany({ where: { id: { in }, confirmedAt: null }, data: { confirmedAt } })` | **`confirmedAt: null` in the predicate** so a reconfirm never rewrites an earlier confirmation's stamp. Does **not** bump `version` and does **not** touch `reviewedAt` (**OQ-22**). |
| 8. Write Audit | `SceneQcAuditWriter.recordDailyConfirmation` | |
| 9. Commit, then make the report queryable | `@Transactional()` commit; FE invalidation in `useConfirmSceneQcDay.onSuccess` (§3.5) | |

#### 1.6.1 Advisory-lock mechanics (get this exactly right)

Precedents in this repo: `schedule-conflict.service.ts:203` and `publishing.service.ts:129` both do `tx.$executeRaw\`SELECT pg_advisory_xact_lock(${id})\``, and `show-platform-violation.repository.ts:46` does a typed `txHost.tx.$queryRaw<...>` with `FOR UPDATE`. Prisma is `^7.4.2`; `TransactionHost<TransactionalAdapterPrisma>.tx` exposes the full client surface including `$executeRaw` / `$queryRaw`.

```ts
// scene-qc-confirmation.repository.ts
/**
 * MUST run inside an ambient CLS transaction. `pg_advisory_xact_lock` is
 * transaction-scoped: outside a transaction `txHost.tx` is the base
 * PrismaClient and the lock would be taken and released inside its own
 * implicit transaction -- silently providing NO protection. That is the
 * single most dangerous failure mode of this whole feature, so it is an
 * assertion, not a comment.
 */
async acquireDayLock(input: { studioUid: string; operationalDate: string }): Promise<void> {
  if (!this.txHost.isTransactionActive()) {
    throw HttpError.internalServerError('Scene QC confirmation lock requires an active transaction');
  }
  const lockKey = `scene-qc-confirmation:${input.studioUid}:${input.operationalDate}`;
  await this.txHost.tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
}
```

Rules the implementer must not deviate from:

- **Tagged template only.** `${lockKey}` becomes a bound `$1` parameter. Never `$executeRawUnsafe` with string interpolation.
- **Do not copy the `typeof tx.$executeRaw === 'function'` guard** from the two existing precedents. That guard exists so unit-test mocks that omit `$executeRaw` don't throw — it silently skips the lock. For the highest-risk transaction in this feature the mock must *provide* `$executeRaw` and the spec must *assert* it was called with the expected key. See **OQ-21**.
- `hashtextextended(text, bigint)` returns `bigint`, matching the single-argument `pg_advisory_xact_lock(bigint)` overload. The untyped `0` literal resolves to `bigint` from the function signature; if the target Postgres ever complains, write `0::bigint` — do not change the hash function.
- The lock is **transaction-scoped**: it auto-releases on commit or rollback. There is no unlock call and no `try/finally`.
- The lock must be the **first** statement, before step 2's read. Acquiring it after reading eligible Shows reintroduces the check-then-insert race the lock exists to close.
- The normalized key means two callers in different browser timezones that resolved the same `operational_date` string contend on the same lock (§10 exit criterion). The key is built from the *server-validated* `operational_date` and the studio UID — never from client-supplied bounds.

#### 1.6.2 Step 4 rejection contract

All inside the lock, all before any write:

| Condition | Error |
| --- | --- |
| Eligible set is empty | `HttpError.unprocessableEntity('There are no eligible Shows to confirm for this operational day.')` |
| Any eligible Show has zero live resolved evidence | `HttpError.unprocessableEntity('N Show(s) are blocked with no Scene QC evidence and cannot be confirmed.')` |
| Any eligible Show has no review head for this operational date | `HttpError.unprocessableEntity('N Show(s) still need a Scene QC review before this day can be confirmed.')` |
| Latest confirmation is already `CURRENT` | **not** an error — return it (**OQ-19**) |

The blocked check re-runs `SceneQcEvidenceResolver.resolveForShows(showIds)` inside the lock. That is the plan's "confirmation rechecks completeness inside its lock and transaction" (§12.2) and is deliberately *not* trusted from the summary response.

### 1.7 Repository surfaces

Nothing crosses the class boundary as a `Prisma.*` type; inputs are explicit domain parameters, outputs are declared read-model types.

**`SceneQcConfirmationRepository`** (new, private)

```ts
// --- Lock -------------------------------------------------------------------
acquireDayLock(input: { studioUid: string; operationalDate: string }): Promise<void>

// --- Reads ------------------------------------------------------------------
/** Latest revision + its pinned scope. Backs the summary's CURRENT/STALE state. */
findLatestConfirmationWithScope(input: {
  studioUid: string; operationalDate: Date;
}): Promise<ConfirmationWithScope | null>   // { id, uid, revision, confirmedAt,
                                            //   confirmedBy{uid,name},
                                            //   items: [{ showId, reviewId, reviewVersion }] }

findMaxRevision(input: { studioUid: string; operationalDate: Date }): Promise<number>

/** Full report payload source: confirmation + items + platforms + each item's review. */
findConfirmationForReport(input: {
  studioUid: string; confirmationUid: string;
}): Promise<ConfirmationReportRow | null>

/** True when a higher revision exists for the same (studio, operational date). */
hasLaterRevision(input: { studioId: bigint; operationalDate: Date; revision: number }): Promise<boolean>

/** Latest confirmation item pinning a given review -- Records list/detail. */
findConfirmationRefsForReviews(reviewIds: bigint[]): Promise<Map<bigint, ConfirmationRef>>

// --- Writes -----------------------------------------------------------------
appendConfirmation(input: AppendConfirmationInput & { uid: string }): Promise<ConfirmationRecord>
markReviewsConfirmed(input: { reviewIds: bigint[]; confirmedAt: Date }): Promise<number>
```

**`SceneQcRepository`** (existing, extended — Records reads over its own `SceneQcReview` table)

```ts
findReviewRecords(input: {
  studioUid: string;
  operationalDateFrom: Date;
  operationalDateTo: Date;
  clientUid?: string;
  platformUid?: string;
  result?: SceneQcResult;
  skip: number;
  take: number;
}): Promise<ReviewRecordRow[]>

countReviewRecords(input: { /* same filters, no paging */ }): Promise<number>

findReviewRecordDetail(input: {
  studioUid: string; reviewUid: string;
}): Promise<SceneQcReviewRecord & { show: … } | null>

/** Curated audit projection -- see OQ-18. */
findReviewAuditHistory(reviewId: bigint): Promise<ReviewAuditEntry[]>
```

Persistence rules these methods own:

- Records filters are **all SQL-expressible**, so `findReviewRecords` does real `skip`/`take` plus a separate `count`. Do **not** reproduce `listDailyItems`' load-everything-then-slice shape (already recorded as [tech debt](../../../../docs/tech-debt/scene-qc-daily-read-models-duplicate-evidence-resolution.md)). See **OQ-28**.
- Studio scope: `show: { studio: { uid: studioUid } }`. Soft-delete: `show: { deletedAt: null }`. Records deliberately does **not** apply the eligibility deny-list — a review pinned to a Show later cancelled is still a historical record.
- Date filter targets the review's pinned `operationalDate`, never `show.startTime` (§6.3).
- Platform filter matches the Show's **live** platforms (`show: { showPlatforms: { some: { deletedAt: null, platform: { uid } } } }`) — Records is review-anchored, not confirmation-anchored. Document that distinction at the call site; the *report*'s platform breakdown reads the pinned snapshot instead.
- `findReviewAuditHistory` joins `Audit` through `SceneQcAuditTarget.sceneQcReviewId`, ordered `createdAt asc`, and **selects only** `uid`, `action`, `actor { uid, name }`, `metadata.old_value` / `metadata.new_value`, `createdAt`. It must not select `ipAddress`, `userAgent`, or the raw `metadata` blob (**OQ-18**).

### 1.8 The `report.csv` endpoint

`erify_api` has **no existing non-JSON response** — no `@Header`, no `@Res`, no `StreamableFile` anywhere in `src/`. Every CSV in the monorepo today is serialized client-side (`apps/erify_studios/src/lib/csv.ts` + `file-download.ts`). Plan §6.3 nonetheless specifies a server endpoint, and §7.6 requires the CSV to come from the complete confirmation item set rather than any UI table page — which a server endpoint guarantees structurally. Keeping the endpoint (**OQ-25**).

```ts
@ApiOperation({ summary: 'Manager report as CSV for one confirmation revision' })
@Get(':confirmationId/report.csv')
@ReadBurstThrottle()
async reportCsv(
  @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
  @Param('confirmationId', new UidValidationPipe(UID_PREFIXES.SCENE_QC_CONFIRMATION, 'Scene QC confirmation'))
  confirmationId: string,
  @Res({ passthrough: true }) res: Response,
): Promise<string> {
  const report = await this.reportService.getReport(studioId, confirmationId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="scene-qc-report-${report.operational_date}-r${report.confirmation_revision}.csv"`,
  );
  return serializeSceneQcReportToCsv(report);
}
```

- `@Res({ passthrough: true })` is required because the filename is dynamic; `@Header()` only takes static values.
- **No `@ZodResponse`.** The global `ZodSerializerInterceptor` only acts on routes carrying `ZodSerializerDto` metadata, so a bare string return passes through untouched. Add a controller spec asserting the returned body is the serialized CSV string and that both headers are set.
- The route path `:confirmationId/report.csv` is a literal segment under Nest 11 / path-to-regexp v8 — the dot is not a special character. Add a controller spec that both `report` and `report.csv` resolve distinctly.
- `serializeSceneQcReportToCsv` must mirror `apps/erify_studios/src/lib/csv.ts` exactly: UTF-8 BOM, every cell double-quoted with `"` doubled, and the **CSV-injection prefix guard** (`^[=+\-@\t\r]` → prefix with `'`). Feedback text is free-form operator input landing in a spreadsheet; this is a security requirement, not cosmetics.
- Columns are the exact ordered §6.3 list, sourced from a single exported constant in `@eridu/api-types/scene-qc` so the backend serializer and any future consumer share one definition.

### 1.9 Wiring real confirmation state into `getDailySummary`

Currently `SceneQcQueryService.getDailySummary` hardcodes `UNCONFIRMED`/nulls through `toSceneQcDailySummaryDto` behind `TODO(scene-qc-confirmation)` (Child PR 3 OQ-6). Changes:

1. Inject `SceneQcConfirmationRepository` into `SceneQcQueryService`.
2. Add `findLatestConfirmationWithScope({ studioUid, operationalDate })` as a third member of the existing `Promise.all` (it does not depend on `showIds`).
3. Build the current scope from the already-computed eligible shows + review heads:
   `current = shows.map(s => ({ showId: s.id, reviewId: head?.id ?? null, reviewVersion: head?.version ?? null }))`.
4. Call `resolveSceneQcConfirmationState({ pinned: latest?.items ?? null, current })`.
5. Pass the resolved state + confirmation identity + the STALE diff counts into `toSceneQcDailySummaryDto`, which loses its hardcoded block and its `TODO`.
6. Delete the matching `TODO(scene-qc-confirmation)` comment in `packages/api-types/src/scene-qc/daily-review.schemas.ts`.

### 1.10 The three-way state as a pure, testable function

`scene-qc-confirmation-state.policy.ts` — no Nest provider, no I/O, one exported decision function plus a diff helper. This is the single most test-critical piece of logic in the PR and must not live inline in a service method.

```ts
export type PinnedScopeEntry  = { showId: bigint; reviewId: bigint; reviewVersion: number };
export type CurrentScopeEntry = { showId: bigint; reviewId: bigint | null; reviewVersion: number | null };

export type ConfirmationScopeDiff = {
  addedShowCount: number;      // eligible now, not pinned
  removedShowCount: number;    // pinned, not eligible now
  changedReviewCount: number;  // pinned and eligible, but a different review id/version
};

export function diffConfirmationScope(
  pinned: PinnedScopeEntry[],
  current: CurrentScopeEntry[],
): ConfirmationScopeDiff;

export function resolveSceneQcConfirmationState(input: {
  pinned: PinnedScopeEntry[] | null;
  current: CurrentScopeEntry[];
}): { state: SceneQcConfirmationState; diff: ConfirmationScopeDiff | null };
```

Rules, straight from §5.4:

- `pinned === null` → `UNCONFIRMED`, `diff: null`.
- `CURRENT` iff the pinned `showId` set **equals** the current eligible `showId` set **and** for every Show the current review's `(id, version)` equals the pinned `(reviewId, reviewVersion)`.
- Anything else → `STALE`, with the diff populated.

Why each §5.4 change kind lands correctly, with no extra branching:

| §5.4 change | Mechanism |
| --- | --- |
| Show added to the day | appears in `current`, absent from `pinned` → `addedShowCount` |
| Show reactivated (un-cancelled) | re-enters the eligibility deny-list filter → same as "added" |
| Show rescheduled **into** the day | its `startTime` now falls in the window → same as "added" |
| Show rescheduled **out of** the day | drops out of `findEligibleShowsInWindow` → `removedShowCount` |
| Show terminally cancelled | excluded by `SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS` → `removedShowCount` |
| Show soft-deleted | `deletedAt: null` predicate drops it → `removedShowCount` |
| Review replaced/amended | `(reviewId, reviewVersion)` mismatch → `changedReviewCount` |

Comparing `reviewVersion` as well as `reviewId` is only sound because **confirmation does not bump the review's `version`** (OQ-22) — the two decisions are coupled and must be changed together if either is revisited. State that in the file's doc comment.

`bigint` set comparison: normalize to `string` keys (`showId.toString()`) inside the policy; a `Set<bigint>` compares by value in JS but `Map` lookups across differently-derived bigints are safer as strings, and the spec fixtures read better.

### 1.11 §8.4 Refresh policy — the Records/report half

- Records **never** polls: it is a historical query over pinned operational dates. `refetchInterval: false`, no `refetchIntervalInBackground`.
- The report **never** polls: an immutable artifact keyed by confirmation UID. `staleTime: Infinity` is appropriate; a stale/superseded label change is driven by a summary refetch, not the report's own cache.
- Record detail is `enabled: Boolean(record_id)` — the same "detail only with a valid selection" rule §8.4 states for the daily surface.
- The confirmation mutation invalidates exactly `sceneQcKeys.summary(studioId, date)`, `sceneQcKeys.itemsPrefix(studioId, date)`, and `sceneQcKeys.recordsPrefix(studioId)`. It must **not** touch Task or Show caches. Confirmation is what flips every included review to `is_confirmed`, so the items list genuinely needs invalidating.
- The confirmation `onSuccess` must **await** the invalidation before resolving, matching the pattern `save-scene-qc-review.ts` was corrected to during Child PR 3 review. Do not regress that.

---

## 2. Shared API Types

Three new files under `packages/api-types/src/scene-qc/`, all re-exported from `index.ts`. Child PR 3 predicted a single `records.schemas.ts`; splitting into three keeps each module small for the same reason `daily-review.schemas.ts` was split off `schemas.ts` (**OQ-34**).

Conventions carried forward unchanged: snake_case fields, `z.string().startsWith(UID_PREFIXES.X)`, `z.iso.datetime()` for instants, `operationalDateSchema` for date-only values, `createPaginatedResponseSchema` for list envelopes, `as const` object + derived `z.enum`.

### 2.1 `daily-review.schemas.ts` — additive extension

Two things change in the existing file:

1. Delete the `TODO(scene-qc-confirmation)` comment on the confirmation fields.
2. Extend `sceneQcDailySummarySchema` with the STALE diff counts §7.3 requires but Child PR 3's locked schema has no slot for (**OQ-24**):

```ts
  // Non-null only when `confirmation === 'STALE'`. §7.3 requires the stale
  // banner to list added/removed scope counts; there is no other source for
  // them on the client, which cannot see the pinned confirmation scope.
  confirmation_added_show_count: z.number().int().min(0).nullable(),
  confirmation_removed_show_count: z.number().int().min(0).nullable(),
  confirmation_changed_review_count: z.number().int().min(0).nullable(),
```

Purely additive — no shipped field changes shape.

### 2.2 `confirmation.schemas.ts`

```ts
export const createSceneQcConfirmationInputSchema = z.object({
  operational_date: operationalDateSchema,
});

export const sceneQcConfirmationSchema = sceneQcOperationalWindowSchema.extend({
  id: z.string().startsWith(UID_PREFIXES.SCENE_QC_CONFIRMATION),
  revision: z.number().int().positive(),
  confirmed_by: sceneQcUserRefSchema,   // promote the local ref schema in daily-review.schemas.ts to an export
  confirmed_at: z.iso.datetime(),
  show_count: z.number().int().min(0),
  pass_count: z.number().int().min(0),
  minor_count: z.number().int().min(0),
  fail_count: z.number().int().min(0),
});
```

The command body carries **only** `operational_date`. No `expected_revision` / idempotency token: the advisory lock plus the CURRENT-state replay guard (OQ-19) make one redundant, and accepting a client-supplied revision would invite a client to re-anchor lineage. Response is `200 OK` whether a revision was appended or the existing `CURRENT` one was returned (**OQ-38**) — the client's next step is a summary refetch either way.

### 2.3 `records.schemas.ts`

```ts
export const SCENE_QC_RECORD_CONFIRMATION_STATUS = {
  UNCONFIRMED: 'UNCONFIRMED',
  CONFIRMED: 'CONFIRMED',
  SUPERSEDED: 'SUPERSEDED',
} as const;

export const SCENE_QC_RECORDS_MAX_RANGE_DAYS = 92;

export const sceneQcRecordsQuerySchema = paginationBaseSchema.extend({
  date_from: operationalDateSchema,
  date_to: operationalDateSchema,
  client_id: z.string().startsWith(UID_PREFIXES.CLIENT).optional(),
  platform_id: z.string().startsWith(UID_PREFIXES.PLATFORM).optional(),
  result: sceneQcResultSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).superRefine(/* date_from <= date_to, and span <= SCENE_QC_RECORDS_MAX_RANGE_DAYS */);

export const sceneQcRecordSchema = z.object({
  review_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_REVIEW),
  operational_date: operationalDateSchema,
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  show_name: z.string(),
  scheduled_start_time: z.iso.datetime(),
  client: sceneQcClientRefSchema.nullable(),
  platforms: z.array(sceneQcPlatformRefSchema),
  result: sceneQcResultSchema,
  has_feedback: z.boolean(),
  reviewed_by: sceneQcUserRefSchema,
  reviewed_at: z.iso.datetime(),
  version: z.number().int(),
  evidence_count: z.number().int().min(0),
  confirmation_status: sceneQcRecordConfirmationStatusSchema,
  confirmation_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_CONFIRMATION).nullable(),
  confirmation_revision: z.number().int().nullable(),
});

export const sceneQcRecordsResponseSchema = createPaginatedResponseSchema(sceneQcRecordSchema);

/** Curated -- deliberately excludes ip_address, user_agent, and raw metadata. See OQ-18. */
export const sceneQcRecordAuditEntrySchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.AUDIT),
  action: z.enum(['CREATE', 'UPDATE']),
  actor: sceneQcUserRefSchema.nullable(),
  at: z.iso.datetime(),
  old_result: sceneQcResultSchema.nullable(),
  new_result: sceneQcResultSchema.nullable(),
  feedback_changed: z.boolean(),
});

export const sceneQcRecordDetailSchema = z.object({
  show: sceneQcRecordShowSchema,        // id, name, scheduled_start_time, client, platforms
  review: sceneQcReviewSchema,          // REUSED from daily-review.schemas.ts -- already carries
                                        // pinned evidence + expected_reference + window provenance
  confirmation: z.object({
    id: z.string().startsWith(UID_PREFIXES.SCENE_QC_CONFIRMATION),
    revision: z.number().int().positive(),
    status: sceneQcReportStatusSchema,  // CURRENT | STALE | SUPERSEDED
    confirmed_by: sceneQcUserRefSchema,
    confirmed_at: z.iso.datetime(),
  }).nullable(),
  audit_history: z.array(sceneQcRecordAuditEntrySchema),
});
```

Reusing `sceneQcReviewSchema` for record detail is deliberate: the pinned evidence array and the snapshotted expected reference are already exactly what §6.3 asks detail to load, and the Records detail Sheet can then share rendering with the daily review panel.

The **list row** carries the cheap `confirmation_status` (`SUPERSEDED` = a higher revision exists for the same studio+date, a single indexed lookup). The `CURRENT` vs `STALE` distinction requires recomputing the day's eligible set and is therefore resolved only on **detail** and on the **report** (**OQ-30**).

### 2.4 `report.schemas.ts`

```ts
export const SCENE_QC_REPORT_STATUS = { CURRENT: 'CURRENT', STALE: 'STALE', SUPERSEDED: 'SUPERSEDED' } as const;

export const sceneQcReportSchema = z.object({
  // identity
  confirmation_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_CONFIRMATION),
  confirmation_revision: z.number().int().positive(),
  status: sceneQcReportStatusSchema,
  studio: z.object({ id: z.string().startsWith(UID_PREFIXES.STUDIO), name: z.string() }),
  operational_date: operationalDateSchema,
  window_start: z.iso.datetime(),
  window_end: z.iso.datetime(),
  timezone: z.string().min(1),
  confirmed_by: sceneQcUserRefSchema,
  confirmed_at: z.iso.datetime(),
  generated_at: z.iso.datetime(),

  // confirmed scope
  scope: z.object({
    total_shows: z.number().int().min(0),
    pass_count: z.number().int().min(0),
    minor_count: z.number().int().min(0),
    fail_count: z.number().int().min(0),
    pass_percentage: z.number(),   // 1 decimal place
    minor_percentage: z.number(),
    fail_percentage: z.number(),
  }),

  client_breakdown: z.array(z.object({
    client_id: z.string().startsWith(UID_PREFIXES.CLIENT),
    client_name: z.string(),
    pass_count: …, minor_count: …, fail_count: …, total_count: …,
  })),

  platform_breakdown: z.array(z.object({
    platform_id: z.string().startsWith(UID_PREFIXES.PLATFORM),
    platform_name: z.string(),
    pass_count: …, minor_count: …, fail_count: …, total_count: …,
  })),

  shows: z.array(sceneQcReportShowSchema),      // scheduled_start_time, show_id, show_name,
                                                // client{id,name}, platforms[], result,
                                                // reviewed_by, reviewed_at, feedback,
                                                // evidence_count, scene_type (nullable), amended
  exceptions: z.array(sceneQcReportShowSchema), // MINOR + FAIL subset, same row shape
});

/** The EXACT ordered §6.3 CSV column list. Single source shared by the server serializer. */
export const SCENE_QC_REPORT_CSV_COLUMNS = [
  'studio', 'operational_date', 'timezone', 'confirmation_revision', 'confirmed_by', 'confirmed_at',
  'show_start_time', 'show_id', 'show_name', 'client_id', 'client_name', 'platforms',
  'result', 'feedback', 'reviewed_by', 'reviewed_at', 'evidence_count', 'scene_type', 'amended',
] as const;
```

- `amended` is `false` for every Stage 1 row; the field exists now so Stage 2 amendments are additive (**OQ-31**).
- `platforms` in CSV is a `; `-joined list of platform names, matching `serialize-csv.ts`'s array handling in `erify_studios`.
- Percentages are server-computed to one decimal place. The tested invariant is `pass + minor + fail === total_shows`, **not** that percentages sum to 100.0 (**OQ-32**).
- Only `sceneQcReportStatusSchema` is shared between `records.schemas.ts` and `report.schemas.ts`; define it in `report.schemas.ts` and import it in the records module to avoid a cycle.

---

## 3. Frontend (`apps/erify_studios`)

### 3.1 Routes and search schema

| File | Change |
| --- | --- |
| `src/routes/studios/$studioId/scene-review.tsx` | Unchanged |
| `src/routes/studios/$studioId/scene-review/index.tsx` | `validateSearch` switches to the composed `sceneQcSearchSchema`; renders `<SceneQcWorkspace />` (the new shell) instead of `<SceneQcDailyWorkspace />` |
| `src/routes/studios/$studioId/scene-review/profiles.tsx` | Unchanged |

New `src/features/scene-qc/config/scene-qc-search-schema.ts`:

```ts
export const sceneQcRecordsSearchFields = {
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  date_to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  result:    z.enum(['PASS', 'MINOR', 'FAIL']).optional().catch(undefined),
  record_id: z.string().startsWith('scqcr_').optional().catch(undefined),
};

/** The whole route's search contract: daily fields + records fields. */
export const sceneQcSearchSchema = sceneQcDailySearchSchema.extend(sceneQcRecordsSearchFields);
```

`scene-qc-daily-search-schema.ts` stays intact so `use-scene-qc-daily.ts` and its shipped tests keep their exact typing. Shared across tabs: `tab`, `client_id`, `platform_id`, `page`, `limit`. Tab-exclusive: `date`/`review_state`/`search`/`show_id` (daily), `date_from`/`date_to`/`result`/`record_id` (records).

**Tab switch semantics** (§7.1's "changing a scope filter resets pagination and invalid selections", plus the operations-review-surface skill's "switching tabs clears the other tabs' filter/page params"): switching `tab` resets `page: 1` and clears the *other* tab's exclusive params (`show_id` when leaving daily, `record_id` when leaving records). `client_id`/`platform_id` deliberately survive the switch — they mean the same thing on both tabs and carrying them over is the useful behavior (**OQ-35**).

Records defaults: `date_from`/`date_to` left undefined mean "last 7 operational days ending today", resolved by the records hook via the existing `getCurrentOperationalDate()` / `shiftOperationalDate()` helpers and written into the URL on first navigation, exactly as the daily tab does with `date`. Do **not** reach for `@/lib/operational-day-range` (browser-local).

### 3.2 Component tree

New `components/scene-qc-workspace.tsx` shell (composition only, well under 200 LOC):

```text
SceneQcWorkspace
  ├─ SceneQcDailyToolbar        (existing — date nav only rendered on tab=daily)
  ├─ SceneQcTabs                (existing — Records ENABLED by this PR)
  └─ tab === 'daily'  → SceneQcDailyWorkspace  (existing, minus its own <SceneQcTabs>)
     tab === 'records' → SceneQcRecordsView    (new)
```

`scene-qc-daily-workspace.tsx` loses its `<SceneQcTabs>` render (moved up) and gains the confirmation card wiring. Everything else in it stays.

**New components**

| Component | §7 mapping |
| --- | --- |
| `scene-qc-workspace.tsx` | Tab shell |
| `scene-qc-confirmation-card.tsx` | §7.3 rows 6–8 — the four confirmation states (§3.3) |
| `scene-qc-records-view.tsx` | §7.5 container: filters + table + detail surface |
| `scene-qc-records-filters.tsx` | §7.5 — `DatePickerWithRange` for the `date_from`/`date_to` pair (one control, both bounds updated atomically), Client async combobox reusing `use-scene-profile-client-options.ts`, platform + result selects behind one `Filters` popover |
| `scene-qc-records-columns.tsx` | Column defs keyed to `SceneQcRecord`; result chip carries a **text label plus color** (§7.8) |
| `scene-qc-record-detail-content.tsx` | Shared detail body: review context, pinned evidence gallery, snapshotted expected reference, confirmation identity + status badge, audit history list |
| `scene-qc-record-detail-sheet.tsx` | Desktop `Sheet` / mobile `Drawer` around the shared body, switched by `useIsMobile()` (§7.5) |
| `scene-qc-report-view.tsx` | §7.6 sections 1–5: identity, scope cards, Client + platform breakdown tables, Show detail table, exceptions section |
| `scene-qc-report-sheet.tsx` | Sheet/Drawer wrapper for **Open report**; read-only; shows a prominent `STALE`/`SUPERSEDED` badge when opened from Records |

**Modified components**

| Component | Change |
| --- | --- |
| `scene-qc-tabs.tsx` | Remove `disabled` + the "Soon" badge; wire the Records button to `onTabChange('records')` (Child PR 3 OQ-7 discharged) |
| `scene-qc-summary-cards.tsx` | The placeholder 5th `StatCard` (`value="Unconfirmed"`) is replaced by `<SceneQcConfirmationCard />` (**OQ-37**) |
| `scene-qc-daily-workspace.tsx` | Drop `<SceneQcTabs>`; render the confirmation card; implement the deferred "focus moves to confirmation when no unreviewed Show remains" branch in `handleSave` (§7.2 step 8, §7.8) |

### 3.3 §7.3 confirmation states → concrete rendering

`scene-qc-confirmation-card.tsx` is a pure function of the summary response:

| Data condition | Rendering |
| --- | --- |
| `confirmation === 'UNCONFIRMED'` and (`remaining_count > 0 \|\| blocked_no_evidence_count > 0`) | Confirm button **disabled**, with the reviewed/remaining/blocker explanation §7.3 requires |
| `confirmation === 'UNCONFIRMED'` and day complete | Confirm button **enabled**; pending state during the mutation; duplicate submit prevented (§7.8) |
| `confirmation === 'CURRENT'` | Immutable banner: actor, time, `revision`, **Open current report** action |
| `confirmation === 'STALE'` | Warning banner listing `confirmation_added_show_count` / `confirmation_removed_show_count` (and `confirmation_changed_review_count` when non-zero); **current-report action disabled**; Reconfirm enabled only once `remaining_count === 0 && blocked_no_evidence_count === 0`; a note that the historical report remains attributable from Records |

All four states carry text labels in addition to colour, and the Confirm/Reconfirm button is keyboard reachable with a live-region pending announcement (§7.8). After a successful save leaves no unreviewed Show, `handleSave` moves focus to this card's action.

### 3.4 New API-layer files

`api/scene-qc-query-keys.ts` — extend the existing factory in place:

```ts
  recordsPrefix:  (studioId: string) => [...sceneQcKeys.all, 'records', studioId] as const,
  records:        (studioId: string, filters: unknown) => [...sceneQcKeys.recordsPrefix(studioId), filters] as const,
  recordDetail:   (studioId: string, reviewId: string | undefined) =>
                    [...sceneQcKeys.recordsPrefix(studioId), 'detail', reviewId] as const,
  reportPrefix:   (studioId: string) => [...sceneQcKeys.all, 'report', studioId] as const,
  report:         (studioId: string, confirmationId: string | undefined) =>
                    [...sceneQcKeys.reportPrefix(studioId), confirmationId] as const,
```

| File | Contents |
| --- | --- |
| `api/get-scene-qc-records.ts` | `useSceneQcRecordsQuery(studioId, params)` — `placeholderData: keepPreviousData`, `refetchInterval: false` |
| `api/get-scene-qc-record-detail.ts` | `useSceneQcRecordDetailQuery(studioId, reviewId)` — `enabled: Boolean(reviewId)` |
| `api/get-scene-qc-report.ts` | `useSceneQcReportQuery(studioId, confirmationId)` — `enabled: Boolean(confirmationId)`, `staleTime: Infinity` |
| `api/download-scene-qc-report-csv.ts` | `downloadSceneQcReportCsv(studioId, confirmationId)` — `apiClient.get(url, { responseType: 'text' })` then `triggerBrowserDownload({ content, mimeType: 'text/csv;charset=utf-8;', filename })`. **Never** serializes UI table rows (§7.6); the server owns the columns. A plain `<a href>` cannot be used — the API needs the JWT bearer header. |
| `api/confirm-scene-qc-day.ts` | `useConfirmSceneQcDay(studioId)` — `onSuccess` **awaits** `Promise.all([...])` over `summary`, `itemsPrefix`, `recordsPrefix` before resolving (§1.11) |

### 3.5 New hooks

| File | Responsibility |
| --- | --- |
| `hooks/use-scene-qc-records.ts` | View model: resolves the effective date range, builds list params, runs list + detail queries, owns `selectRecord`, `changeScope` (resets `page: 1`, clears `record_id`), `changePage`, and `isMobile` for the Sheet/Drawer switch |
| `hooks/use-scene-qc-confirmation.ts` | Owns the confirm mutation, its pending/error state, whether the day is confirmable, and the derived "open report for confirmation X" target. Keeps `scene-qc-daily-workspace.tsx` from growing. |

Prefer the shared `useTableUrlState({ from: '/studios/$studioId/scene-review/' })` for the Records table — the composed schema already uses the `page`/`limit` param names the hook expects. Verify at implementation time that it coexists with the daily tab's manual handlers on the same route; if it does not, mirror the explicit handler shape `use-scene-qc-daily.ts` already uses rather than forking the route's search ownership (**OQ-36**). Either way, use `DataTable` + `DataTableToolbar` + `DataTablePagination` primitives and put any row action behind `DataTableActions`, per `table-view-pattern`.

### 3.6 i18n

Match whatever `features/scene-qc` currently does (inline English today, per the repo's recorded deferral). Do not introduce a second convention inside one feature.

---

## 4. Test Plan

### 4.1 Backend unit specs (this PR's §12.2 responsibilities)

| §12.2 scenario | Spec file |
| --- | --- |
| Confirmation rechecks completeness inside its lock and transaction | `scene-qc-confirmation-workflow.service.spec.ts` — assert `acquireDayLock` is called **before** any read (call-order assertion on the mock), and that the eligible/evidence/review reads happen after it |
| Incomplete or blocked days cannot confirm | `scene-qc-confirmation-workflow.service.spec.ts` — one case per §1.6.2 rejection row |
| Replayed concurrent confirmation creates one next revision under the normalized hashed lock key | unit: `acquireDayLock` invoked with `scene-qc-confirmation:{studioUid}:{date}` and the exact SQL template; replay returns the existing `CURRENT` confirmation with no `appendConfirmation` call. Real concurrency in §4.2 |
| Different browser timezones resolve the same operational-date window and confirmation lineage | `scene-qc-confirmation-workflow.service.spec.ts` — two calls with the same `operational_date` under different `TZ` env values produce the identical lock key and window |
| Added / removed / rescheduled-in / rescheduled-out / reactivated / terminally-cancelled Shows produce the expected stale state | `scene-qc-confirmation-state.policy.spec.ts` — **one case per row of §1.10's table**, plus `UNCONFIRMED`, `CURRENT`, and a review-version-change case |
| A current confirmation unlocks exactly one current report revision; stale and superseded remain attributable | `scene-qc-report.service.spec.ts` |
| Reconfirmation appends a revision | `scene-qc-confirmation-workflow.service.spec.ts` (STALE → append) |
| Later Show, Client, or platform label edits do not rewrite an earlier confirmation report | `scene-qc-report.service.spec.ts` — assert the report reads item snapshot columns, never a live relation. Real-DB proof in §4.2 |
| Report totals, Client breakdowns, platform breakdowns, detail, exceptions reconcile to confirmation items | `scene-qc-report.service.spec.ts` — including the multi-platform case where platform totals exceed the Show total, and the "each Show contributes once to its Client" case |
| CSV rows reconcile to confirmation items | `scene-qc-report-csv.spec.ts` — column order matches `SCENE_QC_REPORT_CSV_COLUMNS`, one row per Show, identity columns repeated, feedback containing `,`/`"`/newline is quoted correctly, a feedback value starting with `=` is injection-prefixed, BOM present |
| Summary reports real CURRENT/STALE/UNCONFIRMED | extend `scene-qc-query.service.spec.ts`; assert the shipped hardcoded `UNCONFIRMED` path is gone |
| Records list pagination/filters | `scene-qc-records.query.service.spec.ts` — SQL-level `skip`/`take`, date filter targets `operationalDate` not `show.startTime`, studio scope predicate, range-cap rejection |
| Records detail exposes curated audit history only | `scene-qc-records.query.service.spec.ts` — negative assertion that `ip_address` / `user_agent` / raw `metadata` never appear |
| Each allowed role can confirm and read Records/report; excluded roles fail | `studio-scene-qc-confirmation.controller.spec.ts`, `studio-scene-qc-records.controller.spec.ts` |
| `report.csv` sets both headers and returns a raw string | `studio-scene-qc-confirmation.controller.spec.ts` |
| Module composition unchanged (no `AuditModule`; confirmation repository not exported) | extend `scene-qc.module.spec.ts` |

Test altitude: assert behaviour and contracts. Keep repository mock-argument assertions to the load-bearing predicates (studio scope, `confirmedAt: null` on the mark-confirmed update, the lock key, the date-range filter) — do not enumerate ORM plumbing.

### 4.2 Backend real-DB integration gate (required, and the most rigorous of the four child PRs)

This is the highest-risk transaction in the feature: cross-row, advisory-locked, append-only, with a bulk side-effect on another table. `pnpm -C apps/erify_api test:integration`, result recorded in the PR.

New: `apps/erify_api/test/integration/scene-qc-confirmation-persistence.integration-spec.ts`, following `scene-qc-review-persistence.integration-spec.ts`'s harness (real `ClsPluginTransactional` + `PrismaService`, `FakeStorageService`, `integration-scene-qc-confirmation:` name prefix, per-run unique suffixes).

1. **Concurrency — the headline test.** Two `confirmDay` calls for the same studio + operational date issued in parallel through **two independent CLS contexts** (`Promise.all` over `clsService.run(...)`) produce exactly **one** confirmation row at `revision = 1`, one audit row, and one set of items. Neither call errors. Repeat with three callers.
2. **Lock actually serializes.** With the lock statement removed (a deliberately patched repository), assertion 1 must fail — include this as a documented manual check in the PR description rather than a committed test, so the suite proves the lock is load-bearing and not incidentally passing on a fast machine.
3. `@@unique([studioId, operationalDate, revision])` rejects a hand-inserted duplicate revision.
4. **Reconfirm appends, never rewrites.** Confirm → add an eligible Show → review it → confirm again. Revision 2 exists; revision 1's row and all its item/platform rows are byte-identical (compare a full snapshot taken before).
5. **`confirmedAt` semantics.** Only previously-null reviews get stamped; a review already confirmed in revision 1 keeps its original `confirmedAt` through revision 2; no review's `version` changed; no review's `reviewedAt` changed.
6. **Rollback.** A probe that throws after the item writes rolls back the confirmation, items, platforms, `Audit`, `SceneQcAuditTarget`, **and** the `confirmedAt` stamps — assert all six tables are clean (§12.2 "confirmation rollback leaves no partial Audit or pinned-child rows").
7. **Widened CHECK.** A confirmation-only target row is accepted; profile-only and review-only still accepted; zero-set and two-set rejected.
8. **Staleness after every §5.4 change kind**, against real rows: add a Show, remove one (reschedule out), terminally cancel one, reactivate one, reschedule one into the day, and soft-delete one — six sub-cases, each asserting the summary flips to `STALE` with the expected diff counts, then back to `CURRENT` after reconfirmation.
9. **Report immutability.** After confirming, rename the Show, rename the Client, and rename the Platform. The report's Show detail, Client breakdown, and platform breakdown are unchanged; only the report's `studio.name` may follow the live studio (OQ-33) — assert that explicitly so the intent is documented.
10. **CSV ↔ report reconciliation.** CSV row count equals confirmation item count equals `scope.total_shows`; per-result CSV row counts equal `pass_count`/`minor_count`/`fail_count`.
11. **Regression:** `scene_profiles_active_client_key` still exists after this migration (the `migrate dev` DROP-INDEX hazard, §1.1.5).

### 4.3 Frontend tests (§12.3 responsibilities)

| §12.3 scenario | Test file |
| --- | --- |
| Incomplete / current / stale confirmation states expose the correct actions | `components/__tests__/scene-qc-confirmation-card.test.tsx` — four cases, including "current-report action disabled while STALE" and "Reconfirm disabled until scope complete" |
| Records uses server pagination and detail lazy loading | `hooks/__tests__/use-scene-qc-records.test.tsx` (page change refetches with new `page`), `components/__tests__/scene-qc-records-view.test.tsx` (detail query disabled until `record_id` is set) |
| URL back/forward restores records filters, pagination, and selected record | `config/__tests__/scene-qc-search-schema.test.ts` + the records hook test |
| Tab switch resets page and clears the other tab's selection | `config/__tests__/scene-qc-search-schema.test.ts` + `components/__tests__/scene-qc-workspace.test.tsx` |
| Manager-report CSV exports the full confirmation item set, not a visible UI table page | `api/__tests__/download-scene-qc-report-csv.test.ts` — asserts it calls `/report.csv` and never touches table row state |
| Records filtered-empty and loading states render | `components/__tests__/scene-qc-records-view.test.tsx` |
| Report renders all six §7.6 sections read-only, with a STALE/SUPERSEDED badge | `components/__tests__/scene-qc-report-view.test.tsx` |
| Confirm mutation invalidates exactly the Scene QC families | extend `api/__tests__/scene-qc-mutations-invalidation.test.tsx` |
| Records tab is enabled | update `components/__tests__/scene-qc-tabs.test.tsx` (or add it — Child PR 3 shipped the component without a dedicated spec) |

### 4.4 Rendered evidence (§12.4 remainder)

Playwright desktop + mobile for: complete-day confirmation; stale-day reconfirmation; Records filters and detail; manager report. (Daily queue, no-evidence blocker, missing profile, and Minor/Fail feedback were captured by Child PR 3.)

### 4.5 Verification commands

```bash
pnpm --filter @eridu/api-types lint && pnpm --filter @eridu/api-types typecheck && pnpm --filter @eridu/api-types test && pnpm --filter @eridu/api-types build
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test && pnpm --filter erify_api build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
pnpm -C apps/erify_api test:integration     # guarded real-DB gate -- record the result
pnpm architecture:signals                    # expect +0 modules, +1 repository, +0 exported repositories
pnpm agents:validate
pnpm lint:markdown
```

Plus Prisma `format` / `validate` / `generate` and the official migration command.

---

## 5. Sequencing

Linear order that avoids rework. Each step ends with something verifiable, and steps 4–11 land with their spec in the same commit.

1. **Shared contracts first.** `SCENE_QC_CONFIRMATION: 'scqcc'` in `constants.ts`; `confirmation.schemas.ts`, `records.schemas.ts`, `report.schemas.ts`; the additive `sceneQcDailySummarySchema` extension; index re-exports. → `pnpm --filter @eridu/api-types test build`. *Land as its own reviewable commit so contract review is not buried under UI diffs.*
2. **Prisma + migration.** Three models, the audit-target widening, generate, strip the spurious `DROP INDEX`, append the CUSTOM SQL CHECK swap, update the `SceneQcAuditTarget` doc comment. → `prisma format/validate/generate` + apply locally.
3. **`scene-qc-confirmation-state.policy.ts` + spec.** Pure, no dependencies, and the correctness core of the whole PR — prove it before anything depends on it.
4. **`SceneQcConfirmationRepository`** — `acquireDayLock` first (with the `isTransactionActive` assertion and its spec), then the reads, then `appendConfirmation` / `markReviewsConfirmed`.
5. **`SceneQcAuditWriter.recordDailyConfirmation`** + spec extension.
6. **`SceneQcConfirmationWorkflowService`** + spec. Wire the §8.3 chain end to end, including the OQ-19 replay guard.
7. **Wire real confirmation state into `getDailySummary`** + extend `scene-qc-query.service.spec.ts`; delete both `TODO(scene-qc-confirmation)` markers. *Do this before Records/report so the daily surface is provably correct against real confirmations.*
8. **`SceneQcRepository` Records reads** + `SceneQcRecordsQueryService` + spec.
9. **`SceneQcReportService`** + the `TODO(scene-qc-reporting)` marker + spec.
10. **`scene-qc-report-csv.ts`** + spec (quoting, BOM, injection guard, column order).
11. **Backend schemas/DTOs + both controllers + module wiring** + controller specs + `scene-qc.module.spec.ts` update. → `pnpm --filter erify_api lint typecheck test build`.
12. **Real-DB integration spec** (§4.2). *Written against the finished transaction; writing it earlier means rewriting it.*
13. **Frontend data layer**: composed search schema, query-key extension, five `api/` modules, both hooks, plus their tests.
14. **Frontend confirmation states**: `scene-qc-confirmation-card.tsx`, `scene-qc-summary-cards.tsx` swap, `handleSave` focus branch, tests. *This closes Child PR 3's explicit deferral and is independently demoable.*
15. **Frontend Records**: `scene-qc-workspace.tsx` shell, enable the tab, records view + filters + columns + detail Sheet/Drawer, tests.
16. **Frontend report**: report view + sheet + CSV download, tests.
17. **Verification sweep** (§4.5) + Playwright evidence + PR description with the refactoring-target preflight (RT-01, RT-05, RT-06), the migration notes, the `architecture:signals` delta, the integration-gate result, and the manual lock-removal check from §4.2 item 2.

---

## 6. Open Questions and Risks

Numbering continues from Child PR 3's OQ-16 so references stay unambiguous across the two breakdowns.

### 6.0 Decisions (resolved recommendations — record as accepted in the PR description)

Every item below is this breakdown's recommendation, **all now accepted** (reviewed 2026-07-28). OQ-18, OQ-24, and OQ-25 were flagged `NEEDS SIGN-OFF` by the planning pass; resolved without escalating to the user because, unlike Child PR 3's OQ-1 (a genuine two-sided tradeoff where the contested alternative had real advantages), none of these three have a competitive alternative — see the per-item rationale in §6.1.

| # | Decision |
| --- | --- |
| OQ-17 | UID prefix `SCENE_QC_CONFIRMATION: 'scqcc'`, reserved by Child PR 3's OQ-3. Not a string-prefix of any registered prefix. |
| OQ-18 | **Accepted.** Records detail exposes a **curated** audit projection (`{ id, action, actor, at, old_result, new_result, feedback_changed }`) — never `ip_address`, `user_agent`, or raw `metadata`. See §6.1. |
| OQ-19 | Inside the lock, if the latest confirmation is already `CURRENT`, `confirmDay` returns it **without appending a revision**. A new revision is appended only from `UNCONFIRMED` or `STALE`. This is what makes §10's "replayed concurrent confirmation creates one next revision" true. |
| OQ-20 | Advisory lock key is `scene-qc-confirmation:{studioUid}:{operationalDate}` — the plan's `studioId` read as the external UID, which the command already holds and which needs no pre-lock read. |
| OQ-21 | Lock issued as `txHost.tx.$executeRaw\`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))\`` guarded by `txHost.isTransactionActive()`. Deliberately **not** the `typeof tx.$executeRaw === 'function'` pattern used by `schedule-conflict.service.ts` / `publishing.service.ts` — that guard silently skips the lock under mocks. Specs must provide `$executeRaw` and assert the call. |
| OQ-22 | Confirmation sets `SceneQcReview.confirmedAt` only on rows where it is currently null. It does **not** bump `version` and does **not** rewrite `reviewedAt` (§5.3 is explicit about the latter; the former follows the repo's "bump only on semantic user-visible mutations" rule — editability is already gated by `confirmedAt`, and a bump would produce spurious 409s on an open editor). |
| OQ-23 | `CURRENT` requires both an equal `showId` set **and** matching `(reviewId, reviewVersion)` per Show. Sound only because of OQ-22; the two decisions are coupled. |
| OQ-24 | **Accepted.** Extend `sceneQcDailySummarySchema` with `confirmation_added_show_count` / `confirmation_removed_show_count` / `confirmation_changed_review_count` (nullable, non-null only when `STALE`). §7.3 requires the stale banner to list added/removed counts, and Child PR 3's locked schema has no slot for them. Purely additive. |
| OQ-25 | **Accepted.** `report.csv` stays a **backend** endpoint per §6.3, implemented as a thin serializer over the same read model the JSON endpoint returns. This is the first non-JSON response in `erify_api`; every other CSV in the monorepo is serialized client-side. See §6.1. |
| OQ-26 | Two private persistence providers, not one: Records reads extend the existing `SceneQcRepository` (it owns `SceneQcReview`); confirmation writes/reads and the report join go in a new `SceneQcConfirmationRepository`. Plan §4 says "a private repository" singular; splitting by aggregate keeps both files under the 600-LOC trigger and does not add a Nest module. |
| OQ-27 | Confirmation items denormalize `showUid` and `clientUid` alongside the `showName`/`clientName` the plan lists, and item-platform rows denormalize `platformUid`/`platformName`. §5.4 requires report queries to read confirmation rows "rather than current mutable Show relations", and the API boundary emits UIDs — without the denormalized UIDs the report would have to join the live tables it is supposed to ignore. Same reasoning as Child PR 3's OQ-4. |
| OQ-28 | Records list paginates in **SQL** (`skip`/`take` + `count`). All its filters are SQL-expressible, unlike `listDailyItems`' evidence-dependent `review_state`. Do not repeat the in-memory-pagination shape recorded in `scene-qc-daily-read-models-duplicate-evidence-resolution.md`. |
| OQ-29 | Records `date_from`..`date_to` span is capped at **92 days** (`SCENE_QC_RECORDS_MAX_RANGE_DAYS`), rejected loudly with 422 above that, mirroring OQ-11's "fail loudly, never silently truncate". `date_from <= date_to` is enforced in the same `superRefine`. |
| OQ-30 | Records **list** rows carry the cheap `confirmation_status: UNCONFIRMED \| CONFIRMED \| SUPERSEDED`. The `CURRENT` vs `STALE` distinction requires recomputing the day's eligible set and is resolved only on record **detail** and on the **report** — §6.3's `STALE`/`SUPERSEDED` labelling language is about reports, not list rows. |
| OQ-31 | Report `amended` is defined now and always `false` in Stage 1, so Stage 2 amendment support is additive. |
| OQ-32 | Percentages are server-computed to one decimal place. The asserted invariant is `pass + minor + fail === total_shows`; percentages are not asserted to sum to 100.0. |
| OQ-33 | Report identity's `studio.name` reads the **live** `Studio` row. §6.3's pinned-dimension list names Show, Client, and platform — not studio — and a Studio rename is not a report-rewriting event. Asserted explicitly in the integration spec so the asymmetry is intentional and documented. |
| OQ-34 | Three api-types files (`confirmation.schemas.ts`, `records.schemas.ts`, `report.schemas.ts`) rather than the single `records.schemas.ts` Child PR 3 predicted — same "keep each module small" rationale that split `daily-review.schemas.ts` off `schemas.ts`. |
| OQ-35 | One composed route search schema (`sceneQcSearchSchema` = daily fields + records fields). Switching `tab` resets `page: 1` and clears the other tab's exclusive selection param; `client_id`/`platform_id` deliberately survive the switch because they mean the same thing on both tabs. `scene-qc-daily-search-schema.ts` is left intact. |
| OQ-36 | Prefer `useTableUrlState({ from: '/studios/$studioId/scene-review/' })` for the Records table (the composed schema already uses `page`/`limit`). If it cannot coexist with the daily tab's manual handlers on the same route, mirror the daily tab's explicit handler shape rather than forking search ownership. **Verify at implementation time** and record which path was taken. |
| OQ-37 | The Confirm/report action lives in a new `scene-qc-confirmation-card.tsx` that replaces the placeholder 5th `StatCard` in `scene-qc-summary-cards.tsx`, keeping the summary-cards component pure presentation. |
| OQ-38 | `POST /scene-qc-confirmations` returns `200 OK` with the day's confirmation whether a revision was appended or an existing `CURRENT` one was returned. The client's next action is a summary refetch either way; a 201/200 split would invite the client to branch on an implementation detail. |

### 6.1 Resolved without escalation (reviewed 2026-07-28)

The planning pass flagged these three `NEEDS SIGN-OFF`, modeling OQ-18 as "this PR's OQ-1 analogue." On review, none of them clear the bar that made Child PR 3's OQ-1 a genuine escalation: OQ-1 had a contested alternative with real, competing advantages (the "reject" side traded away robustness to a future storage base-URL migration; the "accept" side traded away a real security property — reasonable engineers landed on both sides, which is why it went to the user). None of the three below have a competitive alternative — in each case one option is strictly better once weighed, so they're resolved here rather than passed upstream.

**OQ-18 — Records detail audit-history exposure.**

Plan §6.3 says record detail loads "available audit history", and §2/§3 give `DESIGNER`, `MANAGER`, and `ADMIN` identical Scene QC permissions. But the only existing precedent for exposing audit rows to studio users is `StudioShowController.listShowAudits` (`studio-show.controller.ts:663`), which is `@StudioProtected([ADMIN, MANAGER])` — **Designer is excluded** — and returns the full `auditApiResponseSchema` including `ip_address`, `user_agent`, and the raw `metadata` blob.

Of the three options the planning pass listed — (a) curated projection at the uniform role set, (b) raw audits gated to `[MANAGER, ADMIN]` only, (c) raw audits at the uniform role set — **(a) dominates**: it satisfies "available audit history" for its actual product purpose (who changed the result, when, from what) with zero loss, while (b) silently amends the locked §2 "identical Scene QC permissions" decision and (c) leaks reviewer IP/user-agent to Designers for no product benefit. The only cost of (a) is that Scene QC's audit projection differs from the shared `auditApiResponseSchema` shape, which is a naming/duplication cost, not a functional or security tradeoff. **Decision: (a).**

**OQ-24 — Summary contract drift.**

§7.3 requires the stale banner to list added/removed scope counts; Child PR 3 locked `sceneQcDailySummarySchema` without a slot for them, and the client cannot derive them (it never sees the pinned scope). This is a pure technical extension, not a product tradeoff — the only alternative floated (a fifth endpoint to carry three integers) is strictly worse than an additive schema field. **Decision: extend the schema as specified.**

**OQ-25 — `report.csv` as a backend endpoint.**

The repo has no other non-JSON `erify_api` response; every other CSV is serialized client-side. But plan §6.3 is not this breakdown's invention — it is the already-accepted implementation plan's own explicit design, fixing both the endpoint and its exact column list, decided when the user approved the whole plan. Deviating from it to match a generic house convention would mean overriding a specific, deliberate, already-approved decision in favor of a general default — the wrong direction for a "recommendation vs. accepted plan" conflict. The structural benefit the plan gets from a backend endpoint (the CSV is provably the complete confirmation item set, not whatever a UI table happened to have paginated to) is also real, not just plan-fidelity for its own sake. **Decision: keep the backend endpoint per §6.3, exactly as this breakdown specified in §1.8.**

### 6.2 Drift between the plan's prose and Child PR 1–3's shipped code

**OQ-39 — §8.3 step 4's "optimistic conflicts" has no referent in this command.** The confirmation request carries no version token and the confirmation table has no `version` column (it is append-only). The only genuine conflict this command can hit is a concurrent confirmation, which the advisory lock plus OQ-19's replay guard resolve without an error. Reading step 4 as "reject missing reviews and no-evidence blockers; serialize concurrent confirmations" — no separate optimistic-conflict branch. Record this reading in the PR; do not invent a `expected_confirmation_revision` field to satisfy the phrase literally.

**OQ-40 — §5.4's `SceneQcDailyConfirmationItem` field list omits the UIDs the API must emit.** Resolved by OQ-27; noted here because it is the same class of prose/implementation gap that produced Child PR 3's OQ-1/OQ-4.

**OQ-41 — §6.3's report "confirmation status" and §5.4's three-way daily state are different vocabularies.** The daily summary state is `UNCONFIRMED | CURRENT | STALE` (a property of the *day*); the report status is `CURRENT | STALE | SUPERSEDED` (a property of a *revision*). They are deliberately separate enums (`SCENE_QC_CONFIRMATION_STATE` already shipped; `SCENE_QC_REPORT_STATUS` is new). Do not merge them — `SUPERSEDED` is meaningless for a day and `UNCONFIRMED` is meaningless for a revision.

**OQ-42 — the report needs an eligible-set recomputation for a historical date to distinguish `CURRENT` from `STALE`.** `hasLaterRevision` cheaply yields `SUPERSEDED`; the remaining distinction re-runs `findEligibleShowsInWindow` + `findReviewHeadsForShows` for the confirmation's own (immutable) window. That is one extra pair of indexed reads per report request, on a surface that is not polled. Acceptable; see the residual risk below if reports ever become a hot path.

### 6.3 Residual risks (record as tech debt with a fix trigger rather than solving inline)

Matching the discipline of `scene-qc-daily-read-models-duplicate-evidence-resolution.md` and `scene-qc-profile-save-r2-probe-inside-transaction.md`, these should land as `docs/tech-debt/` entries in this PR rather than growing its scope:

1. **`scene-qc-report-status-recomputes-eligible-set.md`** — every report request re-derives the day's current eligible set to decide `CURRENT` vs `STALE` (OQ-42). *Trigger:* reports become a frequently-loaded surface, or the operational day approaches the 500-Show cap.
2. **`scene-qc-confirmation-items-cascade-with-show-delete.md`** — `SceneQcDailyConfirmationItem.showId` / `.clientId` / `.reviewId` all cascade. A hard Show or Client delete would silently remove rows from an immutable historical confirmation and change a shipped report's totals. Shows and Clients are soft-deleted in practice and no hard-delete path exists today, and `SceneQcReview.show` already accepted the same cascade in Child PR 3 — so protecting only the item rows would buy nothing while the review row still disappears. *Trigger:* a hard-delete path for Show or Client is introduced, or report immutability becomes a compliance requirement (the real fix is denormalizing the review outcome onto the item, which contradicts §6.3's read split and should be decided deliberately).
3. **Daily summary now issues a third query per poll.** `getDailySummary` gains `findLatestConfirmationWithScope` on the existing 5-minute current-day refetch. Two indexed reads on a small table; fold the note into the existing duplicate-evidence-resolution debt doc rather than opening a fourth Scene QC entry.
4. **`hashtextextended` requires PostgreSQL ≥ 11.** Verify the target environment's server version during rollout (plan §13 step 1). Not a code change; a deployment precondition to state in the PR description.
5. **Concurrency test determinism.** §4.2 item 1 depends on two real transactions overlapping. If it proves flaky in CI, keep it but gate it behind the existing guarded integration flag rather than weakening the assertion to "at most two revisions".
6. **Old and new Scene Review code still coexist on the integration branch** (Child PR 3 OQ-8). Unchanged by this PR; the main integration PR's §9 checklist remains the mitigation. Nothing here should start deleting it piecemeal.
