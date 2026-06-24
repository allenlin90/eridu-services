# Accepted: Resolve-dialog active-task guard renders a static message, not the count+nav-link sub-workflow

**Status:** Accepted (low risk) · **Area:** `erify_studios` show-cancellation-resolution panel
**Origin:** PR #230 review (`pr-review.md` Documentation gate — design doc drift)

## Context

The [Show State Gate design](../superpowers/specs/2026-06-23-show-state-gate-design.md) (and the older [Pending-Resolution MVP doc](../../apps/erify_api/docs/design/IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md) it superseded) both specify that the resolve dialog must render the `ACTIVE_TASKS_REMAIN` guard failure with the live active-task count and a direct link to the show's task list, so a manager can clear the blocker without leaving the dialog blind.

`apps/erify_studios/src/features/studio-shows/api/cancel-studio-show.ts` instead maps `ACTIVE_TASKS_REMAIN` to a fixed string via `CANCELLATION_ERROR_MESSAGES`:

> "This show still has active tasks. Close or reassign them before confirming cancellation."

No count, no link to `/studios/$studioId/shows/$showId/tasks`.

## Why accepted (not fixed now)

- The backend already returns the count (`HttpError.badRequestWithDetails('ACTIVE_TASKS_REMAIN:...', { activeTaskCount })`) — only the frontend error-mapping/rendering is incomplete, not the API contract. The fix is additive, not a redesign.
- At current volume (~20 gates/studio/month total across both gate kinds), a manager hitting this guard can navigate to the show's task list manually; the missing shortcut is a convenience gap, not a blocker to resolving a cancellation.
- This is why `docs/superpowers/specs/2026-06-23-show-state-gate-design.md` and `docs/superpowers/plans/2026-06-23-show-state-gate.md` were **not** retired in the PR #230 review — `doc-lifecycle.md`'s Superpowers Spec/Plan Retirement procedure only retires a plan once it is *fully* implemented, and this is a real, identified gap against both documents' explicit requirements.

## When to revisit

- A studio reports the static message is insufficient (has to guess which tasks are blocking, or how many).
- The next time `show-cancellation-resolution-panel.tsx`/`cancel-studio-show.ts` is touched for an unrelated reason — fold the count+link rendering in then rather than as a standalone PR.
- At that point: render `activeTaskCount` from the error response body and a link to `/studios/$studioId/shows/$showId/tasks`, then retire `docs/superpowers/specs/2026-06-23-show-state-gate-design.md` and `docs/superpowers/plans/2026-06-23-show-state-gate.md` per `doc-lifecycle.md` (re-check first whether any other gap accumulated since this entry was written).
