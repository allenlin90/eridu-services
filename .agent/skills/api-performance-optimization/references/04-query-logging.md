# Query Logging — Prisma Dev Setup

## Enable Query Logging in Development

Add to `PrismaService` or a dev-only bootstrap hook:

```typescript
// In PrismaService (dev only — gated by NODE_ENV)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'event', level: 'query' }]
    : [],
});

if (process.env.NODE_ENV === 'development') {
  let queryCount = 0;

  prisma.$on('query', (e) => {
    queryCount++;
    console.log(`[Prisma] Query #${queryCount} (${e.duration}ms): ${e.query}`);
  });
}
```

## Per-Request Query Count (Manual)

For targeted profiling of a specific endpoint, temporarily wrap the handler:

```typescript
let count = 0;
prisma.$on('query', () => count++);

// ... run the operation ...

console.log(`Total queries: ${count}`);
```

Remove after the audit.

## Reading the Output

Watch for:

- **Same query repeated N times** in a loop → N+1, add `include`
- **Queries with no WHERE filter** → missing `deletedAt: null` or unbounded fetch
- **Many round-trips for a list endpoint** → push aggregations to `Promise.all` or `$queryRaw`
- **Large `SELECT *`** on a join → convert to `select: { field: true }` projection

## EXPLAIN ANALYZE (PostgreSQL)

For a slow query identified via logs, run `EXPLAIN ANALYZE` directly:

```sql
EXPLAIN ANALYZE
SELECT t.uid, COUNT(tt.id)
FROM tasks t
LEFT JOIN task_targets tt ON tt.task_id = t.id
WHERE t.deleted_at IS NULL
GROUP BY t.uid;
```

Look for:
- `Seq Scan` on large tables → likely missing index
- `Hash Join` with large estimated rows → consider adding FK index or composite index
- High `actual rows` vs `estimated rows` discrepancy → stale statistics, run `ANALYZE`
