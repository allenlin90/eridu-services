# Ideation: Enterprise / Scale Follow-Ups

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [docs/domain/BUSINESS.md](../../docs/domain/BUSINESS.md)

## What

A set of scale-oriented capabilities needed for large-client operations and reporting: chunked/append-oriented schedule flows for very large clients, advanced bulk review operations with proven safeguards, richer audit/search/reporting surfaces, data warehouse integration (Datastream + BigQuery), and a formal reopen workflow with approval chain.

## Why It Was Considered

- Large-client operations exceed the throughput and UX capabilities of the current baseline (e.g., bulk schedule creation, mass review operations).
- Richer audit and search surfaces are needed for compliance and operational visibility at scale.
- A data warehouse pipeline (Datastream + BigQuery) would enable analytics beyond what is practical with the operational Postgres database.
- The reopen workflow (reopening a closed show or schedule) currently has no formal approval chain.

## Why It Was Deferred

1. Current client sizes do not require chunked schedule flows or advanced bulk review.
2. Advanced bulk review operations need proven safeguards (request caps, idempotency, rollback) before they can be trusted at scale.
3. Data warehouse integration requires infrastructure investment (Datastream, BigQuery schema, sync strategy) that is not justified at current data volumes.
4. The reopen workflow approval chain needs product and process design before engineering can spec it.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. A large client's schedule size exceeds current bulk creation limits and operations are blocked.
2. Bulk review operations at scale are required and the current safeguards have been proven in production.
3. Analytics reporting requirements exceed what is achievable from the operational Postgres database.
4. A formal reopen workflow with approval chain is required for an active show or schedule management process.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Chunked or append-oriented schedule flows for very large clients.
- Advanced bulk review operations after safeguards are proven.
- Richer audit/search/reporting surfaces.
- Data warehouse follow-up (Datastream + BigQuery).
- Formal reopen workflow with approval chain.

### Note on data warehouse

A Datastream + BigQuery pipeline would require: CDC setup from Postgres, BigQuery dataset design, a schema evolution strategy, and a data access layer. This is a significant infrastructure investment and should only be planned when operational analytics needs clearly exceed what Postgres can serve.
