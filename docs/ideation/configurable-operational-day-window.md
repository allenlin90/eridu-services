# Configurable Operational Day Window

> **Status**: Ideation

## Context

Task Review and Show Run Review use a fixed operational day window of 06:00-05:59 in the studio's local runtime. That default keeps overnight shows in a single operational day and avoids calendar-midnight splits during PR 12.4.

## Future Direction

Allow operational day boundaries to be configurable after the PR 12.4 review workflow is stable.

Potential configuration layers:

- Studio default operational day start time.
- Personal display preference for managers who review across studios or timezones.
- Export/report behavior that preserves the selected operational-day boundary.

## Impacted Surfaces

- `/studios/:studioId/task-review`
- `/studios/:studioId/show-run-review`
- `/studios/:studioId/show-operations`
- Studio dashboard operational-day cards
- Task reports and exports that group by operational day
- Future analytics dashboards from PR 12.6

## Out of Scope for PR 12.4

- Per-studio persistence for the day boundary.
- User-level preference UI.
- Historical regrouping or backfill of already signed-off ranges.
- Timezone migration for stored timestamps; persisted timestamps remain UTC instants.
