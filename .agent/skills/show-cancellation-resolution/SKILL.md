---
name: show-cancellation-resolution
description: Critical business rules for the manual show-cancellation State Gate (gate_kind show_cancellation): reason taxonomy, ownership, allowed outcomes, and downstream cancellation/completion meaning. Read before changing show-status transitions, task orchestration for STATE_GATE tasks, or cancelled-show compensation/reporting logic.
---

# Show Cancellation Resolution

Manual studio cancellation (`POST /studios/:studioId/shows/:showId/cancel-with-resolution`) opens a `STATE_GATE` task with `gate_kind: 'show_cancellation'`, backed by `ShowStateGateService` (see the State Gate pattern in `show-production-lifecycle/SKILL.md`).

## Reason Taxonomy

`CREATOR_UNAVAILABLE`, `ROOM_UNAVAILABLE`, `EQUIPMENT_FAILURE`, `UTILITY_OUTAGE`, `PLATFORM_ISSUE`, `CLIENT_REQUEST`, `OTHER` (defined in `GATE_CONFIG.show_cancellation.reasonOptions`, `show-state-gate.config.ts`).

## Ownership

An owner is required when a manager clicks "Cancel for Resolution" (`requiresOwner: true`). The backend resolves the selected `StudioMembership` to its underlying `User`; this gate kind is never created unassigned.

## Allowed Outcomes

| Outcome | Meaning | Downstream implication |
|---|---|---|
| `CANCELLED` | No production happened | No production credit. Blocked while active tasks remain on the show, and blocked outright if the show's `from_status` was `live`. Confirm exact compensation/reporting implications with the owning team before changing this. |
| `COMPLETED` | Show partially or fully ran despite the interruption | Counts partial production credit, following the same downstream path as a normally completed show. |

## Active-Task Guard

Resolving to `CANCELLED` requires zero active `TaskTarget`s on the show (`taskTarget.deletedAt = null`, `task.deletedAt = null`, `task.status NOT IN ('COMPLETED', 'CLOSED')`). The canonical count lives in `TaskTargetRepository.countActiveByShowId`, shared with `publishing.service.ts`.

## LIVE Safeguard

If the gate's `Task.metadata.from_status` is `LIVE`, `resolveGate` rejects a `CANCELLED` outcome (`LIVE_CANCELLATION_REQUIRES_OVERRIDE`) because a live show did not have zero production. `COMPLETED` remains available. No manager override path exists yet; bypassing this requires a direct system-admin status edit outside the gate flow.

## Read This Before Changing

Any feature touching show-status transitions, `STATE_GATE` task orchestration, compensation/credit calculation for cancelled shows, or cancellation reporting must read this skill and, if behavior changes, update it in the same PR.
