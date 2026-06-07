# Feature: Costs Dashboard

> **Status**: ✅ Implemented / Active  
> **Phase**: 4 — Wave 3 final feature  
> **Workstream**: L-side P&L visibility — Costs review surface  
> **Depends on**: PR 12 Fact Binding  
> **Target Route**: `/studios/:studioId/costs`  
> **Sidebar Group**: `Analytics` (alongside `/performance`)

---

## 1. Problem & Context

Currently, studio managers have no centralized view of post-production **economics and costs**. While creator rates, hourly membership rates, and shift structures are defined, and actual event/shift data is recorded via operators and task approvals, there is no single dashboard to consult the combined economic footprint of a studio. 

To bridge this gap, we need a **Costs Dashboard** similar to the `/performance` dashboard. It should aggregate:
1. **Show costs**: Sourced from show-creator assignments (base fixed/hybrid rates) and any show- or assignment-attached compensation line items (bonuses, allowances, deductions).
2. **Operator/shift costs**: Sourced from shift blocks (base hourly rate × duration) and any shift- or block-attached line items.

This dashboard will display live-computed cost figures over a shared timezone-aware operational date range, showing a stacked area trend graph of total costs and detailed paginated tables of shows and shifts.

---

## 2. Terminology & Cost Calculations

All calculations align with the locked [`economics-cost-model.md`](../domain/economics-cost-model.md):

*   **Show Cost**:
    *   **Base Subtotal**: Flat agreed rates (`agreedRate` from `ShowCreator` snapshot) of all assigned creators whose compensation package is `FIXED` or `HYBRID`. Creators with `COMMISSION` packages are ignored for base calculations.
    *   **Line Item Subtotal**: Sum of all `CompensationLineItem` amounts targeting the `Show` itself or any of the `ShowCreator` participations.
    *   **Total Cost**: Sum of Base Subtotal + Line Item Subtotal.
    *   **Unresolved Rules**: If any assigned creator has an incomplete agreement snapshot or is pending revenue (for `COMMISSION` or `HYBRID` packages), the total show cost is unresolved (`null`) and is marked with the corresponding reasons (e.g., `COMMISSION_REVENUE_NOT_AVAILABLE`, `AGREEMENT_SNAPSHOT_MISSING`).
    *   **Duration/Time-Scaling**: Creator show pay is **not** multiplied by duration or start/end deltas.
*   **Shift Cost**:
    *   **Base Subtotal**: `StudioShift.hourlyRate` × duration of all blocks within the shift.
    *   **Line Item Subtotal**: Sum of all line items targeting the `StudioShift` itself or any of its `StudioShiftBlock` blocks.
    *   **Total Cost**: Sum of Base Subtotal + Line Item Subtotal.
    *   **Time-Scaling**: Block duration uses actual timestamps (`actualStartTime`/`actualEndTime`) if both are present. If actuals are missing or incomplete (exactly one present), it falls back to planned times (`startTime`/`endTime`) and emits warnings.
    *   **Unresolved Rules**: If both actual and planned times are missing for a block, the shift cost is unresolved (`null`) with reason `PLANNED_TIME_MISSING`.

---

## 3. API Contracts (`@eridu/api-types/costs`)

### 3.1 Shared Query Schemas

```typescript
export const costsQuerySchema = z.object({
  start_date: z.iso.datetime(),
  end_date: z.iso.datetime(),
  client_id: z.union([z.string(), z.array(z.string())]).optional(),
  show_type_id: z.union([z.string(), z.array(z.string())]).optional(),
  show_standard_id: z.union([z.string(), z.array(z.string())]).optional(),
});

export const costsShowsQuerySchema = costsQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
  name: z.string().optional(),
  sort: z.string().optional(), // e.g. start_time:desc,total_cost:asc
});

export const costsShiftsQuerySchema = costsQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
  member_name: z.string().optional(), // case-insensitive contains on the shift operator's name
  role: z.string().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  sort: z.string().optional(), // e.g. date:desc,total_cost:asc
});
```

### 3.2 Response Schemas

#### `GET /studios/:studioId/costs/summary`
Returns dashboard summary statistics and daily trend data coordinates (Show vs. Shift vs. Total Costs).
```typescript
export const costsTrendCoordinateSchema = z.object({
  date: z.string(), // YYYY-MM-DD (local operational day)
  show_cost: z.string(), // decimal string
  shift_cost: z.string(), // decimal string
  total_cost: z.string(), // decimal string (show_cost + shift_cost)
});

export const costsSummaryResponseSchema = z.object({
  total_cost: z.string(),
  show_cost_subtotal: z.string(),
  shift_cost_subtotal: z.string(),
  unresolved_shows_count: z.number().int(),
  total_shows_count: z.number().int(),
  unresolved_shifts_count: z.number().int(),
  total_shifts_count: z.number().int(),
  trend: z.array(costsTrendCoordinateSchema),
  currency: z.string(),
  locale: z.string(),
});
```

#### `GET /studios/:studioId/costs/shows`
Paginated, sorted list of shows with creator and line item cost breakdowns.
```typescript
export const showCreatorCostDetailSchema = z.object({
  show_creator_uid: z.string(),
  creator_name: z.string(),
  creator_alias_name: z.string(),
  compensation_type: z.string().nullable(),
  agreed_rate: z.string().nullable(),
  commission_rate: z.string().nullable(),
  base_amount: z.string().nullable(),
  adjustment_total: z.string(),
  total_amount: z.string().nullable(),
  unresolved_reason: z.string().nullable(),
});

export const showCostResponseSchema = z.object({
  id: z.string(), // show uid
  name: z.string(),
  start_time: z.string(), // ISO datetime
  end_time: z.string(), // ISO datetime
  client_name: z.string().nullable(),
  show_type_name: z.string().nullable(),
  show_standard_name: z.string().nullable(),
  creators: z.array(showCreatorCostDetailSchema),
  line_item_subtotal: z.string(),
  total_cost: z.string().nullable(), // null if any unresolved creators
  unresolved_reasons: z.array(z.string()),
  calculation_warnings: z.array(z.string()),
  actuals_source: z.string(),
});

export const paginatedShowCostsResponseSchema = createPaginatedResponseSchema(showCostResponseSchema);
```

#### `GET /studios/:studioId/costs/shifts`
Paginated, sorted list of operator shifts with blocks and line item cost breakdowns.
```typescript
export const shiftBlockCostDetailSchema = z.object({
  block_uid: z.string(),
  start_time: z.string(), // ISO datetime
  end_time: z.string(), // ISO datetime
  actual_start_time: z.string().nullable(),
  actual_end_time: z.string().nullable(),
  duration_hours: z.string(),
  line_item_subtotal: z.string(),
  total_cost: z.string().nullable(),
  calculation_warnings: z.array(z.string()),
});

export const shiftCostResponseSchema = z.object({
  id: z.string(), // shift uid
  date: z.string(), // YYYY-MM-DD
  member_name: z.string(),
  member_role: z.string(),
  hourly_rate: z.string(),
  status: z.string(),
  blocks: z.array(shiftBlockCostDetailSchema),
  line_item_subtotal: z.string(),
  total_cost: z.string().nullable(),
  unresolved_reasons: z.array(z.string()),
  calculation_warnings: z.array(z.string()),
  actuals_source: z.string(),
});

export const paginatedShiftCostsResponseSchema = createPaginatedResponseSchema(shiftCostResponseSchema);
```

---

## 4. UI/UX Design

The Costs view will live at `/studios/:studioId/costs` and mimic the `/performance` architecture for high cohesion:

### 4.1 Navigation & Layout
- **Sidebar Revamp**: Introduce a new navigation group `"Analytics"` or `"Performance & Costs"` inside `apps/erify_studios/src/config/sidebar-config.tsx`. This group will contain:
  1. **Performance**: Link to `/studios/:studioId/performance` (icon: `TrendingUp`)
  2. **Costs**: Link to `/studios/:studioId/costs` (icon: `Receipt` or `DollarSign`)
- **Configurable Default Range**: Uses `DatePickerWithRange` to select the date range. If absent from URL, defaults to the studio settings configured range `defaultDashboardRangeDays` (or `7` days if not set).
- **Localization**: All currency figures formatted dynamically in Thai Baht (`฿`) or the studio's configured locale settings with thousands separators.

### 4.2 Dashboard Modules
1. **Summary Cards**:
   - **Total Costs**: Shows combined Show + Shift cost (green/curated palette).
   - **Show Costs Subtotal**: With unresolved shows count (e.g. `฿124,500.00 — 2 shows pending revenue`).
   - **Shift Costs Subtotal**: With unresolved shifts count (e.g. `฿48,200.00 — 1 shift pending actuals`).
2. **Costs Trend Graph**:
   - A Recharts Stacked Area chart showing **Show Costs** and **Shift Costs** stacked to display the **Total Cost**.
   - Hovering displays a tooltip breakdown.
3. **Detail Tables Section (Tabs)**:
   - Contains a Radix Tabs interface with two views:
     - **Show Costs** tab: Displays shows table with client, show type, creator list, adjustments subtotal, total cost, warnings (e.g. orange exclamation badge for planned fallback), and a details link targeting the compensation tab (`/shows/:showId/compensation`).
     - **Shift Costs** tab: Displays operator shifts table with operator name, role, date, status, duration, adjustments subtotal, total cost, warnings, and details link (`/shifts/:shiftId`).
   - Both tables support server-side pagination, server-side text search (Show Costs by show `name`, Shift Costs by operator `member_name` — both wired through the table's `columnFilters`/`onColumnFiltersChange` into the route's `*_name` search param), and multi-sort priorities synced to URL state.

---

## 5. Implementation Roadmap (Tasks 19.1–19.5)

To implement this surface cleanly, task 19 in `PHASE_4.md` is redesigned into the following five execution segments:

*   **PR 19.1: Shared API Schemas & DTO Types**
    *   Create `packages/api-types/src/costs` defining all query, summary, show-costs, and shift-costs Zod schemas.
    *   Export these schemas and infer types in `packages/api-types/src/index.ts`.
*   **PR 19.2: Backend Costs Module, Controller & Services**
    *   Create NestJS `studio-costs` module, controller, and service in `apps/erify_api/src/studios/studio-costs`.
    *   Implement pure live-calculators for show costs and shift costs, integrating DB queries for `Show`, `ShowCreator`, `StudioShift`, and `CompensationLineItem` with timezone-aware daily trend aggregation via the shared [`operational-day.util`](../../apps/erify_api/src/lib/utils/operational-day.util.ts) (shared with `StudioPerformanceService`). The trend reconciles with the reported subtotals — each resolved cost lands in exactly one operational-day bucket (`sum(trend) === subtotal`).
    *   Resolve date range defaults from a shared studio setting (`metadata.planning.defaultDashboardRangeDays`), defaulting to 7.
    *   Write service and controller unit tests matching the patterns in `studio-performance.service.spec.ts`.
*   **PR 19.3: Frontend Sidebar & Route Configuration**
    *   Add `/studios/$studioId/costs` route tree node in `apps/erify_studios/src/routes`.
    *   Modify `sidebar-config.tsx` to group `/performance` and `/costs` under a new `"Analytics"` or `"Performance & Costs"` group.
    *   Establish route guards restricting access to `ADMIN` and `MANAGER` roles only.
*   **PR 19.4: Frontend Costs Dashboard & Trend Graph**
    *   Implement the main `/costs` dashboard structure with summary card components, date picker range sync, and lazy-loaded Recharts stacked area trend graph.
*   **PR 19.5: Frontend Show & Shift Costs Tables**
    *   Build responsive, server-paginated, filterable, and sort-supported tables for Show Costs and Shift Costs using tabbed navigation.
    *   Integrate warnings/unresolved badge tooltips and links to detailed entity pages.
