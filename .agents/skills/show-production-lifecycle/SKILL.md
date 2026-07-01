---
name: show-production-lifecycle
description: Livestream show lifecycle, entity relationships, state transitions, readiness conditions, and operational role boundaries. Use when implementing or reviewing show CRUD, status transitions, readiness gates, cancellation/resolution workflows, post-production completion, creator/platform assignment as lifecycle records, or any feature that touches the show as the central operational record.
---

# Show Production Lifecycle

The show is the central operational record in eridu-services. Every schedule, creator assignment, task, shift, platform stream, performance metric, and compensation line item connects through or references a show. This skill defines the lifecycle contract, entity relationships, and operational boundaries that agents must understand before changing show-related code.

## When to Use This Skill

- Adding or changing show status transitions or state-gate logic.
- Implementing readiness checks, completion gates, or cancellation/resolution flows.
- Building or modifying surfaces that span multiple lifecycle phases (task setup, live control, post-production review).
- Connecting a new entity or feature to the show graph.
- Reviewing whether a change respects the lifecycle contract or breaks assumptions downstream.

## Lifecycle State Machine

```
[*] → draft → confirmed → live → completed
                draft → cancelled
            confirmed → cancelled
                 live → cancelled_pending_resolution
                        cancelled_pending_resolution → cancelled
                        cancelled_pending_resolution → completed
```

| State | Business meaning | Operational owner |
|---|---|---|
| `draft` | Show exists from schedule publish or manual creation; readiness incomplete. | Planning Manager (MANAGER access) |
| `confirmed` | Planning manager accepted the show as operationally ready for production. | Planning Manager → handoff to Production Manager |
| `live` | Show is actively running; onset production owns execution. | Production Manager (MANAGER access) |
| `completed` | Required production and post-production records are complete for review/reporting. | Production Manager + Post-production review |
| `cancelled` | Closed without production; no further resolution required. | Either manager role |
| `cancelled_pending_resolution` | Cannot proceed or interrupted; operational consequences need resolution. | Admin/Manager sign-off; active Duty Manager may open |

### Key state rules

- `ShowStatus` is a **lookup table** (not a Prisma enum). Shows reference it via `showStatusId`. Status names are matched by `systemKey` or `name` in code.
- The Phase 5 gap summary defines enforcement levels (off / warning / block) per studio, but enforcement configuration is deferred. Current transitions are manager-driven without hard gates.
- `cancelled_pending_resolution` can be set automatically by schedule publish when active downstream work exists, by Admin/Manager users through show detail cancellation, or by the active Duty Manager from the dashboard request path.

## Entity Relationship Map

```
Studio ──┬── Show ──┬── ShowCreator[] ── Creator
         │          │     └── CompensationLineItemTarget[]
         │          ├── ShowPlatform[] ── Platform
         │          │     ├── ShowPlatformViolation[]
         │          │     └── Performance metrics (gmv, ctr, cto, viewerCount)
         │          ├── TaskTarget[] ── Task ── TaskSubmission[]
         │          │                              └── Fact extraction pipeline
         │          ├── CompensationLineItemTarget[]
         │          ├── AuditTarget[]
         │          └── Schedule? (optional, via scheduleId)
         ├── StudioRoom (linked via show.studioRoomId)
         ├── StudioShift[] (time-overlap, not FK)
         └── StudioCreator[] (roster, not direct show FK)
```

For field-level detail on each entity, see [references/entity-relationships.md](references/entity-relationships.md).

## Lifecycle Phases

### 1. Pre-Production (draft → confirmed)

**Input sources**: Google Sheets schedule publish, manual studio show creation.

**Planning records that must exist or be reviewed**:
- Show shell: name, timing, client, type, standard, status, studio.
- Room assignment (`studioRoomId`).
- Creator assignments (`ShowCreator[]` via creator mapping after roster intake).
- Platform assignments (`ShowPlatform[]`).
- Generated tasks from stage-specific templates (setup, live, closure stages).
- Task assignees (operators assigned to generated tasks).
- Shift/staffing coverage (time-overlap with `StudioShift`).

**Current surfaces**: `/studios/:studioId/shows` (show list + CRUD), `/studios/:studioId/creators` (creator roster intake), `/studios/:studioId/task-setup` (task generation, assignment, readiness), `/studios/:studioId/creator-mapping` (bulk creator assignment).

**Gap (Phase 5)**: No unified planning readiness checklist for `draft → confirmed`.

### 2. Production (confirmed → live → completed)

**Execution records**:
- Task submissions from operators (`/studios/:studioId/my-tasks`).
- Show actuals: `actualStartTime`, `actualEndTime` on Show, ShowCreator, ShowPlatform.
- Creator attendance: `attendanceMissing`, `attendanceReason` on ShowCreator.
- Platform violations: `ShowPlatformViolation[]` (append-only with `supersededAt`).
- Performance metrics: `gmv`, `viewerCount`, `ctr`, `cto` on ShowPlatform.

**Fact extraction**: When tasks are approved, the fact-extraction pipeline writes actuals to Show/ShowCreator/ShowPlatform entities. Source priority: MANAGER (4) > PLATFORM (3) > CREATOR_INPUT (2) > OPERATOR (1) > PLANNED (0). See `fact-extraction-pipeline` skill.

**Manager performance correction** (Phase 5): `POST /studios/:studioId/shows/:id/platforms/:showPlatformUid/correct-performance` (ADMIN/MANAGER). Sets `actuals_source` to MANAGER for each corrected metric — the highest extraction priority — and creates an `OVERRIDE` audit record with a required business reason. The extraction pipeline enforces MANAGER priority at both read time and write time (WHERE predicate), so a correction is not overwritten by a subsequent extraction run. See [show-performance-analytics.md](../../../docs/features/show-performance-analytics.md#performance-correction-phase-5).

**Current surfaces**: `/studios/:studioId/shows/:showId/actuals`, `/studios/:studioId/shows/:showId/tasks`.

**Gap (Phase 5)**: No live control dashboard, no show-level issue tracking. Fact extraction already writes platform violations and attendance-missing flags here, but they land as silent data with no issue record and no stakeholder notification — a manager only finds them by actively opening a review surface. See `PHASE_5.md` items 8 and 16.

### 3. Post-Production (live → completed)

**Closure records**:
- Submitted or approved closure tasks.
- Creator attendance finalized.
- Platform performance facts present.
- No unresolved show-level blockers.

**Current surfaces**: `/studios/:studioId/task-review` (review + bulk approve), `/studios/:studioId/show-run-review` (daily exception review), `/studios/:studioId/shows/:showId/performance`, `/studios/:studioId/costs`.

**Gap (Phase 5)**: No show-level completion checklist for `completed` state.

### 4. Cancellation and Resolution

**Cancellation paths**:
- `draft → cancelled` or `confirmed → cancelled`: Direct cancellation.
- `live → cancelled_pending_resolution`: Show interrupted during production.
- `cancelled_pending_resolution → cancelled`: Resolution complete, no production.
- `cancelled_pending_resolution → completed`: Resolution complete, partial production counts.

**Current behavior**: Schedule publish sets `cancelled_pending_resolution` automatically when active tasks exist. Manual cancellation uses the cancellation gate: Admin/Manager users can cancel directly from show detail, active Duty Managers can open pending resolution from the dashboard, and Admin/Manager users resolve pending shows to `cancelled` or `completed`. Audit rows are the history source.

### State-gate task invariants

`STATE_GATE` tasks are system workflow records, not ordinary production tasks. Any endpoint or service that touches generic task assignment, claiming, completion, bulk reassignment, or task DTO serialization must prove whether state-gate tasks are included or explicitly excluded.

- Claim routes must verify the task is a state gate before mutating assignment or writing gate history.
- Generic task completion paths must not complete state gates; show status resolution must happen in the same backend transaction as the gate task completion.
- Bulk assignment paths for ordinary show tasks must exclude `STATE_GATE` unless they route through the gate reassignment/audit flow.
- Backend guards must enforce terminal-state rules even when the frontend hides an action; never rely on UI visibility to protect `completed` or other terminal records.
- If a system task is snapshotless, every DTO/schema that serializes tasks must accept that shape intentionally, or the creation path must attach a valid snapshot.
- Authorization must match the rendered action: if managers see a Claim/Resolve action, the backend route must allow that role or the UI must hide the action.

**Gap (Phase 5)**: The focused cancellation workflow is implemented. Remaining cancellation-adjacent gaps are focused pending-resolution queue/discovery, notifications, comments/follow-up ownership, and full lifecycle state enforcement.

## Readiness Conditions

These conditions are identified for lifecycle gates. Current enforcement is advisory only (no hard blocks).

| Condition | Relevant transition | Current status |
|---|---|---|
| Room assigned | draft → confirmed | Field exists, not enforced |
| Creators assigned | draft → confirmed | Field exists, not enforced |
| Platforms assigned | draft → confirmed | Field exists, not enforced |
| Required task stages generated | draft → confirmed | Hardcoded check in task-setup |
| Required tasks assigned to operators | draft → confirmed | Hardcoded check in task-setup |
| Duty manager or production owner visible | confirmed → live | Shift coverage readable, not enforced |
| Post-production tasks submitted/approved | live → completed | Task review exists, not enforced as gate |
| Required performance facts present | live → completed | Fact extraction exists, not enforced |
| No unresolved show-level blockers | live → completed | No issue model yet |
| Cancellation reason provided | any → cancelled | Captured by cancellation gate |
| Pending-resolution owner assigned | any → cancelled_pending_resolution | Duty Manager can open pending resolution; final sign-off remains Admin/Manager |

For the full condition inventory and enforcement-level design, see [references/state-gates.md](references/state-gates.md).

## Operating Roles

| Role | Lifecycle responsibility | Current access |
|---|---|---|
| Studio Admin | Full studio control including show lifecycle authority | `ADMIN` role |
| Studio Manager | Combined planning + production management | `MANAGER` role |
| Planning Manager | Schedule intake, readiness, creator mapping, room assignment, confirmation | `MANAGER` access (business concept, not separate role) |
| Production Manager | Live execution, task submission health, issue capture, completion handoff | `MANAGER` access (business concept, not separate role) |
| Talent Manager | Creator roster, availability, creator-show assignment | `TALENT_MANAGER` role (narrower than planning manager) |
| Operator / Member | Execute tasks, submit task content, contribute actuals | `MEMBER` role via `/my-tasks` |
| Creator | On-camera talent with assignment, attendance, compensation context | External entity, not a platform role |

Granular role decomposition (RBAC) is deferred to Phase 6+.

## Cross-Skill References

Do not duplicate guidance from these skills. Reference them for their owned domain:

| Topic | Skill | What it owns |
|---|---|---|
| Schedule → show sync, pending resolution on publish | `schedule-continuity-workflow` | Schedule publish lifecycle |
| Fact extraction from task submissions | `fact-extraction-pipeline` | Extractor implementation, SystemFactKey catalog |
| Review screen composition (read-only surfaces) | `operations-review-surface` | UI surface patterns, operational-day window |
| Shift CRUD, duty-manager coverage | `shift-schedule-pattern` | Staff scheduling mechanics |
| Multi-service orchestration patterns | `orchestration-service-nestjs` | Generic backend architecture |
| Task template schema, builder UI | `task-template-builder` | Template CRUD and draft persistence |
| SystemFactKey catalog expansion | `template-system-fact-migration` | Fact key bindings |

## Implementation Landmarks

### Backend

| Layer | Key files |
|---|---|
| Schema | `apps/erify_api/prisma/schema.prisma` — Show (L113), ShowCreator (L177), ShowPlatform (L216), ShowStatus (L338) |
| Model service | `apps/erify_api/src/models/show/show.service.ts` |
| Repository | `apps/erify_api/src/models/show/show.repository.ts` |
| Orchestration | `apps/erify_api/src/show-orchestration/show-orchestration.service.ts` |
| Creator assignment | `apps/erify_api/src/show-orchestration/show-creator-assignment.service.ts` |
| Platform assignment | `apps/erify_api/src/show-orchestration/show-platform-assignment.service.ts` |
| Show run review | `apps/erify_api/src/show-orchestration/show-run-review.service.ts` |
| Studio show management | `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts` |
| Studio controller | `apps/erify_api/src/studios/studio-show/studio-show.controller.ts` |
| Admin controller | `apps/erify_api/src/admin/shows/admin-show.controller.ts` |
| Fact extraction | `apps/erify_api/src/orchestration/fact-extraction/` |
| Shared types | `packages/api-types/src/shows/` |

### Frontend

| Surface | Key files |
|---|---|
| Show list + CRUD | `apps/erify_studios/src/routes/studios/$studioId/shows/`, `features/studio-shows/` |
| Show detail tabs | `apps/erify_studios/src/routes/studios/$studioId/shows/$showId/` (details, actuals, performance, compensation, tasks) |
| Task setup | `apps/erify_studios/src/routes/studios/$studioId/task-setup/`, `features/studio-shows/hooks/use-task-setup-page-controller.ts` |
| Task review | `apps/erify_studios/src/routes/studios/$studioId/task-review/` |
| Show run review | `apps/erify_studios/src/routes/studios/$studioId/show-run-review.tsx`, `features/show-run-review/` |
| Creator mapping | `apps/erify_studios/src/routes/studios/$studioId/creator-mapping/`, `features/studio-show-creators/` |
| Performance | `apps/erify_studios/src/routes/studios/$studioId/performance.tsx`, `features/studio-performance/` |
| Costs | `apps/erify_studios/src/routes/studios/$studioId/costs.tsx`, `features/studio-costs/` |
| Show lookups | `features/shows/api/get-show-lookups.ts` |
| Show status badge | `features/admin/components/show-table-cells.tsx` |
| Sidebar nav | `config/sidebar-config.tsx` (Planning → Shows/Creator Mapping; Operations → Task Setup/Review/Show Run Review) |

## Rules for Show-Related Changes

1. **Show is the anchor.** If a new entity needs show context, it should reference `Show` (via FK or `TaskTarget`), not duplicate show fields.
2. **Status is a lookup table.** Use `showStatusId` / `showStatus.systemKey` to match statuses in code. Do not hardcode status IDs.
3. **Actuals flow through fact extraction.** Do not write directly to `Show.actualStartTime` etc. from controllers. The fact-extraction pipeline and `StudioShowManagement` (manager override) are the two write paths.
4. **Source priority matters.** Higher-priority sources block lower-priority rewrites. Check `source-priority.ts` before adding new actual-write paths.
5. **Pre-start delete is disposable.** Soft-deleting a pre-start show removes task targets and orphaned tasks. Restore treats the show as a new lifecycle.
6. **Schedule linkage is optional.** Shows can exist without a schedule (manual creation). When linked, schedule publish can update schedule-owned fields.
7. **Creator assignment is via ShowCreator.** Do not create direct Show → Creator FKs. Use the `ShowCreator` junction with per-show compensation overrides.
8. **Platform metrics live on ShowPlatform.** `gmv`, `ctr`, `cto`, `viewerCount` are per-platform, not per-show. Aggregate in queries, not in schema.
9. **Violations are append-only.** `ShowPlatformViolation` uses `supersededAt` for soft-history. Do not update or delete violation rows.
10. **Compensation snapshots are downstream.** `CompensationLineItemTarget` connects shows and show-creators to the compensation system. Do not compute compensation in show services.
11. **State gates are special task workflows.** Do not let `STATE_GATE` tasks flow through generic claim, complete, or bulk assignment paths without an explicit invariant check and audit behavior.
