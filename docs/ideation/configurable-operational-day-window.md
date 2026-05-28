# Configurable Operational Day Window

> **Status**: Ideation

## Context

To keep the backend robust, timezone-agnostic, and decoupled from display offset logic, the frontend is responsible for computing the exact query window boundaries (e.g. 6:00 AM to 5:59 AM) using shared `operational-day-range` utilities and serializing them into absolute ISO-8601 strings. The backend accepts these explicit date range boundaries directly in the controller and queries the database using them, without doing ambient calendar offset manipulations on the server.

### Query window bounds

The Show Run Review endpoint (`GET /studios/:studioId/shows/run-review`) aggregates the full show graph for the requested window in memory, so the controller caps `date_to - date_from` at **31 days** (`SHOW_RUN_REVIEW_MAX_RANGE_DAYS`). Requests beyond that are rejected with a 400 (`"Date range must not exceed 31 days"`). The limit lives only on the backend as the single source of truth; the frontend surfaces the returned validation message rather than duplicating the bound. If configurable windows or longer analytical ranges are needed later, this aggregation must move off the synchronous in-memory path (see PR 12.6).

## Future Direction

Allow operational day boundaries to be configurable after the PR 12.4 review workflow is stable.

Potential configuration layers:

- Studio default operational day start time.
- Personal display preference for managers who review across studios or timezones.
- Export/report behavior that preserves the selected operational-day boundary.

## Impacted Surfaces

- `/studios/:studioId/task-review`
- `/studios/:studioId/show-run-review`
- `/studios/:studioId/task-setup`
- Studio dashboard operational-day cards
- Task reports and exports that group by operational day
- Future analytics dashboards from PR 12.6

## Out of Scope for PR 12.4

- Per-studio persistence for the day boundary.
- User-level preference UI.
- Historical regrouping or backfill of already signed-off ranges.
- Timezone migration for stored timestamps; persisted timestamps remain UTC instants.
