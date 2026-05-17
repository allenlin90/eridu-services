---
name: api-performance-optimization
description: Patterns for auditing and improving erify_api query performance and response efficiency. Use when detecting N+1 queries, reducing over-fetching, designing lean select/include strategies, replacing in-memory joins with DB aggregations, adding pagination guards, or defining API performance baselines before scaling. Complements database-patterns which covers the basic N+1 and Promise.all rules.
---

# API Performance Optimization

Prerequisite: `database-patterns` covers N+1 prevention and `Promise.all`. This skill covers lean selects, response minimization, aggregation strategy, bulk guards, and baseline tracking.

## 1. Lean `select` vs `include`

Never `include` a full relation when you only need a subset. Use `select` inside `include`.

Define shared DTO-shaped include constants (e.g., `showDtoListInclude`) for reuse across endpoints.

> 📖 [references/01-lean-select.md](references/01-lean-select.md)

## 2. Avoid In-Memory Joins

Push joins to the DB. Replace two-query + JS merge with Prisma `include`. For complex aggregations, use `$queryRaw` with typed return.

> 📖 [references/02-aggregation-strategy.md](references/02-aggregation-strategy.md)

## 3. Bulk Endpoint Size Guards

Any endpoint accepting an array MUST validate max input size.

| Operation | Suggested max |
|---|---|
| Bulk create | 200 |
| Bulk assign | 100 |
| Bulk status update / delete | 50 |

## 4. Pagination — Defaults and Maximums

Every `findMany` must have default `take` and hard `max`. Use offset-based pagination (`page` + `limit`) as the standard. Cursor pagination is not currently used.

> 📖 [references/03-pagination-patterns.md](references/03-pagination-patterns.md)

### Read-Burst Throttling

Use `@ReadBurstThrottle()` for high-frequency list endpoints (infinite scroll, search-on-keystroke).

## 5. Response Field Minimization

Never return fields no consumer uses. Exclude JSONB fields from list endpoints. Use flat `select` projections for deeply nested relations.

## 6. Audit Workflow

When investigating slow endpoints: log query count → check N+1 → check include depth → check Promise.all → check JSONB in lists → check unbounded queries → EXPLAIN ANALYZE.

> 📖 [references/04-query-logging.md](references/04-query-logging.md)

## 7. Performance Baseline

Track per endpoint: DB query count, P50/P99 response time, payload size. Document in `apps/erify_api/docs/design/`.

## Related Skills

- [Database Patterns](../database-patterns/SKILL.md) — Foundational query rules
- [Repository Pattern](../repository-pattern-nestjs/SKILL.md) — Lean selects and aggregations
- [Studio List Pattern](../studio-list-pattern/SKILL.md) — Offset-based infinite scroll
