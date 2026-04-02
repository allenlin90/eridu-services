# Ideation: Schedule Publish Task Due-Date Reconciliation

> **Status**: Deferred from schedule continuity review and user-facing docs follow-up, April 2026
> **Origin**: Google Sheets schedule-publishing documentation pass, April 2026
> **Related**: [Schedule Continuity](../../apps/erify_api/docs/SCHEDULE_CONTINUITY.md), [Schedule Planning](../../apps/erify_api/docs/SCHEDULE_PLANNING.md), [Task Management Summary](../../apps/erify_api/docs/TASK_MANAGEMENT_SUMMARY.md)

## What

Define and implement the expected behavior when a published show keeps the same identity but its timing changes later in the schedule source of truth. Today, schedule publish updates the show record in place and preserves task links, but generated task due dates are not automatically recalculated to match the new show time.

The deferred work is to decide whether generated tasks should automatically follow schedule time changes, which task states are eligible, and how to protect manually adjusted task timing from being overwritten.

## Why It Was Considered

- Schedule publish already preserves show identity by matching on stable show identity, so linked tasks survive normal timing edits.
- Generated task due dates are derived from show timing for show-linked task types, which makes stale due dates plausible after a schedule update.
- The current behavior is easy to misunderstand operationally: operators may expect a `9:00 AM` to `10:00 AM` show move to also move related setup/active/closure timing.
- This is the kind of workflow gap that can cause silent operational drift rather than an obvious API error.

## Why It Was Deferred

1. Current publish behavior is internally consistent: it updates the show in place and intentionally does not mutate downstream task fields during publish.
2. Automatic due-date recalculation needs policy decisions first, especially around manual overrides and in-progress or completed tasks.
3. There is no preserved product rule yet for whether publish should update only generated pending tasks, all open tasks, or none.
4. The highest-value immediate work was documenting the behavior clearly for operators rather than changing scheduling/task orchestration semantics in the same pass.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Operators report missed work, overdue noise, or assignment confusion caused by task due dates drifting from updated show times.
2. Schedule updates after task generation become a common operational pattern rather than an edge case.
3. Product decides that generated task timing must remain coupled to show timing unless explicitly overridden.
4. Task orchestration work is already planned for related show-linked lifecycle behavior, making this a natural follow-on.

## Implementation Notes (Preserved Context)

### Current behavior in code

- Schedule publish matches and updates shows in place when the same show identity is present in the new payload.
- Task continuity is preserved because task targets remain linked to the same `showId`.
- The publish path does not update `task.dueDate`.
- Generated due dates are currently derived from show timing during task generation:
  - `SETUP`: `show.startTime - 1 hour`
  - `ACTIVE`: `show.endTime + 1 hour`
  - `CLOSURE`: `show.endTime + 6 hours`
- Reassigning an existing task to a different show recalculates due date, which shows the codebase already accepts show-time-derived due dates in some mutation paths.

### Decision points to resolve later

- Should recalculation apply only to generated tasks, or also to manually created show-linked tasks?
- Should recalculation be limited to `PENDING` tasks, excluding `REVIEW`, `COMPLETED`, and `CLOSED`?
- How should manual due-date overrides be detected and preserved?
- Should publish emit an audit trail or summary count when downstream task due dates are shifted?
- Should the behavior be fully automatic, opt-in per publish, or handled by a separate admin repair action?

### Likely safe-first implementation shape

If promoted, the safest first version is likely:

1. only generated show-linked tasks
2. only non-terminal tasks
3. only tasks whose due date still matches the old derived formula, which avoids overwriting manual adjustments
4. publish summary or audit metadata indicating how many task due dates were shifted

