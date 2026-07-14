# Aggregation Strategy — groupBy vs $queryRaw

## Decision Rule

| Use case | Pattern |
|---|---|
| Single-table count/sum/max grouped by one FK | `prisma.model.groupBy(...)` |
| Multi-table join + aggregate (e.g. distinct count across a join table) | `prisma.$queryRaw<...>` with typed return |
| Dashboard-style pre-aggregated read (high frequency, complex joins) | JSONB snapshot — see `jsonb-analytics-snapshot` skill |

---

## groupBy — When It's Enough

Prisma `groupBy` works well for single-table aggregations:

```typescript
// Count tasks per template
const counts = await prisma.task.groupBy({
  by: ['templateId'],
  where: { templateId: { in: templateIds }, deletedAt: null },
  _count: { _all: true },
  _max: { createdAt: true },
});

// Map result to lookup
const countMap = new Map(counts.map(row => [row.templateId, row._count._all]));
```

Limitation: `groupBy` cannot cross JOIN boundaries (e.g. count DISTINCT on a related table's column).

---

## $queryRaw — When groupBy Is Insufficient

When you need to COUNT DISTINCT across a join table, or JOIN multiple tables in one aggregation:

```typescript
// Count distinct shows per template (requires join)
const rows = await prisma.$queryRaw<Array<{ template_id: bigint; show_count: bigint }>>(
  Prisma.sql`
    SELECT
      t.template_id AS template_id,
      COUNT(DISTINCT tt.show_id)::bigint AS show_count
    FROM tasks t
    JOIN task_targets tt ON tt.task_id = t.id
    WHERE t.template_id IN (${Prisma.join(templateIds)})
      AND t.deleted_at IS NULL
      AND tt.deleted_at IS NULL
      AND tt.target_type = 'SHOW'
      AND tt.show_id IS NOT NULL
    GROUP BY t.template_id
  `,
);

const showCountMap = new Map(rows.map(row => [row.template_id, Number(row.show_count)]));
```

**Rules for `$queryRaw`**:
- Always use `Prisma.sql` template literals — never string concatenation (SQL injection risk).
- Use `Prisma.join(array)` for `IN (...)` clauses with dynamic arrays.
- Cast BigInt columns to `bigint` in SQL, then convert with `Number(row.col)` in TS.
- Annotate the return type explicitly: `$queryRaw<Array<{ col: bigint }>>`.

---

## Combining groupBy + $queryRaw in Parallel

For list-with-stats endpoints, run all aggregations in a single `Promise.all`:

```typescript
const [totalCounts, activeCounts, lastUsed, showCounts] = await Promise.all([
  prisma.task.groupBy({ by: ['templateId'], where, _count: { _all: true } }),
  prisma.task.groupBy({ by: ['templateId'], where: { ...where, deletedAt: null }, _count: { _all: true } }),
  prisma.task.groupBy({ by: ['templateId'], where, _max: { createdAt: true } }),
  prisma.$queryRaw<Array<{ template_id: bigint; show_count: bigint }>>(
    Prisma.sql`SELECT t.template_id, COUNT(DISTINCT tt.show_id)::bigint AS show_count ...`
  ),
]);
```

Canonical reference: `TaskTemplateRepository.findPaginatedAdminWithUsage()` in
`apps/erify_api/src/models/task-template/task-template.repository.ts`.
