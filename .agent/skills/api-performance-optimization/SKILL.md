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

## 8. Decoupled Summaries vs. Nested Detail Lists

Avoid consolidating too many detail lists in a single monolithic API response. Instead, separate them into:
1. A **lightweight summary/stats endpoint** (e.g. `GET /review-stats`, `GET /run-review`) returning high-level counts, percentages, and metrics only — no row-level arrays.
2. **Lazy-loaded paginated sub-resource endpoints** (e.g. `GET /run-review/creators`) the frontend queries only when the corresponding tab/detail view is activated.

The clear, reliable win is **payload transfer size**: the initial summary stays small and constant, and detail rows ship one page at a time instead of as one large nested graph. Tabs the user never opens are never fetched.

Guard rails when applying this:
- **Stat counts must use the same filters as the paginated list.** If the summary counts a tab one way and the list query filters another, the badge and the table silently disagree. For DB-backed lists, drive both from one `buildWhere` helper (see `task.repository.ts` `findTaskReviewStats`). For computed/derived lists, derive both from one shared function (see `show-orchestration.service.ts` `derive*` helpers).
- **Lazy ≠ free, and in-memory pagination ≠ less DB work.** When a list is *computed* from a nested graph (e.g. creator lateness derived from `show.showCreators`), each sub-resource request re-loads that graph and slices in memory — DB cost scales with range size, not page size. Acceptable for **bounded** windows (run-review is capped at 31 days), but it does **not** give constant-time scaling. If a list must scale with total data, push filtering + pagination + aggregation into SQL (`LIMIT`/`OFFSET` + `COUNT`); don't fetch-all-and-slice.
- **Don't drop columns a sibling consumer still needs inline.** Trimming a heavy field (e.g. a JSONB `schema`) from a shared list `include` is only safe if every consumer re-fetches it via a detail endpoint. A list feeding an inline-render view must keep the field (see `taskListInclude` / `taskListIncludeWithSchema`, which must also populate the target `show`'s `showPlatforms` + nested `platform` to support inline platform name rendering).

## Related Skills

- [Database Patterns](../database-patterns/SKILL.md) — Foundational query rules
- [Repository Pattern](../repository-pattern-nestjs/SKILL.md) — Lean selects and aggregations
- [Studio List Pattern](../studio-list-pattern/SKILL.md) — Offset-based infinite scroll
