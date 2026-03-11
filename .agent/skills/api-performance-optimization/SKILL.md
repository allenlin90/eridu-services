---
name: api-performance-optimization
description: Patterns for auditing and improving erify_api query performance and response efficiency. Use when detecting N+1 queries, reducing over-fetching, designing lean select/include strategies, replacing in-memory joins with DB aggregations, adding pagination guards, or defining API performance baselines before scaling. Complements database-patterns which covers the basic N+1 and Promise.all rules.
---

# API Performance Optimization

**Prerequisite**: `database-patterns` covers N+1 prevention and `Promise.all` for parallel queries. This skill covers the next tier: lean selects, response minimization, aggregation strategy, bulk write guards, and baseline tracking.

---

## 1. Lean `select` vs `include`

**Rule**: Never `include` a full relation when you only need a subset of fields. Use `select` inside `include` to project only required fields.

```typescript
// ❌ Over-fetches — loads all user fields for every task
prisma.task.findMany({ include: { assignee: true } });

// ✅ Lean — only the fields the response actually uses
prisma.task.findMany({
  include: {
    assignee: { select: { uid: true, name: true } },
  },
});
```

**Decision rule**:
- If the relation fields map 1:1 to the response schema → `select` only those fields.
- If the full entity is needed (e.g. for internal processing) → `include: true` is acceptable.
- Never include deeply nested relations speculatively "just in case".

> See [`references/01-lean-select.md`](references/01-lean-select.md) for audit checklist and before/after examples.

---

## 2. Avoid In-Memory Joins — Push Aggregation to the DB

**Rule**: If you're loading records from two queries and joining them in JS, push the join to the DB instead.

Common antipattern in this codebase:

```typescript
// ❌ Two queries + in-memory join
const tasks = await prisma.task.findMany({ where });
const taskIds = tasks.map(t => t.id);
const targets = await prisma.taskTarget.findMany({ where: { taskId: { in: taskIds } } });
// ... manual map/merge
```

Replace with:
```typescript
// ✅ Single query with join
const tasks = await prisma.task.findMany({
  where,
  include: {
    targets: { where: { deletedAt: null }, select: { targetType: true, showId: true } },
  },
});
```

For complex multi-table aggregations (counts by group, distinct joins), use `$queryRaw` with typed return — see the `task-template.repository.ts` `findPaginatedAdminWithUsage` method as the canonical example.

> See [`references/02-aggregation-strategy.md`](references/02-aggregation-strategy.md) for groupBy vs $queryRaw decision rules.

---

## 3. Request-Size Guards on Bulk Endpoints

**Rule**: Any endpoint that accepts an array of items MUST validate a maximum input size. No guard = potential O(n) DB writes with no upper bound.

```typescript
// In schema (api-types)
export const bulkAssignSchema = z.object({
  items: z.array(bulkAssignItemSchema).min(1).max(100),  // Hard cap
});
```

```typescript
// In service — optional secondary check for defense in depth
if (payload.items.length > 100) {
  throw HttpError.badRequest('Bulk operation limited to 100 items per request');
}
```

Recommended caps by operation class:

| Operation | Suggested max |
|-----------|---------------|
| Bulk create (no external side effects) | 200 |
| Bulk assign (cross-entity writes) | 100 |
| Bulk status update | 50 |
| Bulk delete | 50 |

Adjust based on measured p99 latency. Document the cap in the PRD/technical design.

---

## 4. Paginated Responses — Enforce Defaults and Maximums

**Rule**: Never return unbounded lists. Every `findMany` that feeds a paginated API endpoint must have:
1. A default `take` value.
2. A hard `max` cap enforced in the schema.

```typescript
// In api-types schema
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

Use `limit` (not `pageSize`) as the canonical query parameter — see Phase 5 tech debt note in `docs/roadmap/PHASE_5.md`.

For large result sets, prefer **cursor-based pagination** over offset:
- Cursor: stable at high offsets, cheaper for DB.
- Offset: acceptable for admin views with small total counts.

> See [`references/03-pagination-patterns.md`](references/03-pagination-patterns.md) for both patterns with examples.

---

## 5. Parallel Independent Queries

**Rule**: Any two queries with no data dependency between them must run in parallel.

Already covered in `database-patterns`, repeated here as a checklist item during optimization passes:

```typescript
// ✅ Parallel — count does not depend on items
const [items, total] = await Promise.all([
  this.repository.findMany(filters),
  this.repository.count(filters),
]);

// ✅ Parallel — independent aggregations
const [taskCounts, activeCounts, lastUsed] = await Promise.all([
  prisma.task.groupBy({ by: ['templateId'], where, _count: { _all: true } }),
  prisma.task.groupBy({ by: ['templateId'], where: { ...where, deletedAt: null }, _count: { _all: true } }),
  prisma.task.groupBy({ by: ['templateId'], where, _max: { createdAt: true } }),
]);
```

---

## 6. Response Field Minimization

**Rule**: The API response schema is the contract — never return fields that no consumer uses.

Audit questions for each endpoint:
- Does the frontend actually display this field? If not, remove from the Zod response schema.
- Is a deeply nested relation used, or only a single field from it? Use a flat `select` projection.
- Are `metadata` / `currentSchema` JSONB fields returned in list endpoints? These are expensive — return them only in single-resource endpoints.

```typescript
// ❌ List endpoint returning full JSONB — serializes large blobs per row
const templates = await prisma.taskTemplate.findMany({ where });
// response includes currentSchema: { ... massive JSON ... }

// ✅ Exclude JSONB from list, include in detail endpoint
const templates = await prisma.taskTemplate.findMany({
  where,
  select: { uid: true, name: true, isActive: true, updatedAt: true },
  // currentSchema omitted — fetched only on detail view
});
```

---

## 7. Audit Workflow

When investigating a slow endpoint, follow this order:

1. **Log the query count**: add temporary `prisma.$on('query', ...)` in dev to count DB round-trips per request.
2. **Check for N+1**: any loop calling a DB method is suspect.
3. **Check `include` depth**: deep nested includes often over-fetch.
4. **Check `Promise.all` coverage**: are sequential awaits on independent queries?
5. **Check JSONB fields in list responses**: expensive serialization on large lists.
6. **Check unbounded queries**: missing `take` on `findMany`.
7. **Run `EXPLAIN ANALYZE`** on the generated SQL for queries that appear slow in step 1.

> See [`references/04-query-logging.md`](references/04-query-logging.md) for the Prisma query logger setup.

---

## 8. Performance Baseline Definition

Before optimizing, record a baseline. Track per endpoint:

| Metric | How to capture |
|--------|---------------|
| DB query count per request | Prisma query event log in dev |
| P50 / P99 response time | Application logs or simple `console.time` in dev |
| Payload size (bytes) | `Content-Length` header or `JSON.stringify().length` |

Document baselines in the relevant technical design doc under `apps/erify_api/docs/design/` before and after an optimization pass. This allows regression detection in future PRs.

---

## Related Skills

- **[Database Patterns](../database-patterns/SKILL.md)**: N+1 prevention, bulk ops, `Promise.all` — foundational rules this skill extends.
- **[Repository Pattern](../repository-pattern-nestjs/SKILL.md)**: Where lean selects and aggregations live.
- **[Studio List Pattern](../studio-list-pattern/SKILL.md)**: Cursor-based pagination for studio-scoped list views.
- **[JSONB Analytics Snapshot](../jsonb-analytics-snapshot/SKILL.md)**: When to pre-aggregate vs query live for dashboard reads.
