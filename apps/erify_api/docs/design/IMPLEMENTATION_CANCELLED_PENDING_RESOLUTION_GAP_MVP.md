# Implementation Plan: `cancelled_pending_resolution` Product Gap (MVP)

> **TLDR**: Adds a studio-scoped resolution workflow for shows stuck in `cancelled_pending_resolution` after schedule publish. New endpoint `POST /studios/:studioId/shows/:showId/resolve-cancellation` lets studio admins mark shows as cancelled (blocked if active tasks remain). Includes FE queue, warning banners, and resolve CTA.

> [!NOTE]
> **Status: ⏳ In Progress** — This MVP plan covers both backend (resolution policy, audit, endpoint) and frontend (queue, warnings, resolve dialog) work.

## 1. Context and Gap Statement

This plan closes the current operational gap for shows transitioned to `cancelled_pending_resolution` after schedule publish diff+upsert.

Current validated gap:

1. Studio admins can discover affected shows via filters, but lack a dedicated resolution workflow.
2. System admins can edit show status from system scope, but studio-scope resolution is incomplete.
3. Studio members do not consistently get clear cancellation/pending-resolution context in task flows.

This implementation is aligned with:

1. `apps/erify_api/docs/SCHEDULE_CONTINUITY.md`
2. `apps/erify_studios/docs/design/DESIGN_FE_SCHEDULE_CONTINUITY_IMPLEMENTATION_PLAN.md`

## 2. MVP Scope and Non-Goals

### 2.1 In Scope (MVP)

1. BE studio-scoped resolution action + policy.
2. FE pending-resolution queue, warning UX, and resolve CTA.
3. API contracts/types for request/response where needed.
4. Audit metadata and structured logging for resolution actions.
5. Unit/integration/regression tests for this workflow.
6. Consistent "active task" definition across publish and resolve flows.
7. Metadata-based transition context capture (no schema migration).

### 2.2 Out of Scope (MVP)

1. Full analytics dashboards for pending-resolution trends.
2. Multi-step case management/wizard UX.
3. Google Sheets planner UX redesign.
4. Advanced alerting automation beyond baseline counters/logs.

## 3. Public API / Interface Contract

### 3.1 New Endpoint

1. `POST /studios/:studioId/shows/:showId/resolve-cancellation`

### 3.2 Request Schema

1. `resolution_action`:
   - enum: `MARK_CANCELLED`
   - reserve `FORCE_MARK_CANCELLED` for future extension (not enabled in MVP policy)
2. `reason`:
   - required string
   - minimum length enforced
   - stored in audit metadata

### 3.3 Response Schema

1. `show`: updated show payload (includes status fields).
2. `resolution_summary`:
   - `previous_status`
   - `new_status`
   - `active_task_count`
   - `resolved_by`
   - `resolved_at`

### 3.4 Naming Contract

1. External contracts use `id` and `external_id`.
2. Internal implementation can use UID terminology for clarity.

### 3.5 Metadata Contract (No Migration Required)

Use `show.metadata` JSON for transition and resolution audit payloads.

1. Publish-time transition context (when moved to pending-resolution):

```json
{
  "cancellation_context": {
    "previous_status": "confirmed",
    "previous_status_system_key": "CONFIRMED",
    "triggered_by": "schedule_publish",
    "triggered_at": "2026-03-01T12:00:00.000Z"
  }
}
```

2. Resolution-time audit context:

```json
{
  "resolution": {
    "resolved_by": "user_xxx",
    "resolved_at": "2026-03-01T12:30:00.000Z",
    "reason": "Cancelled by client",
    "previous_status": "cancelled_pending_resolution",
    "active_task_count_at_resolution": 0
  }
}
```

## 4. Backend Workstream (Ordered)

### 4.0 Publish-Service Prerequisites (Must Land First)

Before exposing the studio resolve endpoint, update `publishing.service.ts` remove-flow behavior:

1. Apply canonical active-task filter when deciding `CANCELLED` vs `CANCELLED_PENDING_RESOLUTION`:
   - `taskTarget.deletedAt = null`
   - `task.deletedAt = null`
   - `task.status NOT IN ('COMPLETED', 'CLOSED')`
2. When transitioning to `CANCELLED_PENDING_RESOLUTION`, write `show.metadata.cancellation_context`:
   - `previous_status`
   - `previous_status_system_key`
   - `triggered_by = schedule_publish`
   - `triggered_at`
3. Treat this as a hard prerequisite for:
   - accurate pending-resolution queue signal,
   - resolution policy parity,
   - LIVE safeguard correctness.

### 4.1 Resolution Policy Service

1. Validate current show status is `CANCELLED_PENDING_RESOLUTION`.
2. Count active tasks using the same rule as publish path:
   - `taskTarget.deletedAt = null`
   - `task.deletedAt = null`
   - `task.status NOT IN ('COMPLETED', 'CLOSED')`
3. Enforce MVP rule:
   - `MARK_CANCELLED` allowed only when active task count is `0`.
   - otherwise reject with actionable domain error and active task count.
4. LIVE safeguard:
   - read `show.metadata.cancellation_context.previous_status`.
   - if `previous_status = live`, block default resolution with explicit error (override is post-MVP).

### 4.2 Authorization and Scope Enforcement

1. Ensure show belongs to `:studioId`.
2. Ensure caller is studio admin in that studio scope.
3. Return consistent forbidden/not-found behavior for cross-studio access.

### 4.3 Audited State Transition

1. Transition show status:
   - `CANCELLED_PENDING_RESOLUTION` -> `CANCELLED`.
2. Attach audit metadata:
   - `resolvedBy`
   - `resolvedAt`
   - `reason`
   - `previousStatus`
3. Keep transition idempotent:
   - if already `CANCELLED`, return success-style response with current state.

### 4.3.1 Publish-Time Metadata Backfill (Critical)

When publish moves show to `CANCELLED_PENDING_RESOLUTION`, write `metadata.cancellation_context` with:

1. previous status name/system key,
2. trigger source (`schedule_publish`),
3. trigger timestamp.

### 4.4 Observability

1. Structured log fields:
   - show uid/id
   - studio id
   - old/new status
   - active task count
   - actor uid
2. Emit counters for:
   - resolve success
   - resolve rejected due to active tasks
   - resolve forbidden/not-found

### 4.5 Endpoint Wiring

1. Add studio controller route and DTOs.
2. Implement orchestration/service path in studio scope (not system-only path).
3. Ensure shared API types are updated where endpoint contracts are consumed.

## 5. Frontend Workstream (Ordered)

### 5.1 Pending-Resolution Queue Entry

1. Add dedicated entry path in studio scope:
   - prefiltered shows list for `cancelled_pending_resolution`.
2. Keep deep-link compatibility with existing show filter params.

### 5.2 Status Visibility

1. Show table/list badges:
   - distinct styling for `cancelled_pending_resolution`.
2. Task-related surfaces:
   - status chip where show context is displayed.
3. Show task page:
   - persistent warning banner with clear operational guidance.

### 5.3 Resolve Action UX (Studio Admin)

1. Add `Mark Cancelled` action button for eligible rows/pages.
2. Confirmation dialog with required reason input.
3. Handle policy errors:
   - active tasks remain
   - status already changed
   - permission or scope mismatch
4. Invalidate/reload relevant queries immediately after success.

### 5.3.1 Task Resolution Sub-Workflow (MVP Requirement)

To avoid stuck queue items, resolution UI must include direct path to make active task count reach zero:

1. show active task count in dialog/error response context,
2. provide direct navigation to filtered task list for the show,
3. provide explicit operator guidance:
   - close/cancel remaining non-terminal tasks before retrying resolve.

Bulk "close all tasks" is post-MVP unless explicitly approved.

### 5.4 Member-Facing Clarity

1. On task list/detail, show explicit indicator when linked show is pending/cancelled.
2. Ensure language is operationally clear and avoids ambiguous “inactive” wording.

## 6. Acceptance Criteria

1. Studio admin can locate all pending-resolution shows via dedicated queue.
2. Studio admin can resolve show to `CANCELLED` without system-admin-only fallback.
3. Resolution is blocked with actionable error when active tasks remain.
4. Studio member sees clear pending/cancelled context on related task pages.
5. Existing diff+upsert publish continuity remains unchanged.
6. Restore-on-republish behavior remains unchanged for reappearing `external_id`.
7. Pending-resolution queue does not include shows with only terminal tasks (completed/closed).
8. If publish moved a previously `LIVE` show to pending-resolution, default resolve action is blocked with explicit guidance.
9. Manually resolved shows may be restored by later publish reappearance; behavior is documented and visible to admins.

## 7. Test Matrix

### 7.1 Backend Unit Tests

1. Status precondition validation.
2. Active-task policy enforcement.
3. Idempotent behavior when already cancelled.
4. Audit metadata generation.

### 7.2 Backend Integration Tests

1. Happy path transition:
   - `CANCELLED_PENDING_RESOLUTION` -> `CANCELLED`.
2. Rejection path:
   - active tasks > 0.
3. Authorization path:
   - non-admin / cross-studio.
4. Response contract:
   - `show` + `resolution_summary`.
5. Active-task definition consistency:
   - `COMPLETED`/`CLOSED` tasks do not block resolution.
6. LIVE safeguard:
   - blocked resolution when `cancellation_context.previous_status = live`.
7. Publish transition metadata:
   - `cancellation_context` written when moved to pending-resolution.

### 7.3 Frontend Component Tests

1. Badge rendering for pending-resolution status.
2. Warning banner visibility on show task page.
3. Resolve dialog validation and error state rendering.

### 7.4 Frontend Integration Tests

1. Queue route/filter behavior.
2. Resolve success refreshes list/detail state.
3. Blocked resolve displays active-task guidance.

### 7.5 Regression Tests

1. Publish diff+upsert continuity unchanged.
2. Re-publish restore flow unchanged for matching `external_id`.
3. No false-positive pending-resolution on shows with only terminal tasks.

## 8. Rollout and Monitoring

1. Deploy BE endpoint + FE action with role-based visibility.
2. Enable queue/warning surfaces in studio UI.
3. Monitor:
   - pending-resolution volume trend
   - resolve success/failure rates
   - rejection rate due to active-task policy
4. Collect studio-admin feedback and tune message copy/actions.
5. Queue discoverability baseline:
   - when publish summary reports `shows_pending_resolution > 0`, FE provides direct link/entry to pending-resolution queue.

## 9. Open Follow-Ups (Post-MVP)

1. Optional force-resolve path with stronger permission/audit model.
2. Queue metrics dashboard and SLA views.
3. Bulk resolve operations with safeguards.
4. Restored-by-publish timeline indicator standardization across FE surfaces.
5. Notification channels (email/Slack/in-app alerts) for new pending-resolution items.

## 10. Assumptions and Defaults

1. MVP includes both BE and FE resolution flow.
2. One shared implementation plan doc is used for this feature.
3. Default policy: cannot mark cancelled while active tasks remain.
4. Existing system-admin edit paths remain, but are not required for normal studio resolution.
5. Existing schedule diff+upsert publish behavior is stable and must not be changed by this MVP.
6. No DB schema migration is required for core MVP workflow; `show.metadata` stores transition/resolution context.
