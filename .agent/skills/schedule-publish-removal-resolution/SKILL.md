---
name: schedule-publish-removal-resolution
description: Critical business rules for the schedule-publish-triggered State Gate (gate_kind schedule_publish_removal): unassigned creation, cancellation vs restore outcomes, LIVE safeguard, and planner notice behavior. Read before changing publishing.service.ts remove-flow, show-status transitions, or schedule-continuity views.
---

# Schedule-Publish Removal Resolution

When a schedule republish diff drops a show that still has active tasks attached, `publishing.service.ts` opens a `STATE_GATE` task with `gate_kind: 'schedule_publish_removal'` instead of flipping the show straight to `CANCELLED`. See the State Gate pattern in `show-production-lifecycle/SKILL.md`.

## Why Unassigned

No human is present when a schedule sync runs, so `GATE_CONFIG.schedule_publish_removal.requiresOwner` is `false`. Any studio manager can claim it from `task-review` (filtered to unassigned `State Gate` tasks). `resolveGate` still requires a claimed owner before it can be resolved.

## Allowed Outcomes

| Outcome | Meaning |
|---|---|
| `CANCELLED` | Confirms the removal was correct and the show is not happening. |
| `RESTORE_PREVIOUS` | Reverts `Show.status` to `Task.metadata.from_status`, the status captured before the republish removed it. This is the expected path when schedule sync data was wrong. |

There is no `COMPLETED` outcome for this gate kind. If the show ran, resume it and let its normal lifecycle (`live -> completed`) handle completion.

## LIVE Safeguard

Same universal rule as `show_cancellation`: `CANCELLED` is blocked when `from_status === 'LIVE'`. For this gate kind, that makes `RESTORE_PREVIOUS` the expected path because a schedule resync dropping a currently live show is usually bad sync data rather than an intentional production stop.

## Planner Notice

Resolving with `RESTORE_PREVIOUS` writes a passive `Show.metadata.schedule_resume_notice` hint (`{resumed_by, resumed_at, gate_task_uid}`). It is display-only; workflow logic does not depend on reading it back. `publishing.service.ts` clears it the next time the show is present in a publish diff, meaning the source schedule was updated. If a later republish drops the same show again before that happens, a new gate opens.

## Read This Before Changing

Any feature touching `publishing.service.ts` remove-flow or "existing show kept" path, show-status transitions, or schedule-continuity views must read this skill and, if behavior changes, update it in the same PR.
