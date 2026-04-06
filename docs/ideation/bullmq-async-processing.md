# Ideation: BullMQ Async Report Generation

> **Status**: Deferred from MVP
> **Origin**: Task submission reporting & export design review (2026-03-15)
> **Related**: [BE design §4.11](../../apps/erify_api/docs/TASK_SUBMISSION_REPORTING.md)

## What

Replace synchronous inline report generation (`POST /task-reports/run` → full result in response) with an asynchronous BullMQ worker pattern:

1. `POST /task-reports/run` → enqueue job → return `202 Accepted` with a job token
2. BullMQ worker picks up the job, generates the result, stores it server-side (add `TaskReportResult` model)
3. FE polls `GET /task-report-results/:token` until status transitions to `READY`, then fetches full result

## Why It Was Considered

- Large result sets (5,000–10,000 rows) may take several seconds to generate.
- HTTP gateway timeouts (typically 30s) could be hit for very large studios.
- Concurrent generation requests from multiple managers could create DB connection pool pressure.
- Removing the 10,000-row cap requires async generation to avoid blocking the API server.

## Why It Was Deferred

1. **MVP result sizes are well within synchronous limits.** Typical results (500–1,000 rows) complete in < 1s. The 10,000-row cap prevents runaway generation.
2. **No BullMQ infrastructure exists in the codebase yet.** Adding Redis + BullMQ for a single endpoint is disproportionate to the MVP scope.
3. **Synchronous inline response is simpler.** The FE receives the full result in the API response — no polling, no result storage, no status tracking.
4. **No server-side result storage in MVP.** The current design returns results inline and caches on the client. Async generation requires server-side result storage (to hold the result between generation and retrieval), which is an architectural addition.
5. **The shift to async is non-breaking.** The result shape (`rows[]`, `columns[]`, `column_map`) stays the same. The FE change is: receive result inline → receive job token, poll, then receive result. No fundamental contract change.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. **P95 generation time exceeds 5 seconds** in production — measured via request duration logging on `/task-reports/run`.
2. **HTTP gateway timeout (30s) is hit** for large studios.
3. **Concurrent generation requests cause DB connection pool pressure** — measured via pool wait metrics.
4. **Product requires removing the 10,000-row cap** — async with progress tracking is the prerequisite.

## Implementation Notes (Preserved Context)

### Infrastructure requirements

- Redis instance (new dependency — not currently in the codebase).
- BullMQ package (`bullmq`) added to `erify_api`.
- Queue: `task-report-generation` with configurable concurrency.
- New `TaskReportResult` model (PostgreSQL JSONB) to hold generated results server-side.

### BE changes

- Add `TaskReportResult` model with status field: `GENERATING` | `READY` | `FAILED`.
- `POST /task-reports/run` returns `202 Accepted` with `{ job_token, status: 'GENERATING' }`.
- Add `GET /task-report-results/:token` for polling + full result retrieval.
- BullMQ worker calls the same `TaskReportQueryService.generateResult()` method — the generation logic is unchanged.
- Job retry: 1 retry with exponential backoff. On final failure, set status to `FAILED` with error metadata.
- Progress tracking: optional — update progress metadata during batch iterations for FE progress display.

### FE changes

- After `POST /task-reports/run` returns 202, poll `GET /task-report-results/:token` every 2s.
- Show a progress indicator during `GENERATING` state.
- On `READY`, fetch full result and cache in TanStack Query (same as current inline flow).
- On `FAILED`, show error with "Retry" button.
- The result shape and client-side caching/filtering are unchanged.

### Streaming as an alternative gate

If the primary concern is large JSON response size (not generation time), consider `Transfer-Encoding: chunked` streaming for the inline response before adding full async generation infrastructure. This is a lighter-weight optimization that addresses bandwidth concerns without BullMQ.
