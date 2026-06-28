# Show Cancellation Gate

> **TLDR**: Studio Admin/Manager users can cancel shows through a guarded cancellation workflow. Active Duty Managers can flag a show into pending resolution from the dashboard, and Admin/Manager users sign off the final outcome. Audit rows are the cancellation history source.

## Purpose

The cancellation gate owns manual show cancellation transitions that need business reason capture, active-task protection, and readable resolution history. It keeps the broader lifecycle state machine deferred while giving studio operators a controlled way to close or resolve shows that cannot continue normally.

## Status Contract

The gate uses existing `ShowStatus.systemKey` values:

| Status | Meaning |
| --- | --- |
| `CANCELLED_PENDING_RESOLUTION` | A cancellation was requested but needs final manager sign-off. |
| `CANCELLED` | The show is closed without production credit. |
| `COMPLETED` | The cancellation was resolved as partial or completed production. |

`Show.status` is the current gate state. `Audit` rows are the durable history source for opened and resolved events.

## Actor Paths

| Actor path | Entry point | Behavior |
| --- | --- | --- |
| Studio Admin/Manager | Show detail `Cancel Show` | Can choose a reason category, note, and final outcome in one action. |
| Active Duty Manager | Dashboard operational-day show actions | Can open `CANCELLED_PENDING_RESOLUTION` with a reason category and note. |
| Studio Admin/Manager | Pending-resolution show detail | Can resolve a pending cancellation to `CANCELLED` or `COMPLETED`. |

When a user is both active Duty Manager and Admin/Manager, the active Duty Manager path takes precedence for dashboard cancellation actions. This preserves the deferred sign-off path for the on-shift operator.

## API Surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/studios/:studioId/shows/:showId/cancel-with-resolution` | Admin/Manager direct cancellation with reason and outcome. |
| `POST` | `/studios/:studioId/shows/:showId/request-cancellation-resolution` | Active Duty Manager opens pending resolution. |
| `POST` | `/studios/:studioId/shows/:showId/resolve-cancellation` | Admin/Manager signs off a pending cancellation. |
| `GET` | `/studios/:studioId/shows/:showId/cancellation-status` | Reads pending status, allowed outcomes, and cancellation history. |

The generic studio show-edit endpoint does not own these transitions. Studio show status lookups exclude `CANCELLED` and `CANCELLED_PENDING_RESOLUTION` so users do not select gate-owned statuses from the normal edit form.

## Gate Rules

- Reason category is required when opening or directly resolving a cancellation. Allowed categories are `CREATOR_UNAVAILABLE`, `ROOM_UNAVAILABLE`, `EQUIPMENT_FAILURE`, `UTILITY_OUTAGE`, `PLATFORM_ISSUE`, `CLIENT_REQUEST`, and `OTHER`.
- Final outcome is `CANCELLED` or `COMPLETED`.
- `CANCELLED` requires zero active tasks. Active tasks exclude deleted task targets, deleted tasks, and finalized task statuses (`COMPLETED`, `CLOSED`).
- `COMPLETED` remains available for partial-production outcomes and does not use the zero-active-task guard.
- Conditional status updates prevent resolving a gate if the show status changed concurrently.
- Legacy pending shows without an opening Audit row are still resolvable as `show_cancellation`, because that is the only gate kind.

## History

`ShowCancellationGateService` writes `Audit` rows with:

- target `SHOW`
- action `OVERRIDE`
- `metadata.field = show_status`
- `metadata.event = opened | resolved`
- previous and new status values
- reason category where present
- actor UID and name

`GET /cancellation-status` returns the current pending state plus chronological history so the show detail page and dashboard can display cancellation context even after final resolution.

## Related Documentation

- [Schedule Continuity](./SCHEDULE_CONTINUITY.md) — schedule publish remove/restore behavior
- [Phase 5 Roadmap](../../../docs/roadmap/PHASE_5.md) — cancellation workflow shipped as item 4
- [`show-production-lifecycle` skill](../../../.agents/skills/show-production-lifecycle/SKILL.md) — lifecycle state model and remaining readiness/completion gaps
