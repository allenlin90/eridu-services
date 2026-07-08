# Design: Actuals-Aware Conflict Handling for Schedule Publish

## Problem

`PublishingService.publish()` (the handler behind `POST /google-sheets/schedules/:id/publish`, called by the Google Sheets Apps Script workflow after it updates and validates a schedule) silently drops sheet edits to shows whose `startTime` has already elapsed at publish time — regardless of the show's actual status.

Confirmed by reproduction against synced production data: show `show_1te9d9WrIaH0h_FxgqXy` (status `DRAFT`, already aired) had its creator assignment edited in the sheet three separate times across three separate update→validate→publish cycles. Every attempt succeeded (no validation errors — all creator UIDs were valid, active rows) yet zero `show_creators` rows exist for the show today. The cause: `isExistingPastOrDone()` in `publishing.service.ts` skips the *entire* update — field changes, creator sync, platform sync — for any show whose start time is before the publish date, via a plain date comparison that runs independently of (and in addition to) the intended status guard (`LIVE`/`COMPLETED`). No error, no audit record, and no per-show detail in the publish summary log — the show is silently folded into an aggregate `shows_preserved` counter.

The mirrored gap exists on the removal path: a `DRAFT` show that disappears from the sheet after its start time has passed is also preserved indefinitely — never actually cancelled, with no visibility.

## Root Cause

`isBeforePublishDate(show.startTime, publishDate)` is used as a proxy for "has this already happened, don't touch it." But it's a poor proxy: a past-dated `DRAFT` show that nothing has actually happened to (no actuals recorded) is exactly the kind of show sheet edits *should* still be able to correct — e.g. backfilling a creator assignment after the fact. `Show`, `ShowCreator`, and `ShowPlatform` each already carry their own `actualStartTime`/`actualEndTime` fields recording whether something operationally happened — a strictly better, already-modeled signal than a bare date comparison.

## Decision

Replace the date-based all-or-nothing skip with a per-record actuals check, on both the update and removal paths. When a conflict is detected (real data already recorded, and the incoming sheet data would change it), hold back that specific change and record it as a reviewable exception via the existing `Audit`/`AuditTarget` tables — the same event-sourced pattern `ShowCancellationGateService` already uses for cancellation gates. A planner resolves the exception (apply or dismiss) from the existing `schedule-publish-impacts` surface. Google Sheets stays a pure one-way input; all conflict resolution lives in the system.

Considered and rejected:
- **Coarse show-level lock** (hold back the whole show as one bundled diff if any actuals exist) — simpler, but a planner wanting to backfill one missing creator on an otherwise-untouched past show would have to resolve one bundled diff mixing genuinely risky and harmless changes.
- **Silent non-destructive merge with no review queue** — fully automatic, zero planner burden, but zero visibility when sheet intent genuinely conflicts with recorded reality. Rejected because it's worse for trust/debuggability than even today's coarse `shows_preserved` counter.

## Scope

**In scope:**
- `toUpdate` path: field changes (name/time/metadata/etc.), `ShowCreator` sync, `ShowPlatform` sync, for shows already present in both the sheet and the DB.
- `toRemove` path: shows that disappeared from the sheet.

**Out of scope (unchanged):**
- `creatableShows`'s skip (`isIncomingPastOrDone`) — refuses to *create* a brand-new show for an already-past date. There's no existing record to protect, so actuals-gating doesn't apply; this is "should we ever materialize a backdated show," a different question.
- The existing `confirmed_future_updated` / `confirmed_future_pending_resolution` audit paths for `CONFIRMED`-status future shows — already audited, unaffected.
- `LIVE`/`COMPLETED` (update path) and `LIVE`/`COMPLETED`/`CANCELLED`/`CANCELLED_PENDING_RESOLUTION` (removal path) stay unconditional full-preserve, no exception recorded — these are separate, already-correct protections (show currently airing, or lifecycle already closed elsewhere) that this change doesn't touch.
- No sync-back to Google Sheets. No BullMQ/worker (see Performance below).

## Data Model

No schema migration. Reuses `Audit`/`AuditTarget` exactly as `ShowCancellationGateService` and `recordSchedulePublishImpact` already do — an immutable, event-sourced log, not a mutable resolution flag.

**Opening a conflict** — one `Audit` row per show per publish run where anything was held back, `action: 'OVERRIDE'`, target `{targetType: 'SHOW', targetId}`:

```json
{
  "event": "opened",
  "conflict_uid": "<fresh nanoid>",
  "impact_kind": "stale_conflict",
  "schedule_uid": "...",
  "external_id": "...",
  "conflict_type": "update_held_back" | "removal_held_back",
  "held_back": {
    "show_fields": { "changed_fields": ["name", "start_time"], "old": {...}, "new": {...} } | null,
    "show_creators": [{ "creator_uid": "...", "action": "update" | "remove", "old_note": "...", "new_note": "..." }],
    "show_platforms": [{ "platform_uid": "...", "action": "update" | "remove", "old": {...}, "new": {...} }],
    "proposed_status_transition": { "from": "DRAFT", "to": "CANCELLED" | "CANCELLED_PENDING_RESOLUTION" } | null
  },
  "source": "google_sheets_schedule_publish"
}
```

`proposed_status_transition` is populated only for `conflict_type: "removal_held_back"` (the other three `held_back` keys are `null`/empty for that kind, and vice versa). The show's status is left completely untouched while a removal conflict is pending — it stays whatever it was at publish time until a planner resolves the conflict.

The diff is captured as a snapshot at publish time, not recomputed live later — `Schedule.planDocument` keeps changing as the sheet is re-edited, so a live recompute at resolve time would show the wrong (newer) diff, not the one actually deferred. Payload size is small (a handful of fields/relations per show), the same order of magnitude as the existing `confirmed_future_updated` metadata.

**Resolving a conflict** — a second `Audit` row, `event: "resolved"`, `resolves_conflict_uid: "<the opened conflict_uid>"`, `outcome: "applied" | "dismissed" | "superseded"`, real `actor_id` (never null, unlike publish's system-actor writes). "Is this show's conflict still pending?" is derived the same way `getGateMetadata`/`getCancellationStatus` derive gate state: find `opened` events with no later `resolved` event referencing the same `conflict_uid`.

**Re-publish while still pending**: if a later publish detects a new/different diff for a show that already has an unresolved conflict, auto-resolve the old one (`outcome: "superseded"`) and open a fresh one — the queue always reflects the sheet's current intent, not a stale snapshot from days ago.

## Decision Logic

### `toUpdate` (show still present in the sheet)

```
if (statusKey ∈ {LIVE, COMPLETED}):
    preserved += 1  # unchanged, hard protect, no exception
    continue

showActualsPopulated = existing.actualStartTime || existing.actualEndTime
if showActualsPopulated and fields actually changed:
    hold back field diff (do not write); record in held_back.show_fields
else:
    apply field diff exactly as today  # fixes the bug for the common case

incomingByShowId.set(existing.id, incoming)  # relation sync always runs; gated per-row inside it
```

Inside `syncCreatorsForShow` / `syncPlatformsForShow` (same pattern for both): additions and restores of a soft-deleted row always apply (nothing active to conflict with). For an existing active row, gate on that row's own actuals — populated + incoming differs/removes → held back; otherwise apply as today. A show can end up with some creators synced and one specific creator held back; that's intentional and matches the granularity the schema already models.

### `toRemove` (show disappeared from the sheet)

```
if (statusKey ∈ {LIVE, COMPLETED, CANCELLED, CANCELLED_PENDING_RESOLUTION}):
    preserved += 1  # unchanged
    continue

if isConfirmedFuture(removed, publishStartedAt):
    ... existing audited pending_resolution path, unchanged ...
    continue

if removed.actualStartTime || removed.actualEndTime:
    hold back the cancel; open conflict_type = "removal_held_back"
    continue

... apply cancel / cancelled_pending_resolution exactly as today ...
# this also fixes past DRAFT shows that vanished from the sheet but were
# never actually cancelled under the old date-based preserve
```

`isBeforePublishDate` is dropped from both paths — fully superseded by the status check (hard) plus the actuals check (soft, reviewable). `isExistingPastOrDone` is split into two named helpers (`isTerminalStatus`, `hasRecordedActuals`) since its old single meaning no longer holds.

**Required column additions (zero new queries):** `actualStartTime`/`actualEndTime` added to the existing `currentScheduleShows` / `matchingShows` selects in `publishing.service.ts`, and to the existing `existingShowCreators` / `existingShowPlatforms` selects in `publishing-relation-sync.service.ts`. These fields piggyback on queries that already run — no new round trips.

## Resolution Flow & API

`GET .../shows/schedule-publish-impacts` — `schedulePublishImpactKindSchema` gains `'stale_conflict'`; the row schema gains `conflict_uid`, `conflict_type`, `resolution_status: 'pending' | 'applied' | 'dismissed' | 'superseded'`, and a `held_back` payload carrying real old/new values (today's `relation_changes` is counts-only, insufficient for a planner to act on).

`POST .../shows/:id/schedule-publish-impacts/:conflictUid/resolve` — body `{ action: 'apply' | 'dismiss', reason?: string }`, `@StudioProtected([ADMIN, MANAGER])`, matching the existing cancellation-resolution routes.

- **Dismiss**: writes a `resolved`/`dismissed` audit event, no data touched. Always allowed.
- **Apply**: re-checks the current DB value against the snapshot's stored `old` value first. If they still match, writes exactly the snapshot's `new` values (not a live recompute) plus a `resolved`/`applied` audit event. If current state has drifted since the conflict was opened (e.g. a direct studio-UI edit in the meantime), reject with `HttpError.conflict('CONFLICT_STATE_CHANGED')` — same spirit as this codebase's existing optimistic-locking conflicts — so the planner re-reviews instead of silently overwriting something newer.
  - **Exception for `removal_held_back`**: the target status (`CANCELLED` vs. `CANCELLED_PENDING_RESOLUTION`) is *re-evaluated live* via the same active-task check `PublishingService` uses at publish time (or, per the existing tech-debt item, the shared helper `ShowCancellationGateService` uses), not taken from the snapshot's `proposed_status_transition.to`. Task state can genuinely change between conflict-opened and planner-resolved; trusting a stale snapshot decision here could park a show pending-resolution when its tasks have since completed, or vice versa. The snapshot's `proposed_status_transition` is for display only in this one case.
- **Double-resolve race**: re-verify no `resolved` event already exists for the `conflict_uid` before inserting; a second concurrent attempt gets `HttpError.conflict('CONFLICT_ALREADY_RESOLVED')`. A read-then-write check is sufficient here — low-frequency admin action, not a hot path.

## Performance & Async Processing

No BullMQ/worker. The actuals check adds zero new DB round trips (piggybacked columns on existing queries, see above). New audit writes only fire when a genuine conflict is detected — a narrow, real-world-rare condition (past show + populated actuals + a real incoming diff) — and production logs show `impacts=0` on nearly every publish today, so added volume is expected to be small. This exact question (BullMQ for schedule publish) is already an open, deferred ideation item — [`docs/ideation/bullmq-async-processing.md`](../../ideation/bullmq-async-processing.md) — with explicit promotion gates (P95 > 5s, gateway timeout hit, DB pool pressure, or a product need), none of which this feature triggers; that doc also notes Apps Script blocks synchronously today to print stats into the sheet, so async here isn't a drop-in swap regardless. If sequential per-show audit writes ever do become a bottleneck, the fix is the already-scoped batching work in [`docs/tech-debt/schedule-publish-sequential-audit-writes.md`](../../tech-debt/schedule-publish-sequential-audit-writes.md) — our new conflict-audit writes should ride along in that same future batching fix rather than reaching for a queue now.

## Testing Plan

- `publishing.service.spec.ts` / relation-sync spec: past+no-actuals shows sync fully (bug-fix regression test); past+Show-actuals-populated holds back fields only; past+one-creator-actuals-populated holds back just that creator while sibling creators/platforms still sync; `LIVE`/`COMPLETED` still fully preserved (no behavior change, regression test); `toRemove` mirrors cancel-vs-hold-back; re-publish-while-pending supersedes the prior conflict.
- New resolve-service tests: apply happy path, apply-after-drift conflict, dismiss, double-resolve race.
- Controller test: role gating (`ADMIN`/`MANAGER` only), `action` enum validation, unknown `conflict_uid` → 404.
- Frontend: extend the existing impacts list (`erify_studios`) with the new `stale_conflict` kind and apply/dismiss actions. Exact visual treatment is left to implementation rather than specified here.

## Related Context

- [`docs/tech-debt/schedule-publish-removal-no-audit.md`](../../tech-debt/schedule-publish-removal-no-audit.md), [`schedule-publish-restore-no-audit.md`](../../tech-debt/schedule-publish-restore-no-audit.md), [`schedule-publish-sequential-audit-writes.md`](../../tech-debt/schedule-publish-sequential-audit-writes.md), [`schedule-publish-active-task-check-mismatch.md`](../../tech-debt/schedule-publish-active-task-check-mismatch.md) — pre-existing, separately-scoped gaps in the same code path, unaffected by this change.
- [`apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md`](../../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md) — source-of-truth policy this design continues to honor (schedule/sheet republish is a bulk input signal, not authoritative; `Show.status` + `Audit` trail are authoritative).
- [`docs/ideation/bullmq-async-processing.md`](../../ideation/bullmq-async-processing.md) — existing deferred decision on async processing for this same endpoint.
