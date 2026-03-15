# Ideation: BullMQ Async Report Generation

> **Status**: Deferred from MVP
> **Origin**: Task submission reporting & export design review (2026-03-15)
> **Related**: [BE design §4.10](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)

## What

Replace synchronous report generation (`POST /task-reports/run` → blocking response) with an asynchronous BullMQ worker pattern:

1. `POST /task-reports/run` → enqueue job → return `202 Accepted` with `result_uid` (status: `GENERATING`)
2. BullMQ worker picks up the job, generates the result, stores JSONB.
3. FE polls `GET /task-report-results/:uid` until status transitions to `READY`.

## Why It Was Considered

- Large result sets (5,000–10,000 rows) may take several seconds to generate.
- HTTP gateway timeouts (typically 30s) could be hit for very large studios.
- Concurrent generation requests from multiple managers could create DB connection pool pressure.
- Removing the 10,000-row cap requires async generation to avoid blocking the API server.

## Why It Was Deferred

1. **MVP result sizes are well within synchronous limits.** Typical results (< 2,000 rows) complete in < 3s. The 10,000-row cap prevents runaway generation.
2. **No BullMQ infrastructure exists in the codebase yet.** Adding Redis + BullMQ for a single endpoint is disproportionate to the MVP scope.
3. **Synchronous generation is simpler to implement, test, and debug.** Error handling is straightforward (throw → HTTP error response). Async adds job retry logic, failure handling, and progress tracking complexity.
4. **The architectural shift to async is non-breaking.** The FE already receives a `result_uid` and fetches the result separately. Changing the generation from sync to async only affects the response code (200 → 202) and adds a polling step — no fundamental API contract change.

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

### BE changes

- `POST /task-reports/run` returns `202 Accepted` with `{ result_uid, status: 'GENERATING' }`.
- `TaskReportResult` gets a `status` field: `GENERATING` | `READY` | `FAILED`.
- BullMQ worker calls the same `TaskReportQueryService.generateResult()` method — the generation logic is unchanged.
- Job retry: 1 retry with exponential backoff. On final failure, set status to `FAILED` with error metadata.
- Progress tracking: optional — update `TaskReportResult.metadata.progress` during batch iterations for FE progress display.

### FE changes

- After `POST /task-reports/run` returns 202, poll `GET /task-report-results/:uid` every 2s.
- Show a progress indicator during `GENERATING` state.
- On `READY`, stop polling and display the result.
- On `FAILED`, show error with "Retry" button.
- The existing result retrieval flow is unchanged — only the generation trigger changes.

### Mobile / low-bandwidth considerations

- The async pattern actually improves mobile UX: the HTTP request completes immediately (202), reducing the chance of timeout on slow connections.
- The polling interval (2s) is lightweight — each poll is a small metadata response until the result is ready.
- Result retrieval (downloading the full JSON) remains the bandwidth bottleneck — see BE design §4.8 for gzip/streaming mitigations.

### Streaming as an alternative gate

If the primary concern is large JSON response download time (not generation time), consider `Transfer-Encoding: chunked` streaming for the result retrieval endpoint before adding full async generation infrastructure. This is a lighter-weight optimization that addresses mobile/bandwidth concerns without BullMQ.
