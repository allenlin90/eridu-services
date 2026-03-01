# Frontend Design and Implementation Plan: Schedule Continuity Support

> **TLDR**: Frontend changes to support the backend diff+upsert publish. Adds status badges/filters for `cancelled_pending_resolution`, warning banners on affected show/task pages, and a studio-scoped resolution queue. Three phases: A (status compatibility), B (resolution UX), C (publish impact visibility).

> [!NOTE]
> **Status: ⏳ In Progress** — For `cancelled_pending_resolution` MVP closure, both **Phase A (status compatibility)** and **Phase B (resolution UX)** are in scope. Phase C remains optional/follow-up.

## 1. Purpose

Define frontend work required to support the new backend continuity-safe publish flow, without forcing planner workflow migration.

Reference:

- `apps/erify_api/docs/SCHEDULE_CONTINUITY.md`

Primary FE objective:

- Surface publish impact and resolution signals clearly for admins/managers.

---

## 2. Scope

In scope:

1. Minimal FE changes needed after backend diff+upsert rollout.
2. Visibility for `cancelled_pending_resolution` and publish impact.
3. Operational resolution UX for affected shows/tasks.

Out of scope:

1. Full planner-first schedule editor migration.
2. Replacing Google Sheets planning workflow.

---

## 3. Current State

1. Studio operational pages for show/task management already exist.
2. System schedule page exists (basic list/edit/delete/snapshots).
3. No dedicated FE surface today for publish impact summary from Sheets path.
4. No explicit resolution workflow UI for shows moved to `cancelled_pending_resolution`.

## 3.1 Confirmed Gap from Current Rollout

1. Studio admins can discover pending-resolution shows via status filter, but there is no focused queue and no explicit resolve action in studio scope.
2. System admins can manually edit show status in `/system/shows`, creating role asymmetry for day-to-day studio operations.
3. Studio member task pages do not always make cancellation/pending-resolution state obvious enough during execution.

---

## 4. Target UX Behavior (Phase-based)

## 4.1 Phase 1 (minimum viable FE)

1. Show status badges include `cancelled` and `cancelled_pending_resolution`.
2. Studio show lists can filter/search by these statuses.
3. Task pages indicate when show is pending resolution.
4. Admin can still close/reassign/delete tasks via existing flows.
5. Handle restored shows gracefully: a previously cancelled show that reappears after re-publish should display its updated active status without stale warning artifacts.

## 4.2 Phase 2 (operational clarity)

1. Add “Pending Resolution” views in studio/system scopes.
2. Add lightweight guidance panel for resolution actions:
   - reassign tasks
   - close tasks
   - confirm cancellation completion
3. Display publish summary metrics in relevant admin surfaces and deep-link to pending-resolution queue when `shows_pending_resolution > 0`.
4. Surface restore events: when a previously cancelled show is automatically restored by a re-publish, display a visual indicator (e.g., "Restored" badge or timeline entry) so admins understand the show was re-activated and its tasks/targets were resumed.

---

## 5. UX Requirements

1. No workflow disruption for existing studio task operations.
2. Clear visual distinction for risky states (`cancelled_pending_resolution`).
3. Minimal extra clicks for resolution.
4. Mobile-safe behavior for action flows already present.

---

## 6. Data Contract Dependencies

FE depends on BE exposing:

1. New show status values in existing show payloads (`cancelled`, `cancelled_pending_resolution`).
2. Publish summary metadata (created/updated/removed/pending-resolution/restored counts) — schema defined in `@eridu/api-types`.
3. Stable status identity from API via `systemKey` (confirmed in BE design).
4. Remove policy uses status-only transitions (not soft-delete) — shows remain queryable; filter by status, not `deletedAt`.
5. Canonical active-task definition used by resolve policy:
   - task target not deleted
   - task not deleted
   - task status not in `COMPLETED`, `CLOSED`
6. Cancellation context metadata in show payload (or derived field) for stronger warnings, especially when pre-transition status was `LIVE`.

---

## 7. File-Level Implementation Plan

## 7.1 Show status display/filter updates

Potential targets:

1. `apps/erify_studios/src/features/studio-shows/components/studio-shows-table/columns.tsx`
2. `apps/erify_studios/src/routes/studios/$studioId/shows/index.tsx`
3. `apps/erify_studios/src/features/shows/config/show-columns.tsx`
4. `apps/erify_studios/src/features/shows/config/show-search-schema.ts`

Changes:

1. Add badge styling/label handling for `cancelled_pending_resolution`.
2. Ensure filters include this status.

## 7.2 Show task page warning state

Targets:

1. `apps/erify_studios/src/routes/studios/$studioId/shows/$showId/tasks.tsx`
2. `apps/erify_studios/src/features/studio-shows/api/get-studio-show.ts` (if typed fields needed)

Changes:

1. Show warning banner when current show status is pending resolution.
2. Provide clear next actions (reassign/close tasks).
3. If cancellation context indicates prior status `LIVE`, elevate warning severity and require stronger confirmation copy in resolution dialogs.

## 7.3 System/admin task pages

Targets:

1. `apps/erify_studios/src/routes/system/tasks/index.tsx`
2. `apps/erify_studios/src/routes/system/shows/$showId/tasks.tsx`
3. task column/filter configs under `features/tasks/config/*`

Changes:

1. Add filter chips or quick filter for pending-resolution show state (if available in task payload relation).
2. Keep assignment/reassign flows unchanged.

## 7.4 Optional publish impact UI

If BE exposes publish summary in admin APIs:

1. add lightweight panel or toast summary in schedule-related admin views
2. summary includes: created / updated / removed / pending-resolution / restored counts
3. candidate: `apps/erify_studios/src/routes/system/schedules/index.tsx`

---

## 8. Implementation Phases

## Phase A: Compatibility

1. Update status handling and badges.
2. Ensure no parsing errors for new status values.
3. Add tests for rendering and filters.

## Phase B: Resolution UX

1. Add warning banners and action hints on affected show/task screens.
2. Add filtered pending-resolution queue as a first-class path (not optional).
3. Add direct navigation from blocked resolve errors to the show's remaining active tasks.

## Phase C: Impact visibility (optional in first release)

1. Surface publish summary metrics.
2. Add links to impacted shows/tasks when available.

---

## 9. Testing Plan

## 9.1 Unit/component tests

1. Status badge rendering for pending-resolution.
2. Table filtering/search by new status.
3. Warning banner conditions on show task page.

## 9.2 Integration tests

1. Studio show list still supports generate/assign flows.
2. Task pages continue to support assign/reassign/update actions with new status states.
3. No regressions in mobile action sheets/dialogs.

---

## 10. Rollout and Risk

Risks:

1. New statuses (`cancelled`, `cancelled_pending_resolution`) not handled in all dropdown/filter enums.
2. User confusion without clear wording for pending-resolution.
3. API payload mismatch if BE and FE rollout are not coordinated.
4. Restore flow edge case: a show an admin manually resolved (closed tasks, confirmed cancellation) could flip back to active on the next publish if the planner re-adds it to the sheet. Admin work may appear undone.

Mitigations:

1. Feature flag UI affordances if needed.
2. Graceful fallback labels for unknown statuses.
3. Coordinate contract verification before release.
4. For restore edge case: surface a "Restored" indicator so admins understand the status change was triggered by a re-publish, not a manual edit.

---

## 11. Milestones

1. Milestone FE-1:
   - status compatibility + filters + tests
2. Milestone FE-2:
   - resolution banners + operational guidance
3. Milestone FE-3:
   - optional publish impact summary surfaces

---

## 12. Exit Criteria

1. FE can display and handle `cancelled_pending_resolution` end-to-end.
2. Existing studio task operations remain stable.
3. Admins can identify and resolve pending-resolution impacts without backend console intervention.
4. Admins can move from pending-resolution queue to exact remaining active tasks without manual searching.
5. FE clearly communicates when a show was restored by re-publish after prior manual resolution.

---

## 13. End-to-End User Flow (UX Target)

1. Planner republishes; backend marks impacted show as `cancelled_pending_resolution`.
2. Studio admin lands on a dedicated pending-resolution queue (not just generic filter), including direct entry from publish summary surfaces.
3. Studio admin opens show tasks, sees explicit warning context, then resolves task workload.
4. Studio admin confirms show outcome using explicit resolve action (when BE endpoint/policy is available).
5. Studio member always sees clear warning badge/banner when working tasks linked to pending/cancelled shows.
6. If planner re-adds the show later, FE surfaces a restore indicator so users understand why status changed back.
7. If resolve is blocked due to active tasks, UI shows active task count and exact next step path (open filtered tasks, close/cancel, retry resolve).

---

## 14. Consolidated Cleanup Checklist (FE)

1. Status compatibility:
   - ensure all status enums/dropdowns include `cancelled` and `cancelled_pending_resolution`.
   - keep fallback rendering for unknown statuses.
2. Discovery and queue UX:
   - add dedicated pending-resolution view in studio scope.
   - keep deep-link support from filtered shows/tasks routes.
3. Task-context visibility:
   - add persistent warning banner on show-task pages for pending/cancelled statuses.
   - add status chips in task list/detail surfaces where show context appears.
4. Resolution UX:
   - add explicit CTA(s) for admin resolution flow once BE action is exposed.
   - preserve current assign/reassign/close flows to avoid regressions.
5. Verification and docs:
   - regression-test status filters, badges, warning banners, and mobile dialogs.
   - keep this FE design doc and BE design doc as canonical continuity references.
