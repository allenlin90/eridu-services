# Ideation: Full-Text Search and Attribute Filtering

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [admin-ux-searchability.md](./admin-ux-searchability.md), [api-performance-optimization.md](./api-performance-optimization.md)

## What

Replace simple `LIKE/iLike` queries with richer search: relevance-ranked full-text search and structured attribute filtering (e.g. `creator_type:host status:active`) across high-value entities (`Creator`, `Show`, `Task`, `TaskTemplate`, `StudioMember`). Decide between PostgreSQL native FTS and a dedicated search engine (Typesense, Meilisearch).

## Why It Was Considered

- As entity counts grow, users need more than prefix-match search to find creators, shows, and tasks efficiently.
- Structured attribute filtering similar to the Elasticsearch DSL would support compound, scoped queries without requiring a full external search engine.
- PostgreSQL native FTS (`tsvector`/`tsquery` + GIN indexes) may be sufficient for current scale without the operational overhead of an external engine.

## Why It Was Deferred

1. Current entity counts are low enough that `iLike` search is functionally adequate.
2. Engine choice (Postgres FTS vs. external) requires a production traffic baseline to make a data-driven decision.
3. Structured attribute filter DSL design (typed query params vs. unified filter string) needs UX input.
4. Index strategy (which entities, which columns, FTS vs. filter-only) requires per-entity analysis.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. `iLike` search response times exceed 200ms for any high-frequency search endpoint under production load.
2. Users report inability to find entities due to search quality limitations (no relevance ranking, no attribute filtering).
3. A specific entity (Creator, Show, or Task) reaches a count where GIN-indexed FTS is justified.
4. A new admin or studio feature requires structured attribute filtering that cannot be expressed with current typed query params.

## Implementation Notes (Preserved Context)

### Open design questions to resolve before PRD

- **Engine choice**: Is PostgreSQL native FTS sufficient, or does query volume and ranking complexity justify a dedicated engine (e.g. Typesense, Meilisearch)?
- **Filter DSL surface**: Should structured attribute filtering be exposed as typed query params (`?creator_type=host&status=active`) or as a unified filter string parsed server-side?
- **Index strategy**: Which entities are high-value search targets? Candidates: `Creator`, `Show`, `Task`, `TaskTemplate`, `StudioMember`.
- **Ranking and relevance**: Is keyword relevance ranking needed, or is filtered + paginated list sufficient for current use cases?
- **Sync strategy**: If an external engine is chosen, how are index writes kept in sync with Prisma mutations?

### TODOs (once design questions are resolved)

- Identify high-value search surfaces and define per-entity field coverage (full-text fields vs. filterable attributes).
- Define the attribute filter contract: field names, supported operators, and how they map to Prisma `where` clauses or search engine filter syntax.
- Prototype PostgreSQL FTS on the highest-volume entity (likely `Creator` or `Task`) to establish a latency and relevance baseline before evaluating external engines.
- Design a backend filter-parsing layer that translates structured attribute queries into typed, validated Prisma filters — preventing injection and maintaining schema alignment.
- Add GIN indexes for any `tsvector` columns and composite indexes for high-cardinality filter combinations.
- Expose unified search/filter endpoints per entity, aligned with the existing admin/studio route patterns.
- Update frontend filter UIs to drive structured attribute queries rather than raw text searches where appropriate.
