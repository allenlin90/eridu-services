---
name: jsonb-analytics-snapshot
description: Defines the JSONB Analytics Snapshot Pattern. This skill should be used when implementing analytics, dashboards, or any feature requiring aggregation of historical/immutable data where high read performance is required.
license: Complete terms in LICENSE.txt
---

# JSONB Analytics Snapshot Pattern

This skill provides the architectural pattern for using JSONB to store pre-aggregated analytics data, rather than relying on on-the-fly RDBMS calculations or complex star-schema table architectures.

## The Core Concept

When building dashboards or analytics views, data is often grouped by multiple dimensions (e.g., status, type, template, date). 
If history is **immutable** (i.e. "what happened has happened"), recalculating these aggregations on every page load using `GROUP BY` and multiple `JOIN`s is inefficient.

The JSONB Analytics Snapshot Pattern solves this by calculating the aggregations once for a specific time period (e.g., Daily, Weekly) and storing the complete structured result in a single `JSONB` column.

## RDBMS vs JSONB for Aggregations

Why not create normalized RDBMS tables for the aggregated results (e.g., `analytics_overview`, `analytics_by_status`, `analytics_by_template`)?

1. **Schema Flexibility**: Dashboards change frequently. If you want to add a new chart (e.g., "Performance by User Role"), an RDBMS approach requires a database migration, new tables/columns, and ORM updates. With JSONB, you simply add a new key to the JSON payload.
2. **Read Performance**: A dashboard typically needs *all* these aggregations at once. Fetching from 5 different RDBMS aggregate tables requires 5 queries or complex joins. Fetching a single JSONB row provides the entire localized payload in one fast read.
3. **Data Shape Match**: The JSONB structure can exactly match the API response DTO mapped to the frontend charts, avoiding mapping boilerplate.

*When NOT to use*: Do not use JSONB if you need to perform cross-snapshot RDBMS aggregations (e.g., summing up the 'completed' count across 100 snapshots using SQL). In our system, snapshots are usually requested individually per-period.

## Prisma Schema Implementation

To implement this pattern, create a snapshot table scoped to the entity and the time period:

```prisma
model TaskAnalyticsSnapshot {
  id              BigInt   @id @default(autoincrement())
  uid             String   @unique
  
  // 1. Scoping (Who does this belong to?)
  studioId        BigInt   @map("studio_id")
  studio          Studio   @relation(fields: [studioId], references: [id], onDelete: Cascade)
  userId          BigInt?  @map("user_id") // Optional: if scoped to a specific user
  user            User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 2. Time Bounding (What period does this cover?)
  periodStart     DateTime @map("period_start") 
  periodEnd       DateTime @map("period_end")   
  periodType      String   @map("period_type")  // e.g. 'DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'
  
  // 3. The Payload
  metrics         Json     @map("metrics")
  
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([studioId, periodType, periodStart])
  @@index([userId, periodType, periodStart])
  @@map("task_analytics_snapshots")
}
```

## Application Layer (NestJS)

### 1. The DTO Match
Keep the Zod/DTO schema aligned with the `metrics` JSON structure.

```typescript
export const analyticsMetricsSchema = z.object({
  overview: z.object({
    totalTasks: z.number(),
    completionRate: z.number(),
    overdueCount: z.number(),
  }),
  byStatus: z.array(z.object({ status: z.string(), count: z.number() })),
  byType: z.array(z.object({ type: z.string(), count: z.number() })),
});
export type AnalyticsMetrics = z.infer<typeof analyticsMetricsSchema>;
```

### 2. Lazy Evaluation / Generation
If a webhook/cron job isn't viable yet, use a "Lazy Evaluation" pattern in the Service layer:

1. Check if a snapshot exists for the requested exact period/scope.
2. If YES: Parse and return `snapshot.metrics`.
3. If NO: Calculate the aggregations via Prisma `groupBy`, construct the `metrics` JSON, save it to the database, and return it.

Because historical periods (e.g., "Last Month") are immutable, once the snapshot is generated, it never costs aggregation CPU cycles again.

## Checklist

- [ ] Snapshot table includes scoping fields (`studioId`, optional `userId`)
- [ ] Time bounding fields present (`periodStart`, `periodEnd`, `periodType`)
- [ ] `metrics` column is `Json` type (not normalized RDBMS tables)
- [ ] DTO/Zod schema mirrors the `metrics` JSON structure
- [ ] Lazy evaluation: check for existing snapshot before calculating
- [ ] Indexes cover `(studioId, periodType, periodStart)` for efficient lookups
- [ ] Snapshot is immutable after creation (historical periods don't change)
