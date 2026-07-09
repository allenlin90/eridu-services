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

**Constraint found during spec review**: `AuditRepository.findSchedulePublishImpactsForStudio` (the query the existing `schedule-publish-impacts` endpoint already runs) hard-filters on `metadata.path: ['event'], equals: 'schedule_publish_impact'` — that's how it isolates schedule-publish audits from every other audit kind on a `SHOW` target (e.g. the cancellation gate's own `metadata.event: 'opened'/'resolved'` rows, disambiguated there by `metadata.field === 'show_status'`). So `event` is a reserved key with a fixed required value for anything meant to surface through this endpoint — the opened/resolved lifecycle state needs its own field name (`lifecycle`, below), not `event`.

**Opening a conflict** — one `Audit` row per show per publish run where anything was held back, `action: 'OVERRIDE'`, target `{targetType: 'SHOW', targetId}`:

```json
{
  "event": "schedule_publish_impact",
  "impact_kind": "stale_conflict",
  "conflict_uid": "<fresh nanoid>",
  "lifecycle": "opened",
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

**Constraint found during spec review — no internal DB IDs in `held_back`.** `show_fields.old`/`new` are populated from the same diff `publishDiffUpsert` already computes, which naturally includes FK fields as internal bigints (`clientId`, `studioId`, `studioRoomId`, `showTypeId`, `showStatusId`, `showStandardId`) — per `AGENTS.md`'s "never expose DB internal IDs from API responses" and consistent with every other field on the existing `schedulePublishImpactRowSchema` (`schedule_id`, `external_id`, etc. are all already UID-shaped strings, never raw bigints). Any FK-backed field captured in `held_back` — at write time, not just at response time, since this is written into `Audit.metadata` which is what the API later serializes directly — must be resolved to its external UID plus a display label (e.g. `{ "show_type": { "uid": "shwtyp_...", "name": "..." } }`, not `{ "showTypeId": 42 }`). Plain scalar fields (`name`, `start_time`, `end_time`, `metadata`) serialize as-is.

The diff is captured as a snapshot at publish time, not recomputed live later — `Schedule.planDocument` keeps changing as the sheet is re-edited, so a live recompute at resolve time would show the wrong (newer) diff, not the one actually deferred. Payload size is small (a handful of fields/relations per show), the same order of magnitude as the existing `confirmed_future_updated` metadata.

**Resolving a conflict** — a second `Audit` row, same `event: "schedule_publish_impact"` / `impact_kind: "stale_conflict"`, `lifecycle: "resolved"`, `resolves_conflict_uid: "<the opened conflict_uid>"`, `outcome: "applied" | "dismissed" | "superseded" | "auto_resolved_no_longer_conflicting"`, real `actor_id` for `applied`/`dismissed` (null for the two system-generated outcomes). "Is this show's conflict still pending?" is derived the same way `getGateMetadata`/`getCancellationStatus` derive gate state: find `lifecycle: "opened"` rows with no later `lifecycle: "resolved"` row referencing the same `conflict_uid`.

**Re-publish while a conflict is still pending** — on *every* publish, not only when a new diff appears, each show with an unresolved conflict gets one of three outcomes from that run's held-back computation:
- **Different diff than the pending conflict** → auto-resolve the old one (`outcome: "superseded"`), open a fresh one.
- **Nothing left to hold back** (e.g. the sheet was edited back to match current DB state) → auto-resolve the old one (`outcome: "auto_resolved_no_longer_conflicting"`), open nothing new. This branch is required, not optional: without it, the old conflict stays "pending" indefinitely, and because its snapshot's `old` value would still match current DB state (nothing else touched it), a later "apply" would pass the drift check in the Resolution Flow below and silently write the stale `new` value back over current, correct data — even though nobody wants that change anymore.
- **Same diff as the pending conflict** → leave it as-is; don't open a duplicate.

## Decision Logic

### `toUpdate` (show still present in the sheet)

```
if (statusKey ∈ {LIVE, COMPLETED}):
    if a stale_conflict is currently pending for this show:
        auto-resolve it (outcome: "auto_resolved_no_longer_conflicting")  # show left scope; see Re-publish section
    preserved += 1  # unchanged, hard protect, no exception
    continue

showActualsPopulated = existing.actualStartTime || existing.actualEndTime
if showActualsPopulated and fields actually changed:
    hold back field diff (do not write); record in held_back.show_fields
else:
    apply field diff exactly as today  # fixes the bug for the common case

incomingByShowId.set(existing.id, incoming)  # relation sync always runs; gated per-row inside it
```

Inside `syncCreatorsForShow` / `syncPlatformsForShow` (same pattern for both): additions and restores of a soft-deleted row always apply (nothing active to conflict with). For an existing active row, gate on that row's own actuals **or the parent Show's actuals** — either populated, plus incoming differs/removes → held back; otherwise apply as today. A show can end up with some creators synced and one specific creator held back; that's intentional and matches the granularity the schema already models.

**Correction found during spec review — row-level gating needs the parent Show as a fallback signal.** `Show.actualStartTime`/`actualEndTime`, `ShowCreator.actualStartTime`/`actualEndTime`, and `ShowPlatform.actualStartTime`/`actualEndTime` are populated by three independent fact extractors — a show being confirmed to have happened does not guarantee every creator/platform row's own actuals fact was separately submitted. Gating purely on the row's own actuals would let a creator/platform swap sync unreviewed on a show already known to have happened, just because that specific row's actuals lag behind the show's. Falling back to the parent Show's actuals closes that gap.

### `toRemove` (show disappeared from the sheet)

```
if (statusKey ∈ {LIVE, COMPLETED, CANCELLED, CANCELLED_PENDING_RESOLUTION}):
    if a stale_conflict is currently pending for this show:
        auto-resolve it (outcome: "auto_resolved_no_longer_conflicting")  # show left scope; see Re-publish section
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

**Correction found during spec review — a pending conflict must not outlive the show leaving scope.** The "is this conflict still pending?" derivation (above) has no live-status component — it only looks at `lifecycle` rows. Left as originally specified, a show carrying a pending conflict that transitions to a terminal status through any path *other* than schedule publish (e.g. the normal task-completion lifecycle, or a direct studio-UI cancellation) would hit the terminal-status branch on every future publish and never reach the reconciliation logic in Re-publish while a conflict is still pending — the conflict would sit `lifecycle: "opened"` forever, and a planner could later apply stale sheet data onto a show that's now actually LIVE/COMPLETED/CANCELLED. The terminal-status branches above now close out any pending conflict for that show on the spot, the same `auto_resolved_no_longer_conflicting` outcome the re-publish reconciliation already uses for "nothing left to hold back" — the show has left this feature's scope entirely, which is exactly what that outcome means. This still leaves a window between the show going terminal and the next publish run (which may not come); the Apply flow's own live status re-check, below, is the defense-in-depth for that window.

`isBeforePublishDate` is dropped from both paths — fully superseded by the status check (hard) plus the actuals check (soft, reviewable). `isExistingPastOrDone` is split into two named helpers (`isTerminalStatus`, `hasRecordedActuals`) since its old single meaning no longer holds.

**Required column additions (zero new queries):** `actualStartTime`/`actualEndTime` added to the existing `currentScheduleShows` / `matchingShows` selects in `publishing.service.ts`, and to the existing `existingShowCreators` / `existingShowPlatforms` selects in `publishing-relation-sync.service.ts`. These fields piggyback on queries that already run — no new round trips.

## Resolution Flow & API

`GET .../shows/schedule-publish-impacts` — `schedulePublishImpactKindSchema` gains `'stale_conflict'`; the row schema gains `conflict_uid`, `conflict_type`, `resolution_status: 'pending' | 'applied' | 'dismissed' | 'superseded' | 'auto_resolved_no_longer_conflicting'`, and a `held_back` payload carrying real old/new values (today's `relation_changes` is counts-only, insufficient for a planner to act on).

**Constraint found during spec review — the row-projection function is in scope too.** `StudioShowManagementService.toSchedulePublishImpactRow` (`studio-show-management.service.ts:445-447`) is what actually builds the response row, and its current `impact_kind` derivation is a binary check (`confirmed_future_pending_resolution` vs. an else-fallback of `confirmed_future_updated`) with no branch for `stale_conflict`, and no extraction logic yet for `conflict_uid`/`conflict_type`/`resolution_status`/`held_back`. `findSchedulePublishImpactsForStudio`'s filter only checks `metadata.event`, not `impact_kind`, so new `stale_conflict` rows would flow through the query fine but get mislabeled as `confirmed_future_updated` by this function, with the new fields silently absent from the response. This function must be updated in the same change as the query addition above.

**Constraint found during spec review**: `StudioShowManagementService.listSchedulePublishImpacts` defaults `startDateFrom` to `new Date()` when the caller doesn't pass `start_date_from`, and `findSchedulePublishImpactsForStudio` filters `show.startTime >= startDateFrom`. That default is correct for `confirmed_future_updated`/`confirmed_future_pending_resolution` (inherently about *upcoming* shows), but it would hide every `stale_conflict` row by default — the entire point of this design is past-dated shows. The lower-bound filter needs to stop applying to `stale_conflict` rows specifically; instead, default that kind to `resolution_status: 'pending'` (unresolved-only), which is the actual "needs planner attention" scope and keeps the queue bounded without a date filter. Because Prisma can't express "opened with no matching resolved row for the same `conflict_uid`" as a plain relational `where` (it's cross-row, keyed by a JSON value), this requires a purpose-built query addition — consistent with `findSchedulePublishImpactsForStudio` already being, per its own comment, "a purpose-built review queue query, not a generic `findMany`." This is implementation-level, not further specified here, but the resulting contract must hold: the default (no explicit filters) view returns unresolved `stale_conflict` rows regardless of the show's date, alongside upcoming `confirmed_future_*` rows as today.

`POST .../shows/:id/schedule-publish-impacts/:conflictUid/resolve` — body `{ action: 'apply' | 'dismiss', reason: string }`, `@StudioProtected([ADMIN, MANAGER])`. Response on success (both actions): the updated `schedulePublishImpactRowSchema` row for this conflict (`resolution_status` now `'applied'` or `'dismissed'`) — matching the typed-response precedent `resolveShowCancellation` already sets, not a bare 200/204.

**Correction found during spec review**: the body originally specified `reason?: string` (optional), citing "matches the existing cancellation-resolution routes" — but `resolveShowCancellationSchema` actually requires `resolution_notes: z.string().min(1)`, not optional; the spec didn't match its own cited precedent. This is squarely an `OVERRIDE`-class write in `Audit` model terms (per the model's own doc comment: "reason... required-ness is enforced per writer" for override-class writes), and applying a held-back conflict means a manager is explicitly choosing to let stale sheet intent override actuals-protected data — that decision needs a recorded justification. `reason` is now `z.string().min(1)`, required for both `apply` and `dismiss`. This only applies to planner-initiated resolutions (`applied`, `dismissed`); the system-generated outcomes (`superseded`, `auto_resolved_no_longer_conflicting`) carry no actor/reason by design, whether written internally during publish or by this endpoint itself when it finds a show has already left scope (`SHOW_NO_LONGER_ELIGIBLE`, below) — in that case the request body's `reason` is accepted for validation but discarded, since the system is closing out a conflict that a planner never actually acted on.

- **Dismiss**: writes a `resolved`/`dismissed` audit event with the supplied `reason`, no data touched. Always allowed.
- **Apply**: first re-checks the show's *current* status against the same terminal-status set the publish path treats as out of scope (`LIVE`/`COMPLETED` for `update_held_back`; `LIVE`/`COMPLETED`/`CANCELLED`/`CANCELLED_PENDING_RESOLUTION` for `removal_held_back`). If the show has left scope via any path other than schedule publish since the conflict was opened, reject with `HttpError.conflict('SHOW_NO_LONGER_ELIGIBLE')` and auto-resolve the conflict as `auto_resolved_no_longer_conflicting` in the same transaction, so it stops surfacing in the queue — this is the defense-in-depth for the window between a show going terminal and the next publish run's own reconciliation. If status is still eligible, re-checks the current DB value against the snapshot's stored `old` value. If they still match, writes exactly the snapshot's `new` values (not a live recompute) plus a `resolved`/`applied` audit event with the supplied `reason`. If current state has drifted since the conflict was opened (e.g. a direct studio-UI edit in the meantime), reject with `HttpError.conflict('CONFLICT_STATE_CHANGED')` — same spirit as this codebase's existing optimistic-locking conflicts — so the planner re-reviews instead of silently overwriting something newer.
  - **Exception for `removal_held_back`**: the target status (`CANCELLED` vs. `CANCELLED_PENDING_RESOLUTION`) is *re-evaluated live* at apply time, not taken from the snapshot's `proposed_status_transition.to`. Task state can genuinely change between conflict-opened and planner-resolved; trusting a stale snapshot decision here could park a show pending-resolution when its tasks have since completed, or vice versa. The snapshot's `proposed_status_transition` is for display only in this one case.
  - **Constraint found during spec review — task due-date reconciliation.** `publishDiffUpsert`'s normal update path calls `taskService.reconcileTaskDueDates(showId, oldTimes, newTimes)` immediately after writing a show's `startTime`/`endTime` change (`publishing.service.ts:479`) — that side effect was missing from this apply flow. If the applied `held_back.show_fields` diff includes `start_time`/`end_time`, apply must call the same `reconcileTaskDueDates` in the same transaction as the field write, using the snapshot's `old`/`new` times as the before/after (they're guaranteed equal to current DB state at this point, since the drift check above just confirmed it). Skipping this would leave task due dates silently stale after a planner applies a deferred time change — exactly the kind of silent gap this whole design exists to close.
- **Double-resolve race — corrected**: a plain read-then-write is not sufficient. `Audit`/`AuditTarget` have no DB-level uniqueness on `conflict_uid`/`resolves_conflict_uid` (confirmed against `schema.prisma`), so two concurrent resolve requests can each read "no resolved row yet" in their own transaction and both insert — nothing here serializes them, low frequency reduces likelihood but not correctness. Fix: acquire `pg_advisory_xact_lock` keyed on the show's internal `id` at the start of the resolve transaction, before the read-check-then-insert — the exact pattern `publishDiffUpsert` already uses (`SELECT pg_advisory_xact_lock(${schedule.id})`) for the same class of problem. Locking on `showId` (rather than hashing `conflict_uid` into a lock key) is sufficient granularity since only one conflict can be unresolved per show at a time. The second concurrent request blocks until the first transaction commits, then re-reads and correctly sees the conflict already resolved, returning `HttpError.conflict('CONFLICT_ALREADY_RESOLVED')`.

**Correction found during spec review — the same lock must also guard publish's own reconciliation writes.** The showId lock above only serializes two resolve requests against each other. The re-publish reconciliation logic (Re-publish while a conflict is still pending, above) performs the identical read-check-then-insert over the same `Audit` rows, but runs inside `publish()`'s own transaction, which is locked on `schedule.id` — a different key that does not serialize against the resolve endpoint's `showId` lock. `publish()` must additionally acquire `pg_advisory_xact_lock` on each show's internal `id`, nested inside the already-held `schedule.id` lock, immediately before that show's reconciliation read-check-then-insert — Postgres advisory locks are session-scoped and stack cleanly, so this composes safely with the outer schedule-level lock. Whichever transaction acquires a given show's lock first now blocks the other until it commits, so a planner's apply and a concurrent republish's supersede/auto-resolve can no longer both read "unresolved" and both write a `resolved` row for the same `conflict_uid`.

**Active-task check must use the shared, correct definition, not `PublishingService`'s existing inline one.** `docs/tech-debt/schedule-publish-active-task-check-mismatch.md` already documents that `PublishingService`'s remove-path check (`tx.taskTarget.findFirst({ where: { showId, deletedAt: null, task: { deletedAt: null } } })`) disagrees with the correct definition (`TaskTargetService.countActiveByShowId`, which also excludes `COMPLETED`/`CLOSED` tasks) used by `ShowCancellationGateService`. Since this design makes that check newly correctness-sensitive at a *second*, later point in time (apply-time, not just publish-time), leaving the disagreement in place risks publish-time and apply-time disagreeing with each other, not just with the gate service. That tech-debt doc's own "Trigger to Fix" list includes "`publishing.service.ts`'s remove-path logic changes again" — which this design does. So, in scope for this change: replace `PublishingService`'s inline active-task check with `TaskTargetService.countActiveByShowId` (verified it works inside an ambient `@Transactional()` context via CLS, same as every other repository call in this codebase — no manual `tx` threading needed), and use that same helper again for the apply-time re-evaluation above. One shared definition, used at both points in time, closes both the ambiguity and the pre-existing tech debt in the same PR.

## Frontend

The existing `schedule-publish-impacts` list in `erify_studios` gains a `Review` action on rows with a pending `stale_conflict`, badged distinctly from the two existing FYI kinds (`confirmed_future_updated`/`confirmed_future_pending_resolution`), which stay read-only as today. Review opens a docked panel showing the `held_back` diff — changed show fields, held-back creators/platforms, and for `removal_held_back` the proposed status transition with a note that it's re-evaluated live at apply time (per the Exception in Resolution Flow & API) — plus a required-reason field and Apply/Dismiss actions, the same shape as `resolve-cancellation-dialog.tsx`'s existing resolve flow.

The panel reuses `ResponsiveDialog`'s existing desktop/mobile split — a right-docked sheet on desktop, a bottom drawer on mobile — rather than introducing a new one-off component. No dedicated summary card is added for the conflict queue; the existing section's row count is enough, consistent with this being a narrow, rare condition (see Performance below). A resolved row stays visible, dimmed, until the next refetch rather than disappearing immediately, so the planner sees the outcome of their action; the table itself restacks into a card list on mobile, same as the rest of this app's responsive tables.

## Performance & Async Processing

No BullMQ/worker. The actuals check adds zero new DB round trips (piggybacked columns on existing queries, see above). New audit writes only fire when a genuine conflict is detected — a narrow, real-world-rare condition (past show + populated actuals + a real incoming diff) — and production logs show `impacts=0` on nearly every publish today, so added volume is expected to be small. This exact question (BullMQ for schedule publish) is already an open, deferred ideation item — [`docs/ideation/bullmq-async-processing.md`](../../ideation/bullmq-async-processing.md) — with explicit promotion gates (P95 > 5s, gateway timeout hit, DB pool pressure, or a product need), none of which this feature triggers; that doc also notes Apps Script blocks synchronously today to print stats into the sheet, so async here isn't a drop-in swap regardless. If sequential per-show audit writes ever do become a bottleneck, the fix is the already-scoped batching work in [`docs/tech-debt/schedule-publish-sequential-audit-writes.md`](../../tech-debt/schedule-publish-sequential-audit-writes.md) — our new conflict-audit writes should ride along in that same future batching fix rather than reaching for a queue now.

## Testing Plan

- `publishing.service.spec.ts` / relation-sync spec: past+no-actuals shows sync fully (bug-fix regression test); past+Show-actuals-populated holds back fields only; past+one-creator-actuals-populated holds back just that creator while sibling creators/platforms still sync; a creator/platform row with no actuals of its own on a show where the parent Show's actuals *are* populated still holds back (regression test for the show-level actuals fallback); `LIVE`/`COMPLETED` still fully preserved (no behavior change, regression test); `toRemove` mirrors cancel-vs-hold-back; re-publish-while-pending supersedes the prior conflict with a different diff; re-publish with nothing left to hold back auto-resolves as `auto_resolved_no_longer_conflicting` (not left dangling); re-publish with the identical diff doesn't open a duplicate; a show with a pending conflict that transitions to a terminal status via a path other than publish (e.g. task completion) gets that conflict auto-resolved as `auto_resolved_no_longer_conflicting` on the very next publish, even though the held-back diff itself never changed; remove-path active-task check now uses `TaskTargetService.countActiveByShowId` (regression test: a show with only `COMPLETED`/`CLOSED` tasks is no longer treated as having active work, matching the gate service).
- `findSchedulePublishImpactsForStudio` / `listSchedulePublishImpacts` test: default (no `start_date_from`) query returns unresolved `stale_conflict` rows for a past-dated show alongside upcoming `confirmed_future_*` rows — regression test for the visibility gap found in review.
- New resolve-service tests: apply happy path (asserting the response is the updated `schedulePublishImpactRowSchema` row), apply-after-drift conflict (`CONFLICT_STATE_CHANGED`), apply rejected as `SHOW_NO_LONGER_ELIGIBLE` when the show's status has become terminal since the conflict was opened (and the conflict is auto-resolved as a side effect), dismiss, double-resolve race (both requests fired concurrently against the same `conflict_uid`, second gets `CONFLICT_ALREADY_RESOLVED` — needs an actual concurrency test, not just sequential calls, to exercise the advisory lock), a concurrent publish-run reconciliation and a resolve-apply on the same show now serialize on the shared showId lock rather than both succeeding (regression test for the resolve-vs-republish race), `removal_held_back` apply re-evaluating the active-task count live rather than trusting the snapshot, applying a held-back `start_time`/`end_time` diff calls `taskService.reconcileTaskDueDates` with the snapshot's old/new times (regression test for the gap found in review — assert on task due dates after apply, not just that the show's time changed).
- `held_back` serialization test: a diff touching an FK-backed field (e.g. `show_type_id`) round-trips through `GET .../schedule-publish-impacts` as a UID + label, never a raw bigint — regression test for the internal-ID-leak gap found in review.
- `toSchedulePublishImpactRow` test: a `stale_conflict` audit row serializes with `impact_kind: 'stale_conflict'` and its `conflict_uid`/`conflict_type`/`resolution_status`/`held_back` fields populated, not mislabeled as `confirmed_future_updated` with the new fields silently missing — regression test for the row-projection gap found in review.
- Controller test: role gating (`ADMIN`/`MANAGER` only), `action` enum validation, missing/empty `reason` rejected on both `apply` and `dismiss`, unknown `conflict_uid` → 404.
- Frontend: see Frontend above for the settled UX. Cover the `Review` action appearing only on pending `stale_conflict` rows, the Apply/Dismiss panel's required-reason gating, the desktop sheet / mobile drawer swap, and `SHOW_NO_LONGER_ELIGIBLE`/`CONFLICT_STATE_CHANGED` error surfacing in component tests.

## Related Context

- [`docs/tech-debt/schedule-publish-removal-no-audit.md`](../../tech-debt/schedule-publish-removal-no-audit.md), [`schedule-publish-restore-no-audit.md`](../../tech-debt/schedule-publish-restore-no-audit.md), [`schedule-publish-sequential-audit-writes.md`](../../tech-debt/schedule-publish-sequential-audit-writes.md) — pre-existing, separately-scoped gaps in the same code path, unaffected by this change.
- [`docs/tech-debt/schedule-publish-active-task-check-mismatch.md`](../../tech-debt/schedule-publish-active-task-check-mismatch.md) — **folded into this change**, not left unaffected: this design's remove-path edits are one of that doc's own stated triggers to fix, and leaving the disagreement in place would let publish-time and apply-time active-task checks disagree with each other. See Resolution Flow & API above.
- [`apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md`](../../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md) — source-of-truth policy this design continues to honor (schedule/sheet republish is a bulk input signal, not authoritative; `Show.status` + `Audit` trail are authoritative).
- [`docs/ideation/bullmq-async-processing.md`](../../ideation/bullmq-async-processing.md) — existing deferred decision on async processing for this same endpoint.
