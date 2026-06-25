# Remaining Gap: Schedule-Publish Pending-Resolution Discovery & Observability

> **TLDR**: The studio-scoped resolution backend this doc originally proposed (`POST /studios/:studioId/shows/:showId/resolve-cancellation`, active-task policy, LIVE safeguard, audit trail) **shipped in PR #230**, but via a different, more reusable mechanism than originally specified here — see `STUDIO_SHOW_MANAGEMENT.md` decisions 17–19. The metadata-contract approach in the original §3.5/§4.3.1 below was **not** what shipped; it is superseded, not implemented. What remains open is frontend discovery/observability scope, listed under "Remaining Gap" below.

> [!NOTE]
> **Status: 📐 Narrowed — backend shipped via Task/STATE_GATE, frontend discovery/observability gap remains.**

## What Shipped (PR #230)

- `POST /studios/:studioId/shows/:showId/cancel-with-resolution` and `POST /studios/:studioId/shows/:showId/resolve-cancellation` — studio-scoped, `ADMIN`/`MANAGER`-gated (originally scoped to "studio admin" only; widened to include `MANAGER` as part of the actual design).
- `GET /studios/:studioId/shows/:showId/state-gate` — not originally proposed, added to support the frontend resolution panel.
- Consistent "active task" definition shared between the publish remove-flow and the resolve guard (`TaskTargetRepository.countActiveByShowId` — same goal as this doc's §4.0/§4.1, implemented as a single canonical repository method instead of duplicated inline filters).
- LIVE safeguard (§4.1 item 4) — implemented as a universal `resolveGate` guard, not keyed off `show.metadata.cancellation_context.previous_status` as originally proposed, but off `Task.metadata.from_status` captured when the gate opened.
- Audited state transitions (§4.3) via `Audit` rows written by `openGate`/`resolveGate`, plus a `Task.content.history` trace (claim/reassign/resolve) this doc did not originally call for.
- Resolution discovery for managers: the existing `task-review` queue, filtered to `Task Type = State Gate`, replaces the dedicated "pending-resolution queue" this doc proposed in §5.1 — see Remaining Gap below for why this is a narrower answer than originally scoped.

## Remaining Gap (frontend discovery & observability)

These items from the original MVP scope were not delivered by PR #230 and remain open:

1. **No dedicated pending-resolution queue route** (was §5.1). Discovery today is via `task-review` filtered to `Task Type = State Gate` — workable, but not a purpose-built "shows stuck in pending resolution" queue with show-list context (client, schedule, room).
2. **No member-facing task-page indicator** (was §5.2/§5.4) — a task whose linked show is `CANCELLED_PENDING_RESOLUTION` does not surface a distinct banner/chip on the assignee's own task views.
3. **No structured observability** (was §4.4) — no counters/structured logs for resolve success/rejection rates beyond the pre-existing `publishSummary.shows_pending_resolution`/`shows_cancelled` publish-time tallies.
## Decision Gates for Revisiting

Pick this back up when any of:

- A studio reports difficulty finding pending-resolution shows via the `task-review` filter (signal: support requests, or the gate kind list grows enough that `Task Type = State Gate` stops being precise).
- Resolve rejection rates need monitoring (no current visibility into how often `ACTIVE_TASKS_REMAIN`/`LIVE_CANCELLATION_REQUIRES_OVERRIDE` block a resolve attempt).

## Superseded Sections (preserved for context, not current contract)

The original §3 (Public API contract incl. `resolution_action`/`MARK_CANCELLED` request shape and the `show.metadata.cancellation_context`/`resolution` JSON contract) and §4.0–4.3/4.3.1 (publish-service prerequisites keyed off `show.metadata`) describe a metadata-driven design that was superseded before implementation. The actual contract is `CancelStudioShowDto`/`ResolveStudioShowCancellationDto` in `@eridu/api-types/shows`, and gate state lives on `Task`, not `Show.metadata`. Do not implement against the JSON shapes in the old §3.5 — they do not exist on `Show`.
