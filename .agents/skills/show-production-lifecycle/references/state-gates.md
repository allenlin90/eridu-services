# State Gates and Readiness Conditions

Detailed reference for lifecycle transition conditions. Read this when implementing or reviewing readiness checks, completion gates, or enforcement logic.

## Enforcement Levels

Phase 5 identifies three enforcement levels, but enforcement configuration is **deferred**. Current behavior is advisory only.

| Level | Meaning | Example |
|---|---|---|
| Off | Platform records state but does not evaluate the requirement. | Studio does not require task generation before confirmation. |
| Warning | Platform highlights missing records but allows the transition. | Show can be confirmed without creator assignment, but appears as planning risk. |
| Block | Platform prevents the transition until the requirement is met or waived. | Show cannot go live without a room and at least one assigned operator. |

## Transition: draft → confirmed

Planning readiness. The planning manager has reviewed and accepted the show as operationally ready.

| Condition | Where checked today | Enforcement | Notes |
|---|---|---|---|
| Room assigned | `show.studioRoomId` is not null | Not enforced | Field exists on Show |
| Creators assigned | `ShowCreator[]` count > 0 for the show | Not enforced | Visible in creator-mapping surface |
| Platforms assigned | `ShowPlatform[]` count > 0 for the show | Not enforced | Visible in show detail |
| Required task stages generated | Hardcoded in `/task-setup` readiness check | Advisory (task-setup surface) | Checks SETUP, ACTIVE, CLOSURE stages by template type |
| Required tasks assigned to operators | Hardcoded in `/task-setup` assignment readiness | Advisory (task-setup surface) | Checks that generated tasks have assignees |
| Critical record-collection tasks assigned | Not checked | Not enforced | Phase 5 candidate |
| Schedule linkage (if studio requires it) | `show.scheduleId` is not null | Not enforced | Orphan detection available in show list |

**Current surface**: `/studios/:studioId/task-setup` has a `ShowReadinessTriagePanel` that surfaces missing tasks and unassigned shows. This is the closest existing readiness check.

**Gap**: No unified show-level readiness checklist that aggregates all conditions.

## Transition: confirmed → live

Production readiness. The onset/production manager takes ownership of live execution.

| Condition | Where checked today | Enforcement | Notes |
|---|---|---|---|
| Duty manager or production owner visible | Shift coverage readable in shift-schedule surfaces | Not enforced | Time-overlap query, not show FK |
| All pre-production tasks completed | Task status check possible via task-target query | Not enforced | No live-readiness gate |
| Actual start signal | `show.actualStartTime` or manual status update | Not enforced | Can be set via task submission (fact extraction) or manager override |

**Gap**: No live control dashboard or `confirmed → live` transition trigger.

## Transition: live → completed

Post-production closure. Required records are confirmed for review, reporting, and downstream use.

| Condition | Where checked today | Enforcement | Notes |
|---|---|---|---|
| Closure tasks submitted or approved | Task review surface (task-review page) | Not enforced | Managers must know which tasks matter |
| Actual end/completion signal | `show.actualEndTime` or manual status update | Not enforced | Via fact extraction or manager override |
| Creator attendance outcome finalized | `ShowCreator.attendanceMissing` and related fields | Not enforced | Via fact extraction |
| Required platform performance facts present | `ShowPlatform.gmv`, `viewerCount`, etc. | Not enforced | Via fact extraction from closure tasks |
| No unresolved show-level blockers | No issue model exists | Not enforced | Phase 5 gap |

**Current surface**: `/studios/:studioId/task-review` for task approval, `/studios/:studioId/show-run-review` for daily exception review.

**Gap**: No show-level completion checklist.

## Transition: any → cancelled

Direct cancellation for shows that will not proceed.

| Condition | Where checked today | Enforcement | Notes |
|---|---|---|---|
| Cancellation reason provided | Not captured | Not enforced | Phase 5 candidate |
| No active downstream work | Schedule publish checks this automatically | Automatic (publish only) | If active tasks exist, publish sets `cancelled_pending_resolution` instead |

## Transition: any → cancelled_pending_resolution

Show cannot proceed but has operational consequences that need resolution.

| Condition | Where checked today | Enforcement | Notes |
|---|---|---|---|
| Reason category | Not captured | Not enforced | Candidate reasons: client conflict, creator missing, room unavailable, production failure |
| Resolution owner assigned | Not captured | Not enforced | Phase 5 gap: no owner queue |
| Affected records identified | Not tracked | Not enforced | Which tasks, creators, shifts are affected |

## Transition: cancelled_pending_resolution → cancelled or completed

Final disposition after resolution.

| Condition | Where checked today | Enforcement | Notes |
|---|---|---|---|
| All follow-up actions resolved | No follow-up model | Not enforced | Phase 5 gap |
| Final disposition chosen | Manual status update | Not enforced | cancelled = no production credit, completed = partial production counts |

## Fact Extraction as Implicit State Signal

The fact-extraction pipeline writes actuals that implicitly signal state progress:

| Fact written | Implicit signal |
|---|---|
| `show_actual_start_time` on Show | Show has started (live) |
| `show_actual_end_time` on Show | Show has ended |
| `creator_actual_start_time` on ShowCreator | Creator appeared |
| `creator_attendance_missing` on ShowCreator | Creator did not appear |
| `show_platform_gmv` etc. on ShowPlatform | Performance data collected |
| `show_platform_violation` on ShowPlatformViolation | Platform issue recorded |

These writes do NOT automatically transition show status. Status transitions remain manager-driven.

## Phase 5 Candidate Conditions (Not Yet Implemented)

From the Phase 5 gap summary, these conditions are identified but not yet modeled:

- State-based notification rules (who gets notified at each transition).
- Show-level issue record with owner, severity, due date, escalation path.
- Per-studio enforcement configuration (which conditions are off / warning / block).
- Schedule-change task reconciliation (stale task due dates after show timing changes).
- Show performance data correction with audit reason.
- Platform performance data import (manual upload or API).
