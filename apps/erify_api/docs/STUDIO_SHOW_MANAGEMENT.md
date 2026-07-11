# Studio Show Management

> **Status**: ✅ Implemented — Phase 4 Wave 1+
> **Owner app**: `apps/erify_api`

## Purpose

Studio-owned show lifecycle management without reusing `/admin/shows`:

- Create studio-scoped shows from the studio workspace
- Update show metadata, schedule association, and platform assignments inside the same studio boundary
- Soft-delete shows before start time under a hard time gate
- Restore soft-deleted shows as new operational lifecycles without reviving old workflow state

## API Surface

| Endpoint                                  | Purpose                                                           | Roles              |
| ----------------------------------------- | ----------------------------------------------------------------- | ------------------ |
| `GET /studios/:studioId/show-lookups`     | Studio-safe lookup bundle for shared show filters                 | All studio members |
| `GET /studios/:studioId/schedules`        | Searchable studio-scoped schedule lookup for show create/edit     | All studio members |
| `GET /studios/:studioId/studio-rooms`     | Searchable studio-scoped room lookup for show create/edit         | All studio members |
| `GET /studios/:studioId/shows/:showId`    | Enriched show detail for read + edit, including schedule summary  | All studio members |
| `GET /studios/:studioId/shows`            | Shared show list/read model with schedule, task, creator, platform, and actuals-state filtering | All studio members |
| `POST /studios/:studioId/shows`           | Create a studio-scoped show                                       | `ADMIN`, `MANAGER` |
| `PATCH /studios/:studioId/shows/:showId`  | Update show metadata, platform assignments, and show actuals       | `ADMIN`, `MANAGER` |
| `DELETE /studios/:studioId/shows/:showId` | Soft-delete a pre-start show and remove disposable workflow state | `ADMIN`            |
| `GET /studios/:studioId/shows/schedule-publish-impacts` | List confirmed-future and stale-conflict schedule-publish exceptions needing planner attention | All studio members |
| `POST /studios/:studioId/shows/:id/schedule-publish-impacts/:conflictUid/resolve` | Apply or dismiss a held-back stale-conflict exception | `ADMIN`, `MANAGER` |

Note: the backend does not split CRUD and operations into separate endpoint families. FE may present separate pages, but both pages reuse the same studio show read APIs and cache families.

## Design Decisions

1. **Last-write-wins**. Studio show updates do not use a `Show.version` column or compare-and-swap token. A manual studio edit can be overwritten by a later studio edit or a schedule-driven publish/import.

2. **Studio shows get their own DTOs**. Do not reuse the admin `createShowWithAssignments` / `updateShowWithAssignments` payloads for studio routes.

3. **Creator assignment is excluded from this slice**. Creator assignment remains on the existing creator-mapping surfaces. Studio show create/edit manages metadata and platform membership only.

4. **Platform editing is folded into the general studio show update payload**. No separate studio-only `PATCH .../platforms/replace` endpoint — the form edits the entire show document at once.

5. **Show-level actuals ride the show update payload**. `Show.actualStartTime` / `Show.actualEndTime` are owning-resource facts, so studio operations edit them through `PATCH /studios/:studioId/shows/:showId` using `actual_start_time` / `actual_end_time`. Creator participation actuals belong on `ShowCreator`, platform stream/performance facts belong on `ShowPlatform`, and platform violations belong in child records; those are handled by the task-input extraction workstream, not by expanding the show update DTO.

6. **Create-time required fields follow DB constraints, not the original PRD wording**. Final create requirements: `name`, `start_time`, `end_time`, `client_id`, `show_type_id`, `show_standard_id`, `show_status_id`. Optional: `external_id`, `studio_room_id`, `schedule_id`, `metadata`, `platform_ids`.

7. **Delete uses a hard time gate**. A studio admin can delete a show only when `now < show.startTime`. Started shows return a business error.

8. **Delete treats pre-start workflow state as disposable**. Soft-deletes the `Show` row and removes pre-start task workflow records so restore does not revive stale task state.

9. **Restore by external identity starts a new lifecycle**. If create receives an `external_id` and a soft-deleted show already exists under the same identity, restore that row, apply the latest payload, and do not revive old creator/platform/task workflow state beyond what the new payload recreates.

10. **`external_id` is optional in the contract but exposed in create UX**. Because restore/adopt logic depends on stable external identity, the studio app should expose `external_id` as an optional create-only input instead of hiding it behind backend-only behavior.

11. **`schedule_id` is optional in BE, required in normal FE UX**. The backend contract stays flexible and allows shows without schedules. The studio app should require schedule selection in the normal create/edit flow and expose unassigned-schedule discovery/repair on the shows page.

12. **Schedule publish can reclaim restored/manual rows**. Schedule publishing matches active shows by external identity globally, adopts valid restored/manual rows, and replaces creators/platforms from schedule data when available.

13. **Schedule linkage must preserve client consistency**. A studio show may link only to schedules belonging to the same studio and the same client as the show.

14. **Studio detail is an enriched superset response**. `GET /studios/:studioId/shows/:showId` includes current platform assignments and schedule summary, while staying compatible with current read consumers that only use base show fields.

15. **`ShowRepository.findPaginatedWithTaskSummary` is a named method, not an inlined where clause**. The list query composes AND-joined multi-field filters, OR conditions for actuals-state and task filters, AND filters for creator matching, and include joins for task summaries. These semantics cannot be expressed as a flat where clause passed from the service layer without coupling the service to Prisma query structures. The method is intentionally retained as a named repository method.

16. **`ShowRepository.findByClientUidAndExternalId` is a named method, not an inlined where clause**. The restore-on-create lookup requires a client-relation where clause (`client: { uid }`) combined with an explicit `includeDeleted` opt-in that inverts the default `deletedAt: null` guard. Neither can be expressed as a caller-supplied flat where clause without leaking relation semantics into the service layer.

17. **Schedule-publish conflicts are gated per-record on recorded actuals, not on whether the show's date has passed**. A past show with no `actualStartTime`/`actualEndTime` recorded has never actually happened operationally, so incoming sheet edits apply to it exactly as they would to a future show. A past (or otherwise terminal-adjacent) show with actuals recorded is exactly the case sheet edits must not silently overwrite — those edits are held back and routed through the stale-conflict exception queue instead.

## Key Business Rules

### Delete Rule

```text
deleteShow(studioUid, showUid)
1. load the studio-scoped show
2. if show.startTime <= now, throw SHOW_ALREADY_STARTED
3. soft-delete the show
4. soft-delete active ShowPlatform and ShowCreator join rows
5. hard-delete pre-start task workflow records rooted in that show
```

### Restore-On-Create Rule

```text
createShow(studioUid, payload)
1. if payload.externalId is absent → normal create
2. look up a soft-deleted show by (clientId + externalId)
3. if not found → normal create
4. if found → restore that row, clear deletedAt, apply the latest payload
5. do not resume prior task/creator/platform workflow state
6. sync platform assignments from the latest payload only
```

Studio scoping is validated during restore — a studio route cannot restore a show into a different studio. Schedule reassignment during restore/update must also keep `schedule.clientId === show.clientId`.

### Schedule Takeover Rule

```text
publishSchedule(scheduleUid, payload)
1. resolve active shows already linked to this schedule
2. also resolve active rows by stable external identity key (clientId + externalId)
3. if a restored/manual row is found and validation passes, adopt it by setting scheduleId
4. apply the latest schedule payload to the adopted row
5. replace creator/platform assignments from schedule data when available
6. if adoption would violate conflict rules, fail validation rather than creating a duplicate
```

**Source-of-truth principle (confirmed product decision, 2026-06-27)**: the schedule/Google Sheet republish is a bulk **input signal**, not the authoritative record — this system's own `Show.status` and `Audit` trail are the source of truth. A show that reappears in a republish after being cancelled (regardless of whether it was cancelled by a Manager's business decision or by an earlier removal) is restored unconditionally — there is no notification system, so requiring a human to notice and re-resolve every reappearance at bulk-publish scale is impractical. The expected operational discipline is to confirm and clear the Sheet content before triggering the publish, not for this system to defensively second-guess a confirmed bulk upload. The one open gap: this restore currently writes `show_status_id` directly with no `Audit` row — see [`docs/tech-debt/schedule-publish-restore-no-audit.md`](../../../docs/tech-debt/schedule-publish-restore-no-audit.md).

### Stale Conflict Rule

`PublishingService` (`apps/erify_api/src/schedule-planning/publishing.service.ts`) gates every field- and relation-level write in its `toUpdate`/`toRemove` loops on the affected show's recorded actuals, not on whether the show's start time has passed:

```text
for each show/relation row touched by a publish diff:
1. if the show's status is terminal (LIVE/COMPLETED, plus CANCELLED/CANCELLED_PENDING_RESOLUTION on the remove path):
   preserve unconditionally; auto-resolve any pending conflict for the show (it has left scope)
2. else if the show (or, for a creator/platform row, that row or its parent show) has actualStartTime/actualEndTime recorded
   AND the incoming data actually conflicts with current state:
   hold back the change; open or update a stale_conflict exception instead of writing
3. else:
   apply the change as normal (this is the common case — a past show with no recorded actuals syncs fully)
```

A held-back diff is captured as an immutable snapshot in `Audit`/`AuditTarget` (no schema migration; the same pattern `ShowCancellationGateService` uses), owned by `ScheduleConflictService` (`apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.ts`). Every FK-backed field in the snapshot (`client_id`, `studio_id`, `studio_room_id`, `show_type_id`, `show_status_id`, `show_standard_id`) is resolved to `{uid, name}` at write time — the stored snapshot never carries an internal DB id. A show carries at most one pending (`lifecycle: 'opened'`) conflict at a time; a later publish run auto-resolves it as `superseded` (diff changed), `auto_resolved_no_longer_conflicting` (nothing left to hold back, or the show left scope through any path), or leaves it untouched (identical diff, no duplicate opened).

A pending conflict surfaces via `GET .../shows/schedule-publish-impacts` as `impact_kind: 'stale_conflict'` alongside the existing `confirmed_future_*` kinds, and is resolved via `POST .../shows/:id/schedule-publish-impacts/:conflictUid/resolve` with `{ action: 'apply' | 'dismiss', reason }` (`reason` required for both). Dismiss always succeeds. Apply re-checks the show's live status against the same terminal-status set the publish path uses (rejecting `SHOW_NO_LONGER_ELIGIBLE` and auto-resolving the conflict if the show left scope another way since it was opened), then re-checks current field values against the snapshot's `old` values (rejecting `CONFLICT_STATE_CHANGED` on drift) before writing the snapshot's `new` values. Applying a time change reconciles task due dates the same way a normal publish update does; applying a `removal_held_back` conflict re-evaluates `CANCELLED` vs. `CANCELLED_PENDING_RESOLUTION` live against current task state rather than trusting the snapshot's proposal. Concurrent resolve requests and a concurrent republish's own reconciliation serialize on a `pg_advisory_xact_lock` keyed on the show's internal id — the same locking primitive `publishDiffUpsert` already uses on the schedule's id.

Known scope limits: applying a held-back diff writes only the plain scalar fields (`name`/`start_time`/`end_time`/`metadata`), not FK-backed fields, back to the `Show` row (see [`schedule-conflict-apply-fk-fields-not-written.md`](../../../docs/tech-debt/schedule-conflict-apply-fk-fields-not-written.md)); `GET .../shows/schedule-publish-impacts` pages `confirmed_future_*` and `stale_conflict` as two independently-paginated sources rather than one true cross-kind merge-sorted page (see [`schedule-publish-impacts-list-not-merge-sorted.md`](../../../docs/tech-debt/schedule-publish-impacts-list-not-merge-sorted.md)). The frontend review surface for this queue (Apply/Dismiss panel) is documented in [`apps/erify_studios/docs/STUDIO_SHOW_MANAGEMENT.md`](../../erify_studios/docs/STUDIO_SHOW_MANAGEMENT.md) § Schedule Publish Impacts.

### Platform Sync Semantics

The platform-replacement path is shared across admin and studio flows:

- keep unchanged assignments intact
- restore previously soft-deleted assignments when re-added
- soft-delete removed assignments
- create new assignments with empty metadata and null link fields

## Follow-Ups

- Studio show updates intentionally use last-write-wins. If manual studio editing becomes common enough to create real overwrite pain, revisit with a dedicated concurrency token strategy.
- Nullable `scheduleId` is a deliberate backend flexibility point. FE should treat shows without schedules as exceptional and surface a repair workflow.
- Studio room and schedule lookups now have dedicated studio-scoped search endpoints for the create/edit modal, and shared show lookups should stay lightweight for non-modal pages. Keep review pressure on lookup parity so future searchable fields do not regress into dead local-only search.
- `actuals_state=missing` means either show-level actual timestamp is absent; `actuals_state=complete` means both show-level timestamps are recorded. This powers the Phase 4 missing-actuals queue without adding settlement or payment approval semantics. Creator/platform-specific operational facts and platform violations are separate scoped records rather than aliases of `Show.actualStartTime` / `Show.actualEndTime`.
