# Analytics Dashboard Design Plan

> **Status**: ⚠️ **Superseded** — This in-app analytics approach (`TaskAnalyticsSnapshot` + Recharts) has been replaced by a Datastream + BigQuery data warehouse strategy. See [Phase 4 Roadmap](../roadmap/PHASE_4.md#5-operational-data-warehouse-datastream--bigquery) and [Data Warehouse Design](./DATA_WAREHOUSE_DESIGN.md) (to be written). This document is retained for historical reference only.

## Goal Description (Original)
Implement an Analytics Dashboard to check on task submissions and summarize operational performance. This dashboard will give Studio Admins and Managers insights into task completion rates, identifying bottlenecks by task template, and tracking overdue tasks. For regular Studio Members, it will be scoped only to their own assignments.

## Proposed Changes

### Prisma Schema (`@eridu/api` / `packages/prisma`)

#### [NEW] `TaskAnalyticsSnapshot` model
Since past tasks are immutable and recalculating heavy aggregations on the fly is inefficient, we will create a dedicated table to store pre-calculated, time-bound snapshots of operational performance:

```prisma
model TaskAnalyticsSnapshot {
  id              BigInt   @id @default(autoincrement())
  uid             String   @unique
  studioId        BigInt   @map("studio_id")
  studio          Studio   @relation(fields: [studioId], references: [id], onDelete: Cascade)
  // Optional: User ID if this snapshot is scoped to an individual's performance
  userId          BigInt?  @map("user_id")
  user            User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  periodStart     DateTime @map("period_start") // e.g. start of day/week/month
  periodEnd       DateTime @map("period_end")   // e.g. end of day/week/month
  periodType      String   @map("period_type")  // 'DAILY', 'WEEKLY', 'MONTHLY'
  
  // JSONB storage for all pre-calculated metrics
  // Includes: overview stats, byStatus array, byType array, byTemplate array
  metrics         Json     @map("metrics")
  
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([studioId, periodType, periodStart])
  @@index([userId, periodType, periodStart])
  @@map("task_analytics_snapshots")
}
```

### Charting Library Choice
We will use **Recharts** wrapped in **Shadcn UI's `<Chart>` components**. 
*Why?* The repository (`@eridu/ui/src/styles/globals.css`) already defines Shadcn's CSS variables for charts (`--chart-1` through `--chart-5`), meaning Shadcn charting is structurally supported. Recharts provides highly accessible, SVG-based declarative components that look great out of the box and align with the existing UI components perfectly.

### @eridu/api-types
Shared schemas for the new analytics endpoint.
---
#### [MODIFY] `task.schema.ts`
- Add `taskAnalyticsResponseSchema` Zod schema and export the infer type.
- The structure will align with the JSONB `metrics` column:
  - `overview`: `totalTasks`, `completionRate`, `overdueCount`
  - `byStatus`: Array of `{ status: TaskStatus, count: number }`
  - `byType`: Array of `{ type: TaskType, count: number }`
  - `byTemplate`: Array of `{ templateUid, templateName, totalTasks, completionRate }`

### apps/erify_api
Backend endpoints to serve the aggregated data.
---
#### [MODIFY] `task.schema.ts`
- Export the `TaskAnalyticsResponseDto`.

#### [MODIFY] `studio-task.controller.ts`
- Add `GET /studios/:studioId/tasks/analytics` endpoint.
- **Role-based Scoping**: 
  - If the caller is `ADMIN` or `MANAGER`, fetch studio-scoped analytics (where `userId` is null).
  - If the caller is `MEMBER`, fetch user-scoped analytics (where `userId` = their ID).
- Pass optional `periodStart` and `periodEnd` queries.

*Note on Data Population:* 
We will implement a cron job or a trigger down the line that actually *generates* these snapshots into the DB. For this initial phase, the endpoint can perform the live aggregation and *cache* it into `TaskAnalyticsSnapshot` if a snapshot for the current period doesn't exist yet (lazy evaluation).

### apps/erify_studios
The Frontend Studio Dashboard.
---
#### [NEW] `get-task-analytics.ts`
- Create TanStack Query hook `useTaskAnalytics(studioId, period)`.

#### [MODIFY] `dashboard.tsx`
- Utilize Shadcn's Charting components with Recharts.
- The layout will show different "Scope" banners if you are a Member vs an Admin ("My Performance" vs "Studio Performance").
- **Top Row**: 3 Metric Cards (Total Tasks, Overdue Tasks with red urgency styling, Overall Completion Rate).
- **Middle Row**: Two charts side-by-side using `<Chart>`:
  - A Pie/Donut Chart showing task breakdown by `status` (PENDING, IN_PROGRESS, REVIEW, COMPLETED).
  - A Bar Chart showing task breakdown by `type` (SETUP, ACTIVE, CLOSURE, etc.).
- **Bottom Section**: Data Table or Bar Chart showing Performance by Template, highlighting which templates have the lowest completion rates to spot operational bottlenecks.

## Git Commit Strategy

To ensure changes are easy to understand and review, I will break down the implementation into the following atomic commits:

1. `feat(prisma): add TaskAnalyticsSnapshot model`
   - Only the changes to `schema.prisma`.
2. `feat(api-types): add task analytics schemas`
   - Only the changes to `@eridu/api-types` containing the Zod schemas and DTOs.
3. `feat(api): implement task analytics aggregation endpoint`
   - Changes to `task.service.ts` (aggregation logic) and `studio-task.controller.ts` (API endpoint).
4. `feat(studios): implement task analytics dashboard UI`
   - Changes to `erify_studios` adding the TanStack Query hook and the Shadcn/Recharts dashboard components.
