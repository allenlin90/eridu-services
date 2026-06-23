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
- Active notifications (email/in-app) on gate creation or overdue (deferred — no notification channel exists for tasks today; revisit if/when one does).
- A `TaskTemplate`/snapshot for gate content (deferred — gate content shapes are code-defined per `gate_kind`, not manager-authored forms).
- A second-level UI filter on `gate_kind` (deferred — two gate kinds today at low combined volume (~20 manual cancellations/studio/month, schedule-publish removals expected lower); both are distinguishable by description text and `schedule_publish_removal`'s unassigned state without a dedicated filter. Revisit if a third kind ships or the task-review list gets noisy).
- Enforcing the broader readiness/completion gate matrix in `state-gates.md` (explicitly out of scope per the existing Phase 5 gap note — this design only closes the cancellation-resolution row of that table).

## Data Model

No new Prisma model. Reuses `Task` + `TaskTarget`.

- Add one new `TaskType` enum value: `STATE_GATE`. This is the *only* schema change. It is reused by every future gate kind — adding a new kind never requires a migration.
- `Task.metadata` carries the gate envelope:
  ```json
  { "gate_kind": "show_cancellation", "from_status": "live", "pending_status": "cancelled_pending_resolution" }
  ```
  `gate_kind` is a free string, not an enum.
- `Task.content` carries gate-kind-specific data. For `show_cancellation`: `reason_category`, `reason_note`, `follow_up_notes`, and (once resolved) `resolution_notes`.
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
    reasonOptions: ['CREATOR_UNAVAILABLE', 'ROOM_UNAVAILABLE', 'EQUIPMENT_FAILURE',
                     'UTILITY_OUTAGE', 'PLATFORM_ISSUE', 'CLIENT_REQUEST', 'OTHER'],
    requiresOwner: true,
  },
  schedule_publish_removal: {
    pendingStatus: 'CANCELLED_PENDING_RESOLUTION',
    allowedOutcomes: ['CANCELLED'], // show never ran; no COMPLETED outcome makes sense
    reasonOptions: ['REMOVED_FROM_REPUBLISHED_SCHEDULE'], // system-generated, not manager-chosen
    requiresOwner: false, // created unassigned; any studio manager can claim/resolve it
  },
  // future gate kinds added here, not as new tables/enum values
} as const;
```

Adding a new gate kind (e.g. `creator_no_show`, `platform_escalation`) means adding an entry here plus the calling code for that transition — no new model, repository, or migration.

## Generic Service Primitives

Two methods, kind-agnostic, intended to be reused by every future gate:

- `openGate(showId, gateKind, { ownerId, dueDate, content })` — looks up `GATE_CONFIG[gateKind]`, creates the `STATE_GATE` Task + `TaskTarget` (`assigneeId: ownerId ?? null` — `ownerId` is optional precisely because `schedule_publish_removal` has no human present at creation time), moves `Show.status` to `gateConfig.pendingStatus`, writes the existing `Audit` row shape (`field: 'show_status'`, old/new value, `gate_task_uid` in metadata — unchanged from PR #229's audit calls).
- `resolveGate(taskUid, outcomeStatusKey, notes)` — validates `outcomeStatusKey ∈ GATE_CONFIG[gate_kind].allowedOutcomes`, marks the `Task` `COMPLETED` with `completedAt` and appended `resolution_notes`, moves `Show.status` to the outcome, writes the `Audit` row.

These live alongside (or as a small addition to) the existing task-orchestration layer — they are generic over `gateKind`, not cancellation-specific.

**Resolve UI reads `allowedOutcomes` from config, not a hardcoded list.** The show-detail "Resolve" dialog's disposition picker must render whatever `GATE_CONFIG[gate_kind].allowedOutcomes` contains for the open gate task it's resolving — a single-option list (`schedule_publish_removal` → `CANCELLED` only) should render as a confirmation, not a dropdown with one choice. This was implicitly hardcoded to `CANCELLED`/`COMPLETED` in PR #229's frontend and needs to become gate-kind-aware.

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

Resolution: a manager opens the gate from `task-review` (filtered to `Task Type = State Gate`, unassigned) or from the show detail page, confirms the schedule diff was correct, and resolves to `CANCELLED` (the only allowed outcome) with a note. If the removal was actually a mistake, the existing republish-restore behavior (`publishing.service.ts:379-404` — a show reappearing in a later republish automatically un-cancels it and resumes soft-deleted tasks) is the correction path; this design does not add a separate manual "undo" action for that case.

## Discovery / UX

No new screens. `STATE_GATE` tasks surface in the existing task surfaces:

- `/studios/$studioId/task-review/` — any manager/admin in the studio filters `Task Type = State Gate` to see every open gate for the studio (not just their own), with existing assignee/due-date/status filtering. `schedule_publish_removal` gates show up here unassigned (existing "unassigned" filter), so any manager can claim and resolve them.
- `/studios/$studioId/my-tasks` — the assigned owner sees it in their personal queue with existing overdue flagging and due-date sort.
- `/studios/$studioId/shows/$showId/tasks` — still visible from the show detail page like any other task targeting that show.

**Resolve path stays single-entry.** The generic "mark complete" action in `my-tasks`/`task-review` is disabled/hidden for `STATE_GATE` tasks, because completing one always requires picking a valid outcome from `allowedOutcomes` and moving the parent `Show` together — a bare "complete" click can't do that safely. Resolution only happens through the show-detail "Resolve" dialog, which calls `resolveGate` and updates `Show.status` in the same transaction.

## Documentation Requirements (do not skip)

Each gate kind encodes critical, easy-to-get-wrong business logic (who can own it, what outcomes are valid, what it implies for compensation/reporting/credit). That knowledge needs to be discoverable by *any* future feature that touches the gate's domain — not only by someone already inside the show-production-lifecycle skill. Two tiers of documentation, both mandatory:

**Tier 1 — the generic primitive** (where the plumbing lives, updated in place):

1. `.agent/skills/show-production-lifecycle/references/state-gates.md` — update the `any → cancelled_pending_resolution` and `cancelled_pending_resolution → cancelled or completed` rows to reference `Task` (`STATE_GATE` type) instead of `ShowCancellationResolution`, and close the "No task/issue linkage yet" gap note.
2. `.agent/skills/show-production-lifecycle/SKILL.md` §4 (Cancellation and Resolution) — update the prose description of `cancel-with-resolution`/`resolve-cancellation` to describe the `Task`-backed gate instead of the dropped model.
3. Add a short **State Gate pattern** subsection to `show-production-lifecycle/SKILL.md` documenting: what a gate is, the `GATE_CONFIG` lookup, `openGate`/`resolveGate`, and an explicit instruction that any future "entity needs an owner + deadline + chosen outcome before continuing" requirement should add a `GATE_CONFIG` entry and call the existing primitives rather than building a new table or service. This subsection also states the Tier 2 rule below, so anyone adding a gate kind knows to also add its skill.

**Tier 2 — one dedicated skill per gate kind**, starting with this one:

4. Create `.agent/skills/show-cancellation-resolution/SKILL.md` — a standalone skill (not a reference file) covering the *business* rules for this specific gate kind: the reason taxonomy and what each category implies operationally, who is eligible as resolution owner, the allowed outcomes (`CANCELLED` vs `COMPLETED`) and what each means downstream (e.g. `completed` counts partial production credit, `cancelled` does not — confirm exact compensation/reporting implications with the team that owns those numbers before finalizing this skill's content), the audit trail shape, and — most importantly — an explicit **"read this before changing"** list: any feature touching show-status transitions, task completion/orchestration, compensation/credit calculation for cancelled shows, or cancellation reporting must consult and, if behavior changes, update this skill in the same PR.
4a. Create `.agent/skills/schedule-publish-removal-resolution/SKILL.md` — same shape, for the second gate kind: why it's unassigned by default, why `CANCELLED` is the only outcome, why there's no manual restore action (republish-restore is the correction path), and a "read this before changing" list covering `publishing.service.ts`'s remove-flow and the schedule-continuity docs.
5. Add `show-cancellation-resolution` and `schedule-publish-removal-resolution` to the Skill Routing map in `AGENTS.md` (Feature-specific category) so they surface via the existing "Skill-First Development" rule, not just by accident.
6. Treat this as the template for future gate kinds: when a new `GATE_CONFIG` entry is added (e.g. `creator_no_show`), it gets its own dedicated skill following this same shape, not a shared catch-all. The State Gate pattern subsection (item 3) should say this explicitly so it isn't lost.
7. Run `.agent/workflows/knowledge-sync.md` as part of the implementation PR (per `AGENTS.md`'s Knowledge and Doc Lifecycle rule) so all of the above lands in the same PR as the code, not a follow-up. Per `AGENTS.md`'s `pr-review.md` gate, any *future* PR whose diff touches show-status transitions, task orchestration for `STATE_GATE` tasks, or cancelled-show compensation/reporting should be checked against whether it required reading/updating the relevant gate skill — this is a reviewable, not just a suggested, step.

## Testing

- Unit: `openGate`/`resolveGate` — invalid `gateKind`, outcome not in `allowedOutcomes`, show not in expected starting status, `ownerId: null` accepted for kinds with `requiresOwner: false`.
- Integration (existing `studio-show-management.service.spec.ts` cases from PR #229, adapted): cancel → pending resolution → resolve to `CANCELLED`; cancel → pending resolution → resolve to `COMPLETED`; resolve attempted on a show not currently pending; cancel attempted on an ineligible status (`DRAFT`, already `CANCELLED`, etc.).
- Integration (`publishing.service.ts` remove-flow, new): show with no active tasks removed from republish → straight to `CANCELLED`, no gate task created; show with active tasks removed → `CANCELLED_PENDING_RESOLUTION` + unassigned `STATE_GATE` task created with `gate_kind: schedule_publish_removal`; resolving that gate to `CANCELLED` completes the task and finalizes the show status; republish-restore (show reappears in a later sync) still un-cancels and resumes tasks unchanged.
- Frontend: `task-review` shows both gate kinds under `Task Type = State Gate`, `schedule_publish_removal` tasks appear unassigned/claimable; generic complete action is absent/disabled for `STATE_GATE` tasks; show-detail Resolve dialog renders outcome choices from `allowedOutcomes` (single-option confirmation for `schedule_publish_removal`, two-option picker for `show_cancellation`) and drives both Task completion and Show status in one round trip.

## Migration Note

PR #229's migration (`20260623120000_show_cancellation_resolution`) and the `ShowCancellationResolution`/`ShowCancellationResolutionOwner` relations it added to `User`/`StudioMembership`/`Show` are reverted as part of implementing this design, replaced by the single `TaskType.STATE_GATE` enum addition.
