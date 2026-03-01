# Backend Design and Implementation Plan: Schedule Diff + Upsert

## 1. Purpose

Define the backend technical design and execution plan to implement schedule publish as identity-preserving diff+upsert, aligned with:

- `apps/erify_api/docs/PRD_SCHEDULE_PLANNING_TASK_CONTINUITY.md`

Primary outcome:

- Schedule updates no longer break show-linked task continuity.

---

## 2. Scope

In scope:

1. Data model updates for stable show identity and system status keys.
2. Publish algorithm replacement (`delete/recreate` -> `diff/upsert`).
3. Remove policy for shows with tasks (`cancelled_pending_resolution`).
4. Mapping relation diff sync (MC/platform).
5. Observability, safety, and test coverage.

Out of scope:

1. New planner UX.
2. Broad API surface redesign.
3. Cross-product process changes.

---

## 3. Current State (Technical)

1. Publish currently deletes all schedule shows then recreates them.
2. Task targets link to show records, so identity churn breaks continuity.
3. Google Sheets integration actively uses 4 endpoints:
   - `POST /google-sheets/schedules/bulk`
   - `PATCH /google-sheets/schedules/:id`
   - `POST /google-sheets/schedules/:id/validate`
   - `POST /google-sheets/schedules/:id/publish`

---

## 4. Target Design

## 4.1 Data Model

### 4.1.1 `Show` identity

Add to `Show`:

1. `externalId` (Prisma) mapped to DB column `external_id` (string, nullable for legacy rows initially).
2. Unique scope: `clientId + externalId`.

Rules:

1. External UID is immutable after first association.
2. Publish matching key = `(clientId, externalId)`.

Naming contract:

1. Storage and internal BE naming use `external_id` (`externalId` in Prisma).
2. For compatibility, input payload may temporarily accept `external_uid` and normalize server-side.

### 4.1.2 `ShowStatus` machine key

Add a dedicated `systemKey` column to `ShowStatus`, separate from the existing `name` column:

1. `systemKey` (string, nullable, unique) mapped to DB column `system_key`.
2. `name` remains the human-readable display label (may be renamed/localized independently).
3. `systemKey` is machine-owned and immutable once set — all business logic resolves statuses by `systemKey`, never by `name`.
4. Nullable to allow legacy/custom statuses without a system key.

Required keys (minimum):

1. `CANCELLED`
2. `CANCELLED_PENDING_RESOLUTION`

Migration backfill for existing statuses:

| Current `name` | `systemKey` to backfill |
| --- | --- |
| `draft` | `DRAFT` |
| `confirmed` | `CONFIRMED` |
| `live` | `LIVE` |
| `completed` | `COMPLETED` |
| `cancelled` | `CANCELLED` |

Runtime behavior:

1. Resolve-or-create required statuses at runtime if missing (using `systemKey` as the lookup key).
2. No app startup hard-fail on missing status rows.
3. Resolve-or-create uses upsert on `systemKey` unique constraint for concurrency safety.

### 4.1.3 Optional audit enhancement

Optional but recommended:

1. Add source metadata field(s) on show update (`lastUpdateSource`, `lastUpdateAt`) or use JSON metadata.

---

## 4.2 Publish Conflict Policy

Policy for this phase:

1. `publish-payload-wins` for publish-owned fields at publish time.
2. Always capture source/timestamp audit metadata.

Publish-owned fields (phase 1):

| Field | Publish Overwrites? | Web App Can Edit? | Notes |
| --- | --- | --- | --- |
| `name` | Yes | Yes (overwritten on next publish) | GS is source of truth |
| `startTime`, `endTime` | Yes | Yes (overwritten on next publish) | GS is source of truth |
| `clientId` | Yes | No | GS is source of truth |
| `studioId`, `studioRoomId` | Yes | Yes (overwritten on next publish) | |
| `showTypeId`, `showStatusId`, `showStandardId` | Yes | Yes (overwritten on next publish) | |
| MC mappings | Yes | Yes (overwritten on next publish) | |
| Platform mappings | Yes | Yes (overwritten on next publish) | |
| Task assignments | No (not in publish scope) | Yes | Studio admin owns |

---

## 4.3 Remove Policy

When existing show is missing from incoming payload:

1. If no active tasks:
   - Move show status to `CANCELLED`. No soft-delete (`deletedAt` stays null).
2. If active tasks exist:
   - Move show status to `CANCELLED_PENDING_RESOLUTION`. No soft-delete (`deletedAt` stays null).
   - Preserve tasks and task targets.
   - Include in publish summary as `blocked_or_pending_resolution`.

Remove strategy is **status-only transition** (not soft-delete). This avoids unique constraint collisions on `(clientId, externalId)` that would occur if soft-deleted rows occupied the unique index.

True soft-delete (`deletedAt`) is reserved for explicit admin resolution, not automated publish flow.

Restore rule:

1. If a previously cancelled show (including `cancelled_pending_resolution`) reappears in a future publish payload, the diff treats it as "matched → update".
2. The show status is updated back to the incoming payload's status (active).
3. All related tasks and task-targets are automatically resumed to support the show.

Hard delete:

1. Privileged, explicit, audited path only (not standard publish path).

---

## 4.4 Diff + Upsert Algorithm

Transaction-level flow:

1. Load schedule by UID + version check.
2. Acquire advisory lock on schedule ID: `pg_advisory_xact_lock(schedule.id)` to serialize concurrent publishes.
3. Validate plan document and references.
4. Resolve lookup maps for refs and required statuses.
5. Query existing active shows in schedule once (including cancelled/pending-resolution statuses for restore matching).
6. Build:
   - `incomingByKey` map by `(clientId, externalId)`
   - `existingByKey` map by `(clientId, externalId)`
7. Partition:
   - create set (incoming only)
   - update set (intersection, including previously cancelled shows being restored)
   - remove set (existing only)
8. Apply writes:
   - create new shows (batch)
   - update matched shows in place (changed fields only)
   - for restored shows: update status back to active and resume related tasks/task-targets
   - apply remove policy (status-only transitions)
9. Relation sync (MC/platform) by show-level diff:
   - add missing
   - update changed metadata
   - remove stale links
10. Update schedule publish metadata/status.
11. Return deterministic summary counts.

Validation rules for external UID (in validate and publish endpoints):

1. Reject plan items with missing or empty `externalId`.
2. Reject duplicate `externalId` values within the same plan document payload.
3. Reject `externalId` values that collide with shows from a different schedule for the same client.

Performance constraints:

1. No N+1 reads.
2. Batch operations where possible.
3. Limit per-row updates to changed records.

Index strategy for query performance:

1. Add `@@unique([clientId, externalId])` on `Show`.
   - primary lookup key for diff match/upsert.
2. Keep `@@index([scheduleId, deletedAt])` and `@@index([scheduleId, startTime, deletedAt])`.
   - supports one-pass existing-show load for a schedule publish.
3. Keep `@@index([showStatusId, deletedAt])`.
   - supports pending-resolution operational queries.
4. Keep `TaskTarget @@index([showId, deletedAt])`.
   - supports batched active-task checks for remove candidates.

Rationale:

1. Strict uniqueness on `clientId + externalId` is deterministic across DB engines.
2. Avoid soft-delete conditional uniqueness complexity; do not reuse external IDs for the same client.

---

## 5. API Behavior Changes (No Surface Expansion)

No new Google Sheets endpoints required in phase 1.

Behavioral updates:

1. `POST /google-sheets/schedules/:id/publish`
   - now performs diff+upsert and remove policy
   - returns summary counts including created/updated/removed/pending-resolution/restored
   - publish summary response shape should be defined in `@eridu/api-types`
2. `POST /google-sheets/schedules/:id/validate`
   - unchanged surface, can include richer warnings later
3. `PATCH /google-sheets/schedules/:id`
   - must preserve `external_id` in planDocument entries

---

## 6. File-Level Implementation Plan

## 6.1 Prisma and DB

1. `apps/erify_api/prisma/schema.prisma`
   - add `Show.externalId @map("external_id")` (String, nullable)
   - add uniqueness/index scope on `clientId + externalId`
   - add `ShowStatus.systemKey @map("system_key")` (String, nullable, unique)
2. New migration under `apps/erify_api/prisma/migrations/*`
   - DDL: add `external_id` column to `show` table
   - DDL: add `system_key` column to `show_status` table with unique index
   - DDL: add unique index on `(client_id, external_id)` on `show` table
   - Backfill: set `system_key` for existing `show_status` rows based on `name` → SCREAMING_SNAKE_CASE mapping (e.g., `draft` → `DRAFT`, `cancelled` → `CANCELLED`)
   - Insert: add `CANCELLED_PENDING_RESOLUTION` status row if not present

## 6.2 Schedule planning schemas/services

1. `apps/erify_api/src/schedule-planning/schemas/schedule-planning.schema.ts`
   - require/validate `external_id` in show plan item
2. `apps/erify_api/src/schedule-planning/publishing.service.ts`
   - replace delete/recreate logic with diff+upsert algorithm
   - implement remove policy behavior
   - add summary reporting
3. `apps/erify_api/src/schedule-planning/validation.service.ts`
   - validate external ID presence/duplicate constraints in payload
4. `apps/erify_api/src/schedule-planning/schedule-planning.service.ts`
   - no major contract changes; ensure publish result metadata pass-through

## 6.3 Show/Task integration helpers

1. `apps/erify_api/src/models/show/show.repository.ts` (or service helpers)
   - add minimal query helpers for keyed lookups
2. Task-target existence checks can use direct `tx.taskTarget.findFirst()` within the publish transaction (no module import needed).

## 6.4 Status resolution

1. Add a lightweight status resolver service (new or in existing show-status service)
   - resolve required system keys
   - resolve-or-create runtime behavior

## 6.5 Shared API Types

1. `packages/api-types`
   - Define publish summary response schema (created/updated/removed/pending-resolution/restored counts)
   - Ensure type safety between backend publish response and Apps Script log parsing

---

## 7. Testing Plan

## 7.1 Unit tests

1. Publishing algorithm partition correctness:
   - create/update/remove sets
2. Remove policy:
   - missing show with tasks -> status set pending resolution
   - missing show without tasks -> soft delete/cancel path
3. Conflict policy:
   - publish payload overwrites publish-owned fields

## 7.2 Integration tests

1. Republish with unchanged UIDs preserves show IDs.
2. Republish with changed fields updates in place.
3. Existing tasks remain linked after republish.
4. Relation sync add/update/remove correctness.
5. Runtime status resolve-or-create behavior.

## 7.3 Regression tests

1. Existing 4 endpoint flows still pass.
2. Legacy schedules without external ID fail gracefully with clear error/warning path.

---

## 8. Rollout and Flags

1. Add feature flag for new publish semantics (recommended):
   - `SCHEDULE_PUBLISH_DIFF_UPSERT_ENABLED=true`
2. Phase rollout:
   - staging validation
   - pilot client
   - full enable

Rollback:

1. Keep old code path temporarily behind inverse flag during rollout window.

---

## 9. Observability

Emit publish metrics/log fields:

1. `shows_created`
2. `shows_updated`
3. `shows_soft_deleted_or_cancelled`
4. `shows_pending_resolution`
5. `mc_links_added/updated/removed`
6. `platform_links_added/updated/removed`
7. `publish_duration_ms`
8. `source=google_sheets`

---

## 10. Delivery Milestones

1. Milestone A:
   - schema + migration + status keys + tests
2. Milestone B:
   - diff+upsert core for shows + tests
3. Milestone C:
   - remove policy + task-safe behavior + tests
4. Milestone D:
   - mapping relation diff sync + tests
5. Milestone E:
   - observability + rollout flag + docs updates

---

## 11. Ordered Task List (Implementation Sequence)

This is the recommended execution order to minimize risk and keep testability high.

### Step 1: Data Contract Lock (BE + Integration)

1. Finalize show identity contract:
   - `external_id` required in plan document show item.
   - uniqueness scope: `client_id + external_id`.
2. Finalize status contract:
   - required system statuses:
     - `CANCELLED`
     - `CANCELLED_PENDING_RESOLUTION`
3. Finalize publish summary response shape for Apps Script logs.

### Step 2: Schema and Migration

1. Update Prisma schema:
   - `Show.externalId @map("external_id")` (String, nullable)
   - unique/index for `clientId + externalId`
   - `ShowStatus.systemKey @map("system_key")` (String, nullable, unique)
2. Create migration:
   - Add columns and indexes.
   - Backfill `system_key` for existing `show_status` rows (`draft` → `DRAFT`, `confirmed` → `CONFIRMED`, `live` → `LIVE`, `completed` → `COMPLETED`, `cancelled` → `CANCELLED`).
   - Insert `CANCELLED_PENDING_RESOLUTION` status row (with `system_key = 'CANCELLED_PENDING_RESOLUTION'`, `name = 'cancelled_pending_resolution'`).
3. Verify forward migration on local DB.
4. Add temporary backward-compatible behavior for legacy rows without `externalId`.

### Step 3: Runtime Status Resolver

1. Implement status resolver service:
   - resolve by `systemKey`
   - resolve-or-create if missing
2. Add concurrency-safe path (upsert / unique key handling).
3. Add unit tests for runtime ensure behavior.

### Step 4: Publish Core Refactor (Shows)

1. Replace destructive publish logic in `PublishingService`:
   - load existing shows once
   - compute create/update/remove sets by `(clientId, externalId)`
2. Implement in-place updates for matched shows.
3. Implement create for new shows.
4. Implement remove policy (status-only transitions, not soft-delete):
   - no tasks -> status = `CANCELLED`
   - has tasks -> status = `CANCELLED_PENDING_RESOLUTION`
5. Implement restore logic:
   - previously cancelled shows reappearing in payload -> update status back to active
   - resume related tasks and task-targets
6. Keep hard delete out of standard publish path.

### Step 5: Mapping Diff Sync (MC/Platform)

1. Add relation-level diff sync for MC links.
2. Add relation-level diff sync for platform links.
3. Ensure mapping changes do not recreate shows.
4. Add focused tests for add/update/remove relation paths.

### Step 6: Observability and Safety

1. Add publish summary counters:
   - show created/updated/removed/pending-resolution
   - MC/platform add/update/remove
2. Add structured logs for source and version.
3. Add feature flag guard for new publish path.

### Step 7: Apps Script Patch (manual-test/apps-script)

Patch order:

1. `UpdateSchedules.js`
   - include `external_id` in each show payload item.
   - stop using `show_id` as display `name`; map display name from sheet field (or fallback).
   - remove skip-on-empty-shows behavior so empty plan can sync removals.
2. `ValidateSchedules.js` / `PublishSchedules.js`
   - keep version checks.
   - add clearer logging for publish summary fields from new BE response.
3. `CreateSchedules.js`
   - harden partial-success row mapping (do not assume array position equals sheet row).
4. `Constants.js`
   - add explicit column mapping constants for `external_id` / display name to avoid index drift.
5. `Service.js`
   - keep endpoint set unchanged; optionally normalize error parsing for 4xx/5xx payloads.

### Step 8: Integrated Validation (Staging)

1. Run scripted scenario:
   - create -> update -> validate -> publish
2. Re-publish with unchanged external IDs and verify show IDs do not churn.
3. Remove show with tasks and verify `cancelled_pending_resolution`.
4. Verify tasks remain linked for matched shows.
5. Verify summary metrics/logs are present.

### Step 9: Pilot Rollout

1. Enable feature flag for pilot client(s).
2. Monitor publish latency and pending-resolution volume.
3. Collect operational feedback from studio admins.
4. Expand rollout after pilot acceptance.

### Step 10: Completion Gate

1. All PRD E2E acceptance criteria pass.
2. No continuity regressions in pilot period.
3. BE API contract stable for FE enhancements.
4. Proceed to FE phase deliverables.

---

## 12. Exit Criteria

Ready for FE implementation handoff when:

1. Backend publish no longer delete/recreates matched shows.
2. Task continuity acceptance criteria pass.
3. Publish summary contract is stable.
4. Feature flag rollout plan is validated in staging.
