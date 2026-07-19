---
name: operations-review-surface
description: Build erify_studios operational-day reviews with lean summaries, paginated tabs, URL state, and full-filter exports.
---

# Operations Review Surface

The PR 12.4.x Operations surfaces (`/task-review`, `/show-run-review`, `/task-setup`) share one composition pattern: an operational-day-scoped read model summarized into KPI cards plus URL-synced multi-tab DataTables, each tab lazily fetched and independently exportable. PR 19 (`/studios/:studioId/costs`) and PR 21 (`/studios/:studioId/performance`) reuse it. This skill captures that pattern so the next surface doesn't copy a monolith.

> This is the **composition** layer on top of [`table-view-pattern`](../table-view-pattern/SKILL.md). That skill owns the table mechanics (DataTable, `useTableUrlState`, pagination, current-view export). This skill owns how a multi-tab operational-review screen is assembled from those primitives. Read both.

## Canonical files

- **Route shell + summary query**: [`routes/studios/$studioId/show-run-review.tsx`](../../../apps/erify_studios/src/routes/studios/$studioId/show-run-review.tsx)
- **Container** (composition, <200 LOC): [`features/show-run-review/components/show-run-summary.tsx`](../../../apps/erify_studios/src/features/show-run-review/components/show-run-summary.tsx)
- **View model hook**: [`components/show-run-summary/use-show-run-summary.ts`](../../../apps/erify_studios/src/features/show-run-review/components/show-run-summary/use-show-run-summary.ts)
- **Generic tab panel**: [`components/show-run-summary/show-run-review-tab-panel.tsx`](../../../apps/erify_studios/src/features/show-run-review/components/show-run-summary/show-run-review-tab-panel.tsx)
- **Operational-day window math**: [`lib/operational-day-range.ts`](../../../apps/erify_studios/src/lib/operational-day-range.ts) + [`features/show-run-review/lib/show-run-review-date-range.ts`](../../../apps/erify_studios/src/features/show-run-review/lib/show-run-review-date-range.ts)
- **Summary vs paginated sub-resource queries**: [`features/shows/api/get-show-run-review-summary.ts`](../../../apps/erify_studios/src/features/shows/api/get-show-run-review-summary.ts) + [`get-show-run-review-paginated.ts`](../../../apps/erify_studios/src/features/shows/api/get-show-run-review-paginated.ts)
- **Merged-dataset review reference**: [`routes/studios/$studioId/task-review/index.tsx`](../../../apps/erify_studios/src/routes/studios/$studioId/task-review/index.tsx)
- **Backend split + guard rails**: [`api-performance-optimization` skill §8](../api-performance-optimization/SKILL.md)

## When to use / not use

**Use**: a studio review screen scoped to an operational day/range that summarizes already-extracted operational facts and drills into them across tabs; adding a tab or filter to an existing Operations surface; a new downstream read surface over the same indexed columns (costs, analytics).

**Don't use**: single-table list routes → [`table-view-pattern`](../table-view-pattern/SKILL.md). Card-based lists → [`studio-list-pattern`](../studio-list-pattern/SKILL.md). The **write** path (extraction) → [`fact-extraction-pipeline`](../fact-extraction-pipeline/SKILL.md). These surfaces are **read-only over extracted facts**; never write actuals from a review screen (see PR 12 §G — Operations review is upstream of economics).

## Lean summary + lazy sub-resources (HARD RULE)

Do **not** return one monolithic nested payload. Split the read model:

1. **One lean summary endpoint** (`run-review` / `review-stats`) returns KPI counts + the small exception lists the cards need. The route fetches this eagerly and passes it to the KPI cards.
2. **One paginated sub-resource per tab** (`run-review/{creators,violations,tasks,shows}`), each fetched **only while its tab is active** (`enabled: activeTab === 'creators'`).
3. **Summary counts and list rows derive from shared backend helpers** so the card number and the tab's row count can't drift (`api-performance-optimization` §8).

The monolithic-response anti-pattern (one endpoint returning every tab's full rows) is what PR #119 reverted. A tab the user never opens must cost zero rows.

## Composition shape (route → container → hook → panels)

Follow the repo decomposition rule — a review container that mixes 3+ tabs is a refactor target the moment it crosses ~200 LOC.

```
route (validateSearch + summary query + operational-day range)
  └─ container (KPI cards + tab nav + the active tab panel)
       ├─ <FooMetricCards data={summary} />        # pure presentation
       ├─ <FooTabNav activeTab onTabChange data /> # config-driven, no per-tab markup copy
       ├─ useFooReview({ data, search, onSearchChange, studioId })  # view model
       └─ <ReviewTabPanel ... />                    # ONE generic panel, parameterized per tab
```

- **The four tabs are one component.** A creators/violations/tasks/shows tab differs only by columns, copy, filter options, and bound query — never fork the search+filter+export+DataTable shell per tab. `ShowRunReviewTabPanel` is the reference: generic over the row type, takes `filterOptions` (first entry is the `ALL` sentinel), `columns`, `rows`, paging, and `onExport`.
- **The view-model hook owns** the lazy queries, the per-tab search/filter/pagination handlers (each resets its own page to 1), and the export workflow + `exportingTab` state. Presentation config (columns, copy, filter option lists) stays in the container.
- **Column defs live in their own module** (`columns.tsx`), keyed by the API row type (`Summary['creators']['exceptions'][number]`), so the panel stays generic.

## Operational-day window is FE-owned (06:00 → 05:59)

The window math is on the **frontend**; the backend endpoint is timezone-agnostic and validates explicit bounds.

- Compute local `06:00 → next-day 05:59` bounds via the shared `operational-day-range` / `show-run-review-date-range` utilities and serialize **absolute ISO-8601 strings** to the API. Do not send a date and let the backend guess the timezone.
- The backend caps the window (e.g. 31 days) to bound in-memory aggregation; surface the returned validation message, don't pre-guess it.
- "Current day" detection (`isCurrentShowRunReviewDay`) gates silent background refetch — only the live operational day refetches; historical ranges are stable.
- Reuse the existing range utilities; do not reimplement the 06:00 boundary inline per surface.

### Operational-day bucketing: never `.slice` UTC ISO

When the backend groups rows **into days** for a trend/series (not just filtering by a range), it must bucket by the **same operational-day definition the frontend selected**, not by the server's incidental UTC calendar.

- ❌ `someDate.toISOString().slice(0, 10)` on a **timestamp/instant** — this is **not** a date-bucketing primitive. It silently assumes UTC, so for any non-UTC studio the day boundaries fall at UTC midnight instead of the local 06:00 boundary: edge buckets are off by one and rows near local midnight land in the wrong day. (Bug fixed in PR 21.8 — the performance trend bucketed both its keys and per-show assignment this way.)
- ✅ Use the shared backend helper [`@/lib/utils/operational-day.util`](../../../apps/erify_api/src/lib/utils/operational-day.util.ts) — `deriveClientOffsetMs(startDate)` + `toOperationalDayKey(instant, offsetMs)` — to derive a timezone-aware day key from the FE-supplied `start_date`. Both `StudioPerformanceService` and `StudioCostsService` consume it; **do not re-copy these methods into a new service** (they were private duplicates until PR 19.x extracted them). The endpoint stays timezone-agnostic for *validation*; *grouping* is not.
- ⚠️ This applies outside the FE-facing review surfaces too: any backend code resolving "today"/"yesterday"/relative-day presets against the operational-day boundary (e.g. agent-facing MCP tools) must roll back by `OPERATIONAL_DAY_START_HOUR` before taking the calendar date, the same way `toOperationalDayKey` does — shifting by timezone offset alone and taking the calendar date first resolves the *next* operational day for any call made before the cutover hour. A PR adding `erify_query_shows` `date_preset` support reimplemented this independently and shipped exactly that bug; it now imports `OPERATIONAL_DAY_START_HOUR` from the shared util instead of redefining it.
- Agent-facing date controls should prefer simple date-only inputs (`YYYY-MM-DD`) or explicit presets over asking the caller to calculate ISO timestamp bounds. The server should own the operational-day conversion and document whether the date is a local operational date or an absolute instant range.
- Tests must cover calls before and after the 06:00 cutover for `today` and at least one relative preset (`yesterday` or `tomorrow`). A test that only runs after cutover can encode the buggy local-calendar behavior as expected.
- ⚠️ Exception — a **date-only column** (e.g. `StudioShift.date`, persisted at UTC-midnight of the operational day) already *is* the bucket key; `.slice(0, 10)` on it is correct because it carries no time-of-day. Only instants (`startTime`, `createdAt`, …) need the offset math. Comment the distinction at the call site.
- Range **filtering** with absolute ISO bounds is fine as-is — this rule is specifically about deriving discrete day buckets from a timestamp.

### Trend must reconcile with its subtotals

A stacked trend/series whose columns are also reported as scalar subtotals (e.g. `show_cost_subtotal`, `shift_cost_subtotal`) must satisfy `sum(trend[col]) === subtotal[col]`. The silent-failure mode: a row's bucket key falls outside the pre-seeded day range, so its cost is dropped from the trend but still counted in the subtotal — the chart no longer adds up.

- ✅ Accumulate through a helper that **lazily creates the bucket** if the key is missing, then sort the emitted series by date. Pre-seeding the full range gives contiguous days; lazy creation guarantees no resolved value is ever dropped.
- ✅ Add a regression test asserting `sum(trend) === subtotal` for a multi-day fixture (see `studio-costs.service.spec.ts › keeps the trend reconciled with the subtotals`).

## URL-synced multi-tab state

- Active tab + every tab's search/filter/page live in **validated route search params** (`validateSearch` with a Zod schema). The screen is fully shareable and back/forward-navigable.
- **Switching tabs clears the other tabs' filter/page params** so the URL stays clean (see `setActiveTab` in the view model).
- Each tab's status/severity/completeness filter is a narrowed enum in the schema; the `ALL` Select option maps to `undefined`, never a literal `'ALL'` in the URL.
- Reset the tab's page to 1 on any of its own search/filter changes.
- Represent each semantic date interval with one `DatePickerWithRange`, even when the URL/API
  contract stores separate `*_from` and `*_to` bounds. Update both bounds atomically.
- Consolidate two or more secondary filters behind one responsive `Filters` Popover/Sheet.
  Page size, refresh, and export remain outside and survive filter reset.

### `manualFiltering` search must be wired both ways AND backed by a query param

A `DataTable` with `manualFiltering` does **not** filter rows in-memory — the toolbar's search box only mutates table filter state. If you render a `<DataTableToolbar searchColumn="…">` but don't pass `columnFilters` + `onColumnFiltersChange`, and don't add the matching query param server-side, the search box is a **dead no-op**: it neither filters the page nor refetches. (Bug fixed in PR 19.x — the Shift Costs "Search operator…" box looked functional but did nothing.)

Wire all three layers, mirroring the sibling table that already works:
- **Schema + backend** — add the filter param (`member_name`) to the tab's query schema and translate it in the repository/service `where` builder (`user: { name: { contains, mode: 'insensitive' } }`).
- **Route** — add the `*_name` search param and map it into both the tab's API query and the table's `search`/`updateSearch` props.
- **Table** — derive `columnFilters` from `search.<param>` and pass `onColumnFiltersChange` that writes the trimmed value back through `updateSearch` (page → 1). The filter `id` must equal the toolbar's `searchColumn`.
- **Evidence** — add a test that typing into the search input drives the intended query state (frontend) and that the param reaches the `where` clause (backend).

### A role/enum filter must send the *persisted* value, not the UI label

When a tab filter targets a stored column (a membership `role`, a status enum), the dropdown's option **values** must be the persisted constants the `where` clause compares against — not human labels. Sending `OPERATOR`/`MANAGER` to `studioMemberships.some.role` (whose stored values are lowercase `member`/`manager`) silently matches nothing: no error, just an always-empty result. (Bug fixed in PR 19.x — the Shift Costs "Member Role" dropdown.)

Worse, a single selector can conflate **two distinct data-model concepts**. The Shift Costs role filter mixes the operator's membership role (`member`/`manager`) with the shift-level `isDutyManager` boolean — duty-manager is **not** a role. Resolve this by:
- Co-locating the option list and a `to<Filter>QueryParams(value)` translator in one feature `lib/` module so options and API params can't drift, and unit-testing the mapping.
- Translating each UI discriminator to the correct param: persisted role → `role` (lowercase `STUDIO_ROLE` value); the flag → its own boolean param (`is_duty_manager` → `where.isDutyManager`).
- Importing the persisted constants (`STUDIO_ROLE.MEMBER`, …) rather than retyping string literals.

## Per-tab "export the full filtered set" CSV

Each tab's Export action exports **every matching row across the filter, not the visible page** (see [`table-view-pattern` § Current-View Export](../table-view-pattern/SKILL.md) for the mechanics):

- Refetch the tab's endpoint with the **same active filters** and `limit = total` (the count from the tab's cached list query), then serialize client-side via shared `@/lib/csv` + `@/lib/file-download`.
- One shared `runTabExport<TRow>(tab, total, filters, fetcher, exporter)` helper in the view model — do not write four near-identical export handlers with their own try/catch.
- Per-tab pending/disabled state (`exportingTab === tab`); no-op when the filtered total is 0; show "Exporting…" on the trigger, never a silently disabled button.

## Read-only invariant

These surfaces **report** the state of already-extracted `Show` / `ShowCreator` / `ShowPlatform` / `ShowPlatformViolation` columns. They never write them — actuals are populated upstream by the extraction pipeline on task approval. A review screen that mutates an actual is a layering violation (PR 12 §G). Corrections flow through resubmitted tasks (12.4.6), not through the review DataTable.

## Checklist

- [ ] Read model is **lean summary + per-tab lazy paginated sub-resource**, not one nested payload
- [ ] Each tab query is `enabled` only when its tab is active
- [ ] Summary counts and tab rows derive from shared backend helpers (no drift)
- [ ] Task list includes (`taskListInclude` / `taskListIncludeWithSchema`) populate the target `show` and its `showPlatforms` relation (including nested `platform.name`) to ensure platform-specific metrics can render inline
- [ ] Container <200 LOC; tabs collapse into ONE generic `ReviewTabPanel`
- [ ] View-model hook owns queries + handlers + export; presentation config stays in the container
- [ ] Operational-day bounds computed FE-side via shared range utilities, serialized as absolute ISO-8601
- [ ] Backend day-bucketing (trends/series) uses the shared `operational-day.util` helper, never an inline `toISOString().slice(0, 10)` on an instant (date-only columns excepted)
- [ ] Backend relative-day/date-preset resolution has pre- and post-cutover tests and imports `OPERATIONAL_DAY_START_HOUR` from the shared util
- [ ] Trend columns reconcile with their scalar subtotals (`sum(trend) === subtotal`), guarded by a test
- [ ] Only the current operational day silently refetches
- [ ] Active tab + all tab filters/pages in validated route search; tab switch clears other tabs' params
- [ ] Semantic date intervals use one range picker; secondary filters share one responsive filter surface; resetting filters preserves view controls
- [ ] Every `manualFiltering` search box is wired end-to-end (`columnFilters`/`onColumnFiltersChange` + route `*_name` param + backend `where` filter) and proven by a test — no dead toolbar search
- [ ] Role/enum filter options send the **persisted** value (lowercase `STUDIO_ROLE`, stored enum), not the UI label; a selector spanning two concepts (role vs `isDutyManager`) maps each via a co-located, unit-tested `to<Filter>QueryParams` translator
- [ ] Per-tab CSV exports the full filtered set via one shared `runTabExport` helper + shared csv/download utils
- [ ] No write to any actuals column from the review surface

## Related skills

- [table-view-pattern](../table-view-pattern/SKILL.md) — DataTable / URL state / pagination / current-view export mechanics (the layer below this one)
- [fact-extraction-pipeline](../fact-extraction-pipeline/SKILL.md) — the upstream write path these surfaces read
- [api-performance-optimization](../api-performance-optimization/SKILL.md) — §8 summary/sub-resource split + drift guard rails
- [frontend-code-quality](../frontend-code-quality/SKILL.md) — Large Route Decomposition (container + hook + presentation)
- [frontend-ui-components](../frontend-ui-components/SKILL.md) — three-perspective component reuse for entity-scoped widgets
- [show-production-lifecycle](../show-production-lifecycle/SKILL.md) — owns the show lifecycle states and readiness conditions these surfaces report on; `/show-run-review` issue findings should feed the lifecycle's show-level issue ownership workstream
