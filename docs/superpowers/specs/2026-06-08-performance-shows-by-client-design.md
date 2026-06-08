# 22.3 · Per-show performance graph by client

**Date**: 2026-06-08 · **Branch**: `feat/performance-shows-by-client-graph` · **Roadmap**: PHASE_4 row 22.3

## Goal

Add a second x-axis mode to the `/performance` trend graph. Today the graph buckets
GMV/Views by operational day. The new **By Show** mode plots one **selected client's**
shows across the date range (ordered by `start_time`) on the x-axis, with a metric
toggle: **GMV · Views · Peak CTR · Peak CTO**.

Multi-client overlay is **out of scope** — deferred to a future view with its own
requirements.

## Decisions (locked via brainstorm)

- **Peak CTR/CTO = true peak across loops** (max over loops × platforms), not the
  stored last-value `ShowPlatform.ctr/cto` columns. Reuses the 22.1 loop-parsing path.
- **New dedicated backend endpoint** (not client-side reuse of the paginated list).
- **Toggle on the existing trend-graph card** (not a separate card).
- **No client selected → all shows in range** (one series); the client selector narrows it.
- **Line chart**.

## Backend

New endpoint on the existing controller:

```
GET /studios/:studioId/performance/shows-series
```

- Guard/throttle identical to the other performance routes (`ADMIN`/`MANAGER`,
  `ReadBurstThrottle`).
- Query: reuse `performanceQuerySchema` (`start_date`, `end_date`, optional
  `client_id`, `show_type_id`, `platform_id`, `show_standard_id`, `has_performance`).
  Same 31-day range cap and `buildShowWhere` scoping as the summary/list endpoints.
- Returns **all** matching shows (no pagination), ordered `start_time asc`:

```ts
showPerformanceSeriesResponseSchema = {
  shows: [{ id, name, start_time, gmv, views, peak_ctr, peak_cto }],
  currency, locale,
}
```

- `gmv` = Σ stored `ShowPlatform.gmv` across active platforms (string, nullable).
- `views` = Σ stored `viewerCount` where a view-count fact was recorded (int, nullable).
- `peak_ctr` / `peak_cto` = **max across loops × platforms** for the show's latest
  finalized (`COMPLETED`/`CLOSED`) task carrying a loop schema; `null` when no such
  task or metric exists.

**Loop-parsing reuse**: extract the per-loop metric resolution currently inlined in
`getShowPerformanceLoops` into a shared private helper that, given a show + its latest
loop-bearing task, yields per-loop per-platform metric values. The single-show endpoint
keeps returning full loops; the new endpoint folds them to a per-show max. Batch the
task lookup: one `task.findMany` across all in-range show ids, grouped by show, latest
loop-bearing task wins per show — no N+1.

## Frontend

- `PerformanceTrendGraph` becomes mode-aware with a `[Daily | By Show]` segmented control.
- **Daily**: existing day-bucketed AreaChart (unchanged).
- **By Show**: Recharts `LineChart`, x = show (`name`/`start_time`), y = active metric;
  metric toggle `GMV · Views · Peak CTR · Peak CTO`. Single-client selector reusing the
  client-options source the shows-table client filter already uses. Empty state when no
  shows match.
- New state synced to URL: `chart_mode` (`daily`|`by_show`) + the existing `client_id`
  search param. The By-Show query (`usePerformanceShowsSeriesQuery`) only fires when
  `chart_mode=by_show`.
- New `@eridu/api-types/performance` schema + types; new
  `api/get-performance-shows-series.ts`.

## Testing

- Service spec: batched peak-across-loops aggregation (peak ≠ last-value; show with no
  finalized task → null peaks; multi-loop/multi-platform max), GMV/Views sums, ordering,
  range cap.
- Schema spec for the new response schema.
- FE component test: mode switch, metric toggle, no-data state, client narrowing.

## Verification

`lint` + `typecheck` + `test` + `build` on `erify_api`, `erify_studios`, `@eridu/api-types`.
