# Show State Gate — Design

Status: Approved, not yet implemented (supersedes the `ShowCancellationResolution` model added in PR #229).

Related ideation: [Task as a Generic Workflow Primitive](../../ideation/task-generic-workflow-primitive.md) tracks the broader generalization questions this design intentionally does *not* answer yet (entity-agnostic gate primitive beyond Show, a formal "system-generated task kind" convention). Check it before extending this pattern to a third gate kind or a second entity.

## Problem

A show in production can be interrupted (creator no-show, room unavailable, equipment failure, platform issue, etc.) and needs to sit in a middle status — "cannot proceed yet, needs someone to resolve it" — before its lifecycle can close. PR #229 implemented this for cancellation specifically: a new `ShowCancellationResolution` table holding an owner, a due date, free-text notes, and a final disposition.

Two problems with that approach:

1. **Duplication.** Every field on `ShowCancellationResolution` (assignee, due date, notes, completion outcome) already exists on the `Task` model, which is this codebase's canonical reference pattern for exactly this shape of work (assign someone, give them a due date, let them close it out with notes). `Task` already has `TaskTarget` for linking to a `Show`, and `finalDisposition` on the resolution row was itself redundant — it's the same value that ends up driving `Show.status`, just stored twice.
2. **No reuse path.** `live → cancelled_pending_resolution → cancelled|completed` is one instance of a more general shape that shows up across fast-moving livestream/e-commerce operations: *a status transition that needs a person, a deadline, and a chosen outcome before it can complete.* A bespoke table per case (new model, repository, service, migration each time) doesn't scale as more of these appear; `state-gates.md` already names this exact gap ("All follow-up actions resolved... Advisory only. No task/issue linkage yet").

## Goal

Build cancellation follow-up on top of `Task`, and shape that work as a generic, reusable primitive — a **State Gate** — so the next middle-status-with-an-owner requirement (for shows, and potentially other entities later) is a config addition, not a new subsystem.

This design covers **two callers** of that primitive from day one, not one: manual studio cancellation (`show_cancellation`, PR #229's scope) and schedule-publish-triggered auto-cancellation (`schedule_publish_removal`, the gap `IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md` flagged but never closed). Both are the same entity (`Show`) and the same `gateKind` config shape (`GATE_CONFIG`'s whole reason for existing is that adding a kind is cheap), so neither ideation decision gate in [Task as a Generic Workflow Primitive](../../ideation/task-generic-workflow-primitive.md) fires here — this is exactly the "config addition, not a new subsystem" case the primitive was designed for, now exercised twice instead of once.

## Non-goals (this iteration)

- Cross-studio/ops dashboard for gates (deferred — `/system/tasks/` already gives ops a cross-studio task view filterable by type; revisit only if a dedicated gate-level rollup is requested).
- Active notifications (email/in-app) on gate creation, overdue, or resume (deferred — no notification channel exists for tasks today; the planner-notice for resumed shows uses a passive `Show.metadata` display hint instead, not a new channel; revisit active notification if/when a channel exists).
- A `TaskTemplate`/snapshot for gate content (deferred — gate content shapes are code-defined per `gate_kind`, not manager-authored forms).
- A second-level UI filter on `gate_kind` (deferred — two gate kinds today at low combined volume (~20 manual cancellations/studio/month, schedule-publish removals expected lower); both are distinguishable by description text and `schedule_publish_removal`'s unassigned state without a dedicated filter. Revisit if a third kind ships or the task-review list gets noisy).
- Enforcing the broader readiness/completion gate matrix in `state-gates.md` (explicitly out of scope per the existing Phase 5 gap note — this design only closes the cancellation-resolution row of that table).
- An override path for the LIVE safeguard (forcing a `CANCELLED` outcome despite `from_status === 'live'`) — deferred, matching the old MVP doc's own "override is post-MVP" stance. For this iteration, a live-interrupted show's only gate-driven paths are `RESTORE_PREVIOUS` or `COMPLETED`; forcing straight to `CANCELLED` requires a direct system-admin status edit outside the gate flow.
- A bulk "close all active tasks" action from the resolve dialog when `ACTIVE_TASKS_REMAIN` blocks a `CANCELLED` outcome — the manager navigates to the show's task list and closes/reassigns them individually (existing task-management UI), same MVP scope the old design drew.

## Data Model

No new Prisma model. Reuses `Task` + `TaskTarget`.

- Add one new `TaskType` enum value: `STATE_GATE`. This is the *only* schema change. It is reused by every future gate kind — adding a new kind never requires a migration.
- `Task.metadata` carries the gate envelope:
  ```json
  { "gate_kind": "show_cancellation", "from_status": "live", "pending_status": "cancelled_pending_resolution" }
  ```
  `gate_kind` is a free string, not an enum.
- `Task.content` carries gate-kind-specific data. For `show_cancellation`: `reason_category`, `reason_note`, `follow_up_notes`, and (once resolved) `resolution_notes`. Every gate kind also carries a `history` array (see **Ownership, Handover, and Traceability** below) — `Array<{ event: 'opened' | 'claimed' | 'reassigned' | 'resolved'; actor_id: string | null; at: string; note?: string }>`, appended to on every gate lifecycle action.
- `Task.assigneeId` is the resolution owner. Plain `User`, not `StudioMembership` — role/membership scoping on who *can* be assigned is deferred; it only matters at creation/assignment time, and can be layered on later (e.g. validate the chosen user has an active membership in the studio) without a schema change.
- Linked to the `Show` via the existing `TaskTarget` join (`showId` FK already indexed there) — identical to how any other task targets a show.
- `Task.snapshotId`/`templateId` stay `null` — no template needed for code-defined gate content.

`ShowCancellationResolution` (model, repository, service, migration) is dropped entirely from PR #229's scope.

## Gate Config (code, not data)

A small lookup table is the single source of truth for what a gate kind means and what it allows:

```ts
const GATE_CONFIG = {
  show_cancellation: {
    pendingStatus: 'CANCELLED_PENDING_RESOLUTION',
    allowedOutcomes: ['CANCELLED', 'COMPLETED'],
    outcomesRequiringNoActiveTasks: ['CANCELLED'], // can't confirm "no production happened" while work is still open
    reasonOptions: ['CREATOR_UNAVAILABLE', 'ROOM_UNAVAILABLE', 'EQUIPMENT_FAILURE',
                     'UTILITY_OUTAGE', 'PLATFORM_ISSUE', 'CLIENT_REQUEST', 'OTHER'],
    requiresOwner: true, // owner is picked by the manager at cancel time, so it's never unassigned
  },
  schedule_publish_removal: {
    pendingStatus: 'CANCELLED_PENDING_RESOLUTION',
    allowedOutcomes: ['CANCELLED', 'RESTORE_PREVIOUS'], // confirm the removal, or undo it without waiting for another publish
    outcomesRequiringNoActiveTasks: ['CANCELLED'],
    reasonOptions: ['REMOVED_FROM_REPUBLISHED_SCHEDULE'], // system-generated, not manager-chosen
    requiresOwner: false, // created unassigned (no human in the loop at publish time); a manager must claim it before resolving — see Ownership section
  },
  // future gate kinds added here, not as new tables/enum values
} as const;
```

Adding a new gate kind (e.g. `creator_no_show`, `platform_escalation`) means adding an entry here plus the calling code for that transition — no new model, repository, or migration.

## Generic Service Primitives

Three methods, kind-agnostic, intended to be reused by every future gate:

- `openGate(showId, gateKind, { ownerId, dueDate, content })` — looks up `GATE_CONFIG[gateKind]`, creates the `STATE_GATE` Task + `TaskTarget` (`assigneeId: ownerId ?? null` — `ownerId` is optional precisely because `schedule_publish_removal` has no human present at creation time), moves `Show.status` to `gateConfig.pendingStatus`, writes the existing `Audit` row shape (`field: 'show_status'`, old/new value, `gate_task_uid` in metadata — unchanged from PR #229's audit calls), and appends `{ event: 'opened', actor_id: ownerId ?? createdById ?? null, at: now, note: content.reason_note }` to `Task.content.history`.
- `claimGate(taskUid, userId)` — sets `Task.assigneeId = userId` **only if currently `null`**, via a conditional update guarded by `Task.version` (the existing optimistic-lock field) — `UPDATE ... WHERE id = ? AND assignee_id IS NULL AND version = ?`, so two managers clicking "Claim" on the same gate at the same time can't both succeed; the loser gets a normal "already claimed, refresh" error rather than silently overwriting. Throws if the gate already has an owner (use reassignment/handover for that case, not claim). Appends `{ event: 'claimed', actor_id: userId, at: now }` to `Task.content.history`. Per `database-patterns` §6 (don't bump `version` on bookkeeping), this *is* a semantic user-visible mutation, so `version` increments normally here — same for the existing reassignment flow (`TaskAssignmentService.reassignTask`) and `resolveGate`.
- `resolveGate(taskUid, outcomeStatusKey, notes)` — guards, in order:
  1. **Show/Task consistency**: re-reads the show and confirms `Show.status` still equals `GATE_CONFIG[gate_kind].pendingStatus` — defends against the gate Task and Show drifting out of sync (e.g. a system-admin direct status edit bypassing the gate flow entirely). Throws `GATE_STATE_STALE` if not.
  2. **Ownership**: requires `Task.assigneeId` to be non-null (throws `GATE_NOT_CLAIMED` otherwise) — this is what reconciles "created unassigned" (`schedule_publish_removal`) with "must have a clear owner": ownership becomes a precondition for resolving, not a requirement at creation.
  3. **Outcome validity**: `outcomeStatusKey ∈ GATE_CONFIG[gate_kind].allowedOutcomes`.
  4. **Active-task policy**: if `outcomeStatusKey ∈ GATE_CONFIG[gate_kind].outcomesRequiringNoActiveTasks`, counts active `TaskTarget`s for the show using the *same* canonical filter `publishing.service.ts` already uses (`taskTarget.deletedAt = null`, `task.deletedAt = null`, `task.status NOT IN ('COMPLETED', 'CLOSED')` — factored into one shared helper so the two callers can't drift). Rejects with `ACTIVE_TASKS_REMAIN` and the count if non-zero.
  5. **LIVE safeguard**: if `outcomeStatusKey === 'CANCELLED'` and `Task.metadata.from_status === 'live'`, rejects with `LIVE_CANCELLATION_REQUIRES_OVERRIDE` — this is a universal rule across gate kinds, not per-`gate_kind` config, because the underlying fact is always true: a show that was actually live did not have "zero production," so resolving it straight to `CANCELLED` needs more than a single click. `RESTORE_PREVIOUS` (back to `live`) and `COMPLETED` (for `show_cancellation`) remain available — they're consistent with a show that genuinely ran.

  Once guards pass: marks the `Task` `COMPLETED` with `completedAt` and appended `resolution_notes`, writes the `Audit` row, and appends `{ event: 'resolved', actor_id, at: now, note: notes }` to `Task.content.history`. For the target status: if `outcomeStatusKey` is the literal sentinel `'RESTORE_PREVIOUS'`, `Show.status` reverts to `Task.metadata.from_status` instead of a fixed mapped status; any concrete status key (`CANCELLED`, `COMPLETED`) maps directly. The sentinel is generic — any future gate kind can offer "undo, go back to whatever it was" without bespoke plumbing.

These live alongside (or as a small addition to) the existing task-orchestration layer — they are generic over `gateKind`, not cancellation-specific. **Authorization**: `openGate`/`claimGate`/`resolveGate` are invoked only from endpoints guarded the same way the existing `cancel-with-resolution`/`resolve-cancellation` routes already are (`@StudioProtected([ADMIN, MANAGER])`) — the new `claimGate` endpoint (`task-review`'s "Claim" action) gets the same guard, not a wider one. `TALENT_MANAGER`/`MODERATION_MANAGER` are not in scope for show-lifecycle gate actions, consistent with how cancellation is gated today.

**Resolve UI reads `allowedOutcomes` from config, not a hardcoded list.** The show-detail "Resolve" dialog's disposition picker must render whatever `GATE_CONFIG[gate_kind].allowedOutcomes` contains for the open gate task it's resolving. `RESTORE_PREVIOUS` renders as a labeled action (e.g. "Resume Show") rather than a generic status option, since it isn't a fixed disposition the manager is choosing among — it's "undo this." This was implicitly hardcoded to `CANCELLED`/`COMPLETED` in PR #229's frontend and needs to become gate-kind-aware.

**The dialog also has to render the two new guard failures, not just submit-and-hope:**

- If the show has active tasks and the manager picks an outcome in `outcomesRequiringNoActiveTasks`, the dialog shows the active task count with a link to the show's task list (`/studios/$studioId/shows/$showId/tasks`) instead of a generic 400 — matching the old MVP doc's "direct path to make active task count reach zero" requirement.
- If `from_status === 'live'` and the gate kind allows `CANCELLED`, that option is disabled in the picker (not just rejected after submit) with an inline explanation, so the manager sees the constraint before trying rather than after.

## Ownership, Handover, and Traceability

Two problems this design didn't originally address: (1) a gate can be created with no owner (`schedule_publish_removal`) or get picked up by a different manager than whoever opened it, and (2) when that happens, the next person touching it has no record of what already happened — today's generic Task reassignment (`PATCH /studios/:studioId/tasks/:id/assign`) is a bare `assigneeId` swap with no reason captured and no Audit row.

**Claim, don't just create-assigned-or-unassigned.** `claimGate` (above) lets any manager who sees an unowned gate in `task-review` take it, rather than requiring the schedule-publish path to guess at an owner it has no basis for picking. `resolveGate`'s new precondition means an unclaimed gate literally cannot be resolved — there's always exactly one accountable owner by the time it's closed, for every gate kind, not just the ones that pick an owner at creation.

**Handover carries a note.** Reassigning a `STATE_GATE` task (existing `PATCH /studios/:studioId/tasks/:id/assign` flow) gains an optional `note` field on the request, used to append `{ event: 'reassigned', actor_id: fromUserId, at: now, note }` (recording both the outgoing and incoming assignee) to `Task.content.history`. This is a small extension to the existing reassignment DTO/flow, not a new endpoint — for non-gate task types the field can simply be ignored/unused.

**Tracing the process.** `Task.content.history` is the full timeline: opened (with the system or manager's reason), claimed, reassigned (with handover notes), resolved (with outcome and resolution note). It's rendered as a read-only chronological list:

- In the show-detail "Resolve" dialog (a "Gate History" section above or below the resolve action), so whoever is about to resolve it can see everything that led here.
- In `task-review`'s row detail/expand for `STATE_GATE` tasks, so a manager scanning the queue can check context without opening the full resolve dialog.

This stays scoped to gate tasks specifically — it is not a general-purpose comment thread on `Task`, and it doesn't support free-standing notes unrelated to an ownership or resolution event. If that broader need (open-ended commentary on any task, not just gates) comes up later, it's a separate feature, not an extension of this history array.

## First Caller: Manual Cancellation (`show_cancellation`)

`StudioShowManagementService.cancelShowWithResolution` and `.resolveShowCancellation` (PR #229) become thin wrappers:

- `cancelShowWithResolution` validates the show's current status is eligible (unchanged guard logic), resolves the chosen owner membership to a `User`, then calls `openGate(show.id, 'show_cancellation', { ownerId, dueDate: dto.followUpDueAt, content: { reason_category: dto.reasonCategory, reason_note: dto.reasonNote, follow_up_notes: dto.followUpNotes } })`.
- `resolveShowCancellation` validates the show is currently `CANCELLED_PENDING_RESOLUTION` (unchanged guard logic), finds the open `STATE_GATE` task for the show, then calls `resolveGate(task.uid, dto.finalDisposition, dto.resolutionNotes)`.

All cancellation-specific UI copy, reason taxonomy, and the show-detail dialogs are unchanged from PR #229's frontend — only the backend persistence and the generic primitives change.

## Second Caller: Schedule-Publish Removal (`schedule_publish_removal`)

Today, `publishing.service.ts`'s remove-flow (the loop over `toRemove` when a schedule republish diff drops a show) decides between `CANCELLED` and `CANCELLED_PENDING_RESOLUTION` purely by checking for an active `TaskTarget`, then flips `showStatusId` directly with no record of why or any owner:

```ts
const targetStatusId = hasActiveTaskTarget
  ? statusIds.cancelledPendingResolution
  : statusIds.cancelled;
// ...
await tx.show.update({ where: { id: removed.id }, data: { showStatusId: targetStatusId } });
```

This becomes:

- If `!hasActiveTaskTarget`: unchanged — flip straight to `CANCELLED`, no gate needed (nothing for anyone to follow up on).
- If `hasActiveTaskTarget`: call `openGate(removed.id, 'schedule_publish_removal', { ownerId: null, content: { reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE', reason_note: \`Removed from republished schedule; ${activeTaskCount} active task(s) still attached\` } })` instead of the direct status flip. `dueDate` is omitted — there's no manager-chosen deadline for this gate kind, it's a "check it when you next look at the queue" item, not an SLA.
- `publishSummary.shows_pending_resolution` (already tracked today) stays as the publish-time counter; it now corresponds 1:1 with gate tasks opened during that publish run, giving the publish-summary UI a natural "N shows need a double-check" signal pointing at the same queue.

Resolution: a manager opens the gate from `task-review` (filtered to `Task Type = State Gate`, unassigned) or from the show detail page, and either (subject to the generic guards in **Generic Service Primitives** above — active-task check on `CANCELLED`, and the LIVE safeguard, which is the likelier real-world case here: a schedule resync that drops a currently-live show is far more likely to be bad sync data than an intentional production stop, so `RESTORE_PREVIOUS` is the path this gate kind expects managers to reach for when `from_status === 'live'`):

- **Confirms the removal** — resolves to `CANCELLED` with a note. The show stays cancelled.
- **Resumes the show** — resolves to `RESTORE_PREVIOUS`. `Show.status` reverts to the `from_status` captured when the gate opened (whatever the show actually was — `draft` or `confirmed` — not a manager-picked value), the `STATE_GATE` task completes, and `Audit` records the restore. This avoids forcing the manager to wait for (or manually trigger) another schedule republish just to undo a removal the planner didn't actually intend — the existing republish-restore behavior (`publishing.service.ts:379-404`) still works as a second, independent path if the show reappears in a later sync, but a manager doesn't have to wait on it.

**Planner notice (passive, no new notification channel).** Resuming a show this way is a manual override of what the source schedule currently says — if the planner doesn't update the source schedule, the *next* republish will see the same removal and reopen the same gate. To make that visible without building notification infra:

1. On `RESTORE_PREVIOUS` resolution, write a non-critical display hint to `Show.metadata`: `{ schedule_resume_notice: { resumed_by, resumed_at, gate_task_uid } }`. Per the existing `Show.metadata` rule (`IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md` §3.5), this is a display-only hint — no workflow logic ever depends on reading it back, only UI rendering.
2. The show-detail page and the schedule-continuity view (where planners review publish diffs) render a banner while this hint is present: *"Manually resumed after a schedule removal — will be removed again on the next republish unless the source schedule is updated."*
3. The hint clears automatically the next time a publish's diff finds this show present (not in `toRemove`) — i.e., once the planner fixes the source schedule and republishes, the notice disappears on its own. No explicit dismiss action needed.

## Discovery / UX

No new screens. `STATE_GATE` tasks surface in the existing task surfaces:

- `/studios/$studioId/task-review/` — any manager/admin in the studio filters `Task Type = State Gate` to see every open gate for the studio (not just their own), with existing assignee/due-date/status filtering. `schedule_publish_removal` gates show up here unassigned (existing "unassigned" filter); unassigned `STATE_GATE` rows get a **Claim** action (calls `claimGate`) distinct from the existing reassign-to-someone-else action, since claiming is "I'll take this" rather than "give it to a specific person."
- `/studios/$studioId/my-tasks` — the assigned owner sees it in their personal queue with existing overdue flagging and due-date sort.
- `/studios/$studioId/shows/$showId/tasks` — still visible from the show detail page like any other task targeting that show.

**Resolve path stays single-entry.** The generic "mark complete" action in `my-tasks`/`task-review` is disabled/hidden for `STATE_GATE` tasks, because completing one always requires picking a valid outcome from `allowedOutcomes` and moving the parent `Show` together — a bare "complete" click can't do that safely. Resolution only happens through the show-detail "Resolve" dialog, which calls `resolveGate` and updates `Show.status` in the same transaction.

## Documentation Requirements (do not skip)

Each gate kind encodes critical, easy-to-get-wrong business logic (who can own it, what outcomes are valid, what it implies for compensation/reporting/credit). That knowledge needs to be discoverable by *any* future feature that touches the gate's domain — not only by someone already inside the show-production-lifecycle skill. Two tiers of documentation, both mandatory:

**Tier 1 — the generic primitive** (where the plumbing lives, updated in place):

1. `.agent/skills/show-production-lifecycle/references/state-gates.md` — update the `any → cancelled_pending_resolution` and `cancelled_pending_resolution → cancelled or completed` rows to reference `Task` (`STATE_GATE` type) instead of `ShowCancellationResolution`, and close the "No task/issue linkage yet" gap note.
2. `.agent/skills/show-production-lifecycle/SKILL.md` §4 (Cancellation and Resolution) — update the prose description of `cancel-with-resolution`/`resolve-cancellation` to describe the `Task`-backed gate instead of the dropped model.
3. Add a short **State Gate pattern** subsection to `show-production-lifecycle/SKILL.md` documenting: what a gate is, the `GATE_CONFIG` lookup, `openGate`/`claimGate`/`resolveGate`, the ownership precondition (`resolveGate` requires a claimed/assigned owner regardless of `requiresOwner`), the `content.history` traceability log and what events append to it, and an explicit instruction that any future "entity needs an owner + deadline + chosen outcome before continuing" requirement should add a `GATE_CONFIG` entry and call the existing primitives rather than building a new table, service, or one-off history mechanism. This subsection also states the Tier 2 rule below, so anyone adding a gate kind knows to also add its skill.

**Tier 2 — one dedicated skill per gate kind**, starting with this one:

4. Create `.agent/skills/show-cancellation-resolution/SKILL.md` — a standalone skill (not a reference file) covering the *business* rules for this specific gate kind: the reason taxonomy and what each category implies operationally, who is eligible as resolution owner, the allowed outcomes (`CANCELLED` vs `COMPLETED`) and what each means downstream (e.g. `completed` counts partial production credit, `cancelled` does not — confirm exact compensation/reporting implications with the team that owns those numbers before finalizing this skill's content), the active-task and LIVE-safeguard preconditions on resolving and why they exist, the audit trail shape, and — most importantly — an explicit **"read this before changing"** list: any feature touching show-status transitions, task completion/orchestration, compensation/credit calculation for cancelled shows, or cancellation reporting must consult and, if behavior changes, update this skill in the same PR.
4a. Create `.agent/skills/schedule-publish-removal-resolution/SKILL.md` — same shape, for the second gate kind: why it's unassigned by default, the two outcomes (`CANCELLED` vs `RESTORE_PREVIOUS`) and what each means, why `from_status === 'live'` makes `RESTORE_PREVIOUS` the expected default rather than `CANCELLED`, the `schedule_resume_notice` planner-notice mechanism and when it clears, and a "read this before changing" list covering `publishing.service.ts`'s remove-flow and the schedule-continuity docs.
5. Add `show-cancellation-resolution` and `schedule-publish-removal-resolution` to the Skill Routing map in `AGENTS.md` (Feature-specific category) so they surface via the existing "Skill-First Development" rule, not just by accident.
6. Treat this as the template for future gate kinds: when a new `GATE_CONFIG` entry is added (e.g. `creator_no_show`), it gets its own dedicated skill following this same shape, not a shared catch-all. The State Gate pattern subsection (item 3) should say this explicitly so it isn't lost.
7. Run `.agent/workflows/knowledge-sync.md` as part of the implementation PR (per `AGENTS.md`'s Knowledge and Doc Lifecycle rule) so all of the above lands in the same PR as the code, not a follow-up. Per `AGENTS.md`'s `pr-review.md` gate, any *future* PR whose diff touches show-status transitions, task orchestration for `STATE_GATE` tasks, or cancelled-show compensation/reporting should be checked against whether it required reading/updating the relevant gate skill — this is a reviewable, not just a suggested, step.

## Testing

- Unit: `openGate`/`resolveGate`/`claimGate` — invalid `gateKind`, outcome not in `allowedOutcomes`, show not in expected starting status, `ownerId: null` accepted for kinds with `requiresOwner: false`, `resolveGate` rejects an unclaimed (`assigneeId: null`) task with `GATE_NOT_CLAIMED`, `claimGate` rejects claiming an already-assigned task, every primitive appends the expected `history` entry shape.
- Unit: `resolveGate` rejects with `GATE_STATE_STALE` if `Show.status` no longer equals the gate's `pendingStatus` (simulating a direct status edit outside the gate flow); `claimGate` concurrent-claim race — two simultaneous claims against the same `version`, only one succeeds, the other gets a clear conflict error, not a silent overwrite.
- Unit: active-task guard — `resolveGate` rejects `CANCELLED` with `ACTIVE_TASKS_REMAIN` and the correct count when active `TaskTarget`s exist for the show; succeeds once they're closed; the count uses the exact same filter as `publishing.service.ts`'s `hasActiveTaskTarget` check (shared helper, not reimplemented).
- Unit: LIVE safeguard — `resolveGate` rejects `CANCELLED` with `LIVE_CANCELLATION_REQUIRES_OVERRIDE` when `metadata.from_status === 'live'`, for both gate kinds; `RESTORE_PREVIOUS` and `COMPLETED` remain unaffected by this check.
- Unit: reassignment with a `note` appends a `reassigned` history entry with both outgoing/incoming assignee; reassignment without a note still works (note stays optional) and the history entry omits it.
- Integration (existing `studio-show-management.service.spec.ts` cases from PR #229, adapted): cancel → pending resolution → resolve to `CANCELLED`; cancel → pending resolution → resolve to `COMPLETED`; resolve attempted on a show not currently pending; cancel attempted on an ineligible status (`DRAFT`, already `CANCELLED`, etc.).
- Integration (`publishing.service.ts` remove-flow, new): show with no active tasks removed from republish → straight to `CANCELLED`, no gate task created; show with active tasks removed → `CANCELLED_PENDING_RESOLUTION` + unassigned `STATE_GATE` task created with `gate_kind: schedule_publish_removal` and `metadata.from_status` set to the show's actual prior status; resolving to `CANCELLED` completes the task and finalizes the show status; resolving to `RESTORE_PREVIOUS` reverts `Show.status` to the captured `from_status` (covering both `draft` and `confirmed` as prior states) and sets the `schedule_resume_notice` metadata hint; a subsequent publish where the show is present (not removed) clears that hint; republish-restore (show reappears in a later sync without going through manual resolve) still un-cancels and resumes tasks unchanged.
- Frontend: `task-review` shows both gate kinds under `Task Type = State Gate`, `schedule_publish_removal` tasks appear unassigned/claimable with a **Claim** action; generic complete action is absent/disabled for `STATE_GATE` tasks; the Resolve action/dialog is disabled with an explanatory message until the gate is claimed; show-detail Resolve dialog renders outcome choices from `allowedOutcomes` (two-option picker for `show_cancellation`; `Confirm Cancellation`/`Resume Show` for `schedule_publish_removal`) and a read-only **Gate History** section rendering `content.history` in order; resumed shows render the planner-notice banner on show detail and schedule-continuity views until the notice clears; reassigning a `STATE_GATE` task offers an optional handover note that shows up in the next viewer's Gate History.

## Migration Note

PR #229 (which added `ShowCancellationResolution` and the manual cancel-with-resolution/resolve-cancellation endpoints) was never merged to `master` — `master` today has no manual show-cancellation-resolution feature at all, only the schedule-publish auto-cancel logic in `publishing.service.ts`. This design is therefore implemented as a **fresh build directly on `Task`/`STATE_GATE`** for both gate kinds, not a migration away from an existing table. The only schema change is the single `TaskType.STATE_GATE` enum addition — there is no `ShowCancellationResolution` data to backfill, and no existing manual-cancellation controller/service/frontend code to modify (it has to be created new, following the shape PR #229 prototyped but backed by `Task` from the start).
