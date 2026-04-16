# Studio Economics Review Frontend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/studio-economics-review.md`](../../../../docs/prd/studio-economics-review.md)
> **Depends on**: Economics engine contract on `master` 🔲, sidebar core regrouping 🔁 with Finance follow-up 🔲, compensation-aware backend fields 🔲

## Purpose

Define the manager-facing economics workflow in `erify_studios` as a configurable builder/result surface, plus the lightweight embedded economics preview used during show assignment workflows.

This should follow the same interaction model as task reporting where it fits:

- definition/preset entry point
- builder workspace
- preflight before generation
- inline result returned and cached by FE
- client-side sort/filter/export on the cached dataset

It should **not** behave like one hard-coded grouped table page.

## Route Plan

| Route / Surface | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/economics` | Landing view for saved definitions, preset entry points, and recent cached runs | `ADMIN`, `MANAGER` |
| `/studios/$studioId/economics/builder` | Builder/run workspace for scope, perspective, included columns/measures, preflight, and results | `ADMIN`, `MANAGER` |
| Show detail / creator-assignment economics card | Compact projected-cost preview while managing a show | existing show-detail roles |

## Primary UX Model

### 1. Landing / definitions view

Managers should not land directly on a blank table. The default entry point should help them resume recurring work:

- saved definitions list
- preset shortcuts such as:
  - `Next 7 days by show`
  - `Next 30 days by schedule`
  - `Previous 30 days by client`
  - `Planning export`
- recent cached runs when available

This matches the real usage pattern: most economics review is repeated weekly/monthly, not invented from scratch each time.

### 2. Builder flow

Recommended builder order:

1. choose date range + horizon
2. apply server-side filters
3. choose primary perspective
4. choose included columns/measures
5. preflight
6. run
7. review result
8. export or save definition

### 3. Result flow

Once a result exists, the FE should support:

- sticky summary cards above the table
- client-side search/filter/sort over the cached rows
- CSV/JSON export from the cached result
- quick return to builder mode with state preserved

## Scope and State Model

### URL-backed draft state

Keep scope and run-shaping inputs in the route URL:

- `definition_uid` (optional)
- `date_from`
- `date_to`
- `horizon`
- `perspective`
- server-side filters such as `client_uid`, `schedule_uid`, `platform_uid`, `show_status_uid`, `show_standard_uid`, `room_uid`

The URL should preserve shareable builder state and support back/forward navigation.

### Local draft state

Keep selected columns/measures and definition metadata in feature-local state until saved:

- selected identity/dimension columns
- selected economics measures
- definition name / description draft

### Cached result state

Store generated results in TanStack Query keyed by a stable run hash:

- scope
- perspective
- selected columns/measures

Result cache should support quick switching back to the last few runs without forcing a rerun.

### Embedded preview state

The show-level economics card stays query-driven and invalidates after assignment mutations. It must not share builder state with the main economics workspace.

## Perspective and Column UX

### Perspective selector

Show a small set of high-signal primary perspectives:

- `Show`
- `Schedule`
- `Client`

Platform should be surfaced in the builder as:

- a server-side scope filter
- an optional visible dimension column in result rows

Do not present `Platform` as a default additive rollup option in Phase 4 core unless the backend explicitly enables it later. The FE should treat the perspective list as backend-driven so future expansion does not require route redesign.

### Included columns/measures picker

The picker should be grouped, not flat:

1. **Primary identity**
   - show name
   - schedule name
   - client name
   - row label columns for the selected perspective

2. **Operational dimensions**
   - show date / start time
   - show status
   - show standard
   - room
   - platform names

3. **Economics totals**
   - projected total cost
   - actual total cost
   - primary total cost
   - cost state
   - unresolved reason

4. **Economics components**
   - creator base cost
   - shift labor cost
   - compensation line item cost

5. **Counts**
   - show count

The picker is about selecting visible/exported columns, not creating new formulas. FE should not imply that hiding a component column changes the underlying total.

## Preflight and Run UX

### Preflight summary

The manager should see a lightweight summary before generation:

- resulting row count for the selected perspective
- show count in scope
- unresolved / partial-cost count
- warnings for empty scope, over-limit date span, or unresolved actual-cost rows

Run stays disabled until preflight succeeds.

### Generation

Use a mutation-style run action similar to task reports:

- show progress state during generation
- receive full result inline
- cache it locally
- transition into result mode without navigation churn

If generation remains fast, keep it synchronous in Phase 4 MVP.

## Result Layout

Recommended result structure inside the builder route:

1. summary strip
   - total projected or actual primary cost
   - show count
   - unresolved row count
2. result table
   - backend-defined columns
   - explicit state chips for `PROJECTED`, `ACTUALIZED`, `PARTIAL_ACTUAL`, `UNRESOLVED`
3. client-side view toolbar
   - search
   - row-state filter
   - client/platform/status quick filters when those values exist in returned row metadata
   - export actions

The FE should avoid chart-heavy dashboards in Phase 4. The primary deliverable is a fast, trustworthy review/export table.

## Show-Level Embedded Preview

The show detail / creator-assignment surface should render a compact economics card with:

- projected total cost
- creator base cost subtotal
- shift labor subtotal
- line item subtotal when present
- unresolved state messaging when relevant
- last refreshed timestamp

After assignment changes succeed, invalidate and refetch this card from the backend. Never simulate delta math locally.

## Reuse / Decomposition Plan

Follow the task-reporting decomposition style rather than building another giant route component.

Recommended feature structure:

```text
src/features/studio-economics/
  ├── api/
  │   ├── get-economics-catalog.ts
  │   ├── preflight-economics-run.ts
  │   ├── run-economics-report.ts
  │   ├── get-economics-definitions.ts
  │   ├── create-economics-definition.ts
  │   ├── update-economics-definition.ts
  │   └── delete-economics-definition.ts
  ├── components/
  │   ├── economics-definition-list.tsx
  │   ├── economics-scope-filters.tsx
  │   ├── economics-perspective-selector.tsx
  │   ├── economics-column-picker.tsx
  │   ├── economics-preflight-card.tsx
  │   ├── economics-result-table.tsx
  │   └── show-economics-summary-card.tsx
  ├── hooks/
  │   ├── use-economics-builder.ts
  │   └── use-economics-result-view.ts
  └── lib/
      ├── economics-result-cache-key.ts
      ├── filter-economics-rows.ts
      └── serialize-economics-export.ts
```

## UX Rules

- Never calculate finance totals in FE.
- Keep projected vs actual labels explicit in cards, columns, and export headers.
- Null and partial states need explanatory copy, not empty cells.
- Treat column selection as display/export configuration, not cost-model authoring.
- Planning export should feel like a preset of this workspace, not a competing route concept.
- Preserve route/search behavior and avoid hidden client-only server filters.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke:
  - load definitions landing
  - set date/horizon/perspective and preflight
  - run result and reopen cached run
  - export CSV/JSON
  - verify unresolved-state messaging
  - verify assignment-preview refresh after show mutations
