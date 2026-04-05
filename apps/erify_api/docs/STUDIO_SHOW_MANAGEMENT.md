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
| `GET /studios/:studioId/show-lookups`     | Studio-safe lookup bundle for show forms, including schedules     | All studio members |
| `GET /studios/:studioId/shows/:showId`    | Enriched show detail for read + edit, including schedule summary  | All studio members |
| `GET /studios/:studioId/shows`            | Shared show list/read model with schedule-assignment filtering    | All studio members |
| `POST /studios/:studioId/shows`           | Create a studio-scoped show                                       | `ADMIN`, `MANAGER` |
| `PATCH /studios/:studioId/shows/:showId`  | Update show metadata + platform assignments                       | `ADMIN`, `MANAGER` |
| `DELETE /studios/:studioId/shows/:showId` | Soft-delete a pre-start show and remove disposable workflow state | `ADMIN`            |

Note: the backend does not split CRUD and operations into separate endpoint families. FE may present separate pages, but both pages reuse the same studio show read APIs and cache families.

## Design Decisions

1. **Last-write-wins**. Studio show updates do not use a `Show.version` column or compare-and-swap token. A manual studio edit can be overwritten by a later studio edit or a schedule-driven publish/import.

2. **Studio shows get their own DTOs**. Do not reuse the admin `createShowWithAssignments` / `updateShowWithAssignments` payloads for studio routes.

3. **Creator assignment is excluded from this slice**. Creator assignment remains on the existing creator-mapping surfaces. Studio show create/edit manages metadata and platform membership only.

4. **Platform editing is folded into the general studio show update payload**. No separate studio-only `PATCH .../platforms/replace` endpoint — the form edits the entire show document at once.

5. **Create-time required fields follow DB constraints, not the original PRD wording**. Final create requirements: `name`, `start_time`, `end_time`, `client_id`, `show_type_id`, `show_standard_id`, `show_status_id`. Optional: `external_id`, `studio_room_id`, `schedule_id`, `metadata`, `platform_ids`.

6. **Delete uses a hard time gate**. A studio admin can delete a show only when `now < show.startTime`. Started shows return a business error.

7. **Delete treats pre-start workflow state as disposable**. Soft-deletes the `Show` row and removes pre-start task workflow records so restore does not revive stale task state.

8. **Restore by external identity starts a new lifecycle**. If create receives an `external_id` and a soft-deleted show already exists under the same identity, restore that row, apply the latest payload, and do not revive old creator/platform/task workflow state beyond what the new payload recreates.

9. **`schedule_id` is optional in BE, required in normal FE UX**. The backend contract stays flexible and allows shows without schedules. The studio app should require schedule selection in the normal create/edit flow and expose unassigned-schedule discovery/repair on the shows page.

10. **Schedule publish can reclaim restored/manual rows**. Schedule publishing matches active shows by external identity globally, adopts valid restored/manual rows, and replaces creators/platforms from schedule data when available.

11. **Schedule linkage must preserve client consistency**. A studio show may link only to schedules belonging to the same studio and the same client as the show.

12. **Studio detail is an enriched superset response**. `GET /studios/:studioId/shows/:showId` includes current platform assignments and schedule summary, while staying compatible with current read consumers that only use base show fields.

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

### Platform Sync Semantics

The platform-replacement path is shared across admin and studio flows:

- keep unchanged assignments intact
- restore previously soft-deleted assignments when re-added
- soft-delete removed assignments
- create new assignments with empty metadata and null link fields

## Follow-Ups

- Studio show updates intentionally use last-write-wins. If manual studio editing becomes common enough to create real overwrite pain, revisit with a dedicated concurrency token strategy.
- Nullable `scheduleId` is a deliberate backend flexibility point. FE should treat shows without schedules as exceptional and surface a repair workflow.
- Studio room lookup is bundled into `show-lookups` to minimize new endpoints. If room lists become too large, split into a dedicated studio endpoint.
