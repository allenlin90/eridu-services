# Show State Gate v2 — Role-Tiered Cancellation Design

Status: Discussion / PoC. Supersedes the assignment-based flow shipped on the `codex/show-state-gate` branch (PR #230), which is closed without merging — kept as historical reference, the same treatment given to PR #229 (`ShowCancellationResolution`, also closed without merging). Implementation happens on a fresh branch off `master`.

## Why PR #230's design didn't hold up

PR #230 built the `STATE_GATE` primitive around a single-owner assignment model: cancelling a show always required picking a "resolution owner," who would later resolve it from the show-detail Resolve dialog. Manual QA against real data surfaced two problems serious enough to redo the design rather than patch it:

1. **The assignment is theater.** There's no notification system, so an assigned owner has no signal that they own anything — they'd have to remember to check the show or stumble onto it in task-review. `resolveGate` never actually enforced "only the assignee can resolve" either (any Manager/Admin could resolve regardless of who was assigned), so the assignment carried no authorization weight — it was bookkeeping nobody could act on and nobody was forced to honor.
2. **The gate is bypassable.** The generic `PATCH /studios/:studioId/shows/:id` endpoint accepts `show_status_id` directly and applies it with zero awareness that a `STATE_GATE` task is open. Confirmed against real data: a show was driven through `cancel-with-resolution` into `CANCELLED_PENDING_RESOLUTION` (audited), then its status was edited straight back to `CONFIRMED` via the regular show-edit form — no audit entry, no gate-task closure, the `STATE_GATE` task left permanently `PENDING`. The safeguard the whole feature exists to provide can be silently skipped by the same form used for routine show edits.

Both problems trace back to the same root cause: the design borrowed a generic "assign a task" pattern for something that isn't actually delegated work — it's an authorization-and-audit checkpoint on a status transition. v2 treats it as that directly, which also means dropping the `Task` entity for this feature entirely (see "No Task at all" below) — once there's no owner and no delegated work, a `STATE_GATE` `Task` row has no remaining purpose: `Audit` already records every transition, and the gate's "is one open" state is just `Show.status`.

## Two actor tiers, not an assignee

No `Task.assigneeId`, no claim, no ownership handover. Instead, two authorization tiers checked at the service layer when cancellation is requested:

1. **Manager tier** — `STUDIO_ROLE.ADMIN` or `STUDIO_ROLE.MANAGER` (today's existing static check, `STUDIO_SHOW_WRITE_ACCESS_ROLES`).
2. **Duty Manager tier** — fallback, checked only if tier 1 doesn't apply. Reuses the *existing* shift-scheduling concept: whoever `StudioShiftRepository.findActiveDutyManager(studioUid, now)` returns for that studio at the moment of the request. The match is by `StudioShift.userId` (the shift's direct user relation, confirmed in `prisma/schema.prisma` — no membership indirection) against the requesting actor's resolved `User.id`: if they're equal, the tier-2 check passes. This is not a new `STUDIO_ROLE` — `isDutyManager` is a per-shift flag any member can carry while on shift, independent of their static role. No schema change.

If a person holds both (a Manager who happens to be on shift as duty manager today), tier 1 wins — full authority takes precedence over the time-windowed grant.

The `cancel-with-resolution` endpoint's `@StudioProtected` widens to admit any studio member; the service performs the actual tier check, mirroring how `cancelShowWithResolution` already does bespoke validation today rather than relying solely on the declarative guard.

## No Task at all

`Show.status` *is* the gate state — `CANCELLED_PENDING_RESOLUTION` means open, anything else means resolved. Nothing else needs to model "is a gate open."

- **`Show.metadata.pending_resolution`** holds the live, mutable snapshot needed while a gate is open: `{ gate_kind, from_status, reason_category, reason_note, opened_by, opened_at }`. It exists only while `status === CANCELLED_PENDING_RESOLUTION` and is cleared (set to `null`) on resolve.
- **`Audit`** is the trail — already wired, already used by `openGate`/`resolveGate` today (confirmed against real data: the existing audit row already carries `reason`, `action`, and a `metadata` blob with `field`/`old_value`/`new_value`/`gate_kind`). Every transition (open, note update, resolve) writes one `Audit` row via the existing `AuditService.create`, targeted at `{ targetType: 'SHOW', targetId: show.id }`. The "Gate History" UI reads `AuditService.findForTargets([{ targetType: 'SHOW', targetId: show.id }])` (this method already exists, confirmed in `audit.service.ts`) filtered to gate-related actions, ordered by `created_at` — no JSONB history array, no race risk on it.
- **Amending the pending note.** While `status === CANCELLED_PENDING_RESOLUTION`, any current Duty Manager (tier-2 check, same as opening) can update `reason_note` via a small dedicated action — overwrites `Show.metadata.pending_resolution.reason_note` and writes its own `Audit` row (`action: 'OVERRIDE'`, distinguishable from the opening row by metadata), so the live note can be corrected/expanded without losing the original wording from Audit history.
- No `TaskType.STATE_GATE` enum value, no migration at all — `CANCELLED_PENDING_RESOLUTION` is already a seeded `ShowStatus` row on `master` today (the pre-existing `publishing.service.ts` auto-cancel logic already uses it), so this entire redesign needs zero schema changes.

This also kills the original justification for modeling gates as `Task` in the first place ("Task already has TaskTarget for linking to a Show, assignee, due date...") — that justification was about delegated, closeable work, which never applied once there's no owner.

## Manager and Duty Manager paths

Same cancellation dialog for both tiers; what's collected and what happens on submit differs by which tier authorized the request:

- **Manager tier — atomic resolution.** Dialog collects reason (category + note) *and* final outcome (`CANCELLED` / `COMPLETED`) together. One service call: validate guards (active-task count, LIVE safeguard), set `Show.status` directly to the outcome, write one `Audit` row. The show is never observably `CANCELLED_PENDING_RESOLUTION` — no `pending_resolution` metadata is ever written.
- **Duty Manager tier — flag and defer.** Dialog collects reason only. `Show.status → CANCELLED_PENDING_RESOLUTION`, `Show.metadata.pending_resolution` is set, one `Audit` row. Any Manager/Admin signs off later — see below.
- **Sign-off** is a second, plain call: validate the same guards (active-task count, LIVE safeguard) against the *original* `from_status` captured in `pending_resolution`, set `Show.status` to the chosen outcome, clear `Show.metadata.pending_resolution`, write a second `Audit` row. There is no separate "sign-off" endpoint, status, or concept beyond "resolve a pending-resolution show" — it is the same operation whether the original flag came from a Duty Manager or from `schedule_publish_removal`.
- If a Duty Manager doesn't act in time, nothing forces them to — a Manager can always cancel the show directly through the Manager-tier path regardless of shift state. No timeout, no escalation logic; the fallback is just "a Manager has standing authority to act on any eligible show at any time."

`schedule_publish_removal` (system-generated, no human present) writes the same `Show.metadata.pending_resolution` shape (with `reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE'`) and an `Audit` row directly from `publishing.service.ts`'s remove-flow — no Task, same as the manual path.

## How a Manager finds a pending-resolution show

No Task Review involvement at all. The Shows list already supports filtering by `show_status_name` (confirmed in `get-studio-shows.ts`) — a Manager filters to `Cancelled Pending Resolution` to see every show awaiting sign-off across the studio. The show's own detail page shows the live `pending_resolution` snapshot (reason, category, who flagged it, when) for anyone who already knows which show.

Either surface leads to the same Resolve action. Worth a follow-up check once this ships: confirm the existing status-badge styling on the Shows list makes a `Cancelled Pending Resolution` row visually distinct enough without a notification pointing anyone at it — flagging this, not deciding it now.

## Notification seam (placeholder only)

No notification system exists yet (confirmed: no `EventEmitter2`/domain-event pattern anywhere in `erify_api`), so v2 does not build one. It adds a single seam so future work has a clear, narrow point to plug into instead of threading new logic through `ShowStateGateService` itself:

```ts
@Injectable()
export class GateNotificationService {
  notifyGateOpened(show: Show, gateKind: GateKind, reason: { category: string; note: string }): void {
    // no-op today — structured log only
  }
  notifyGateResolved(show: Show, gateKind: GateKind, outcome: string): void {
    // no-op today — structured log only
  }
}
```

Called at the same two points as before (open, resolve) — just without a `Task` argument, since there isn't one. For the Manager atomic path, both fire in sequence within the same request. Wiring this to a real channel is future work, tracked as a non-goal below.

## The bypass fix

`StudioShowManagementService.updateShow` rejects any request whose body changes `show_status_id` while `existingShow.showStatus.systemKey === 'CANCELLED_PENDING_RESOLUTION'` — a single field comparison now, no join, no Task lookup. The only paths that may move a pending-resolution show are the Manager-tier resolve call and the sign-off call. This closes the exact gap found in manual QA.

## Data model changes from PR #230

- No `TaskType.STATE_GATE`, no `Task`/`TaskTarget` usage for either gate kind, no migration. `ShowStateGateService.openGate`/`resolveGate`/`claimGate` and `TaskOrchestrationService.claimTask` are all deleted (the latter confirmed to be a pure passthrough added by PR #230 for this feature, not pre-existing generic task functionality), along with the `PATCH /studios/:studioId/tasks/:id/claim` endpoint and the frontend `use-claim-task.ts` hook + "Claim" action.
- `findOpenStateGateForShow` is deleted — replaced by checking `show.showStatus.systemKey === 'CANCELLED_PENDING_RESOLUTION'` directly.
- `CancelStudioShowDto` drops `resolution_owner_membership_id` and `follow_up_due_at` (both owner-scoped); gains a conditionally-required `outcome` field (required only at Manager tier) and a separate small DTO for the Duty-Manager note-amendment action.
- The generic task reassignment-with-note capability (`PATCH .../tasks/:id/assign`, extended by PR #230 with an optional handover `note`) is unrelated to this redesign now that gates aren't tasks — left as-is, out of scope to revert.

## Non-goals (this iteration)

- Building an actual notification system or wiring `GateNotificationService` to a real channel (email, in-app, Slack) — no channel exists yet; this is explicitly future work once one does.
- A dedicated `STUDIO_ROLE.DUTY_MANAGER` permission tier — duty-manager authority is purely the existing time-windowed shift flag, not a new static role.
- Multi-person notification/escalation lists, letting a Manager opt into the deferred path instead of atomic resolution, or any timeout/escalation logic for an unresolved pending show — confirmed out of scope.
- Cross-studio dashboards, second-level `gate_kind` filtering, and the other PR #230 non-goals — unchanged, still out of scope.

## Testing

- Unit: tier resolution — Manager/Admin takes the atomic path even while also flagged duty manager; a plain member flagged duty manager right now takes the deferred path; a plain member with no duty-manager flag is rejected (403); a duty-manager flag outside the active shift window is rejected.
- Unit: Manager-tier cancel resolves atomically — `Show.status` lands directly on the chosen outcome, exactly one `Audit` row is written, `Show.metadata.pending_resolution` is never set.
- Unit: Duty-Manager-tier cancel only opens — no `outcome` accepted/required, `Show.status → CANCELLED_PENDING_RESOLUTION`, `pending_resolution` snapshot set, one `Audit` row.
- Unit: note-amendment — only a current Duty Manager can amend `pending_resolution.reason_note` while pending; rejected once resolved; writes its own `Audit` row without altering the original opening row.
- Unit: sign-off re-validates active-task count and LIVE safeguard against the captured `from_status`; clears `pending_resolution`; writes a second `Audit` row.
- Unit: `updateShow` rejects a `show_status_id` change whenever `showStatus.systemKey === 'CANCELLED_PENDING_RESOLUTION'`, for both gate kinds; succeeds once resolved.
- Unit: `GateNotificationService.notifyGateOpened`/`notifyGateResolved` are called with the expected arguments at both transition points (verifying the seam is wired, not its no-op behavior).
- Integration: schedule-publish removal writes the same `pending_resolution` shape and an `Audit` row; a Manager resolves it through the same sign-off path as a manual flag.
- Frontend: cancellation dialog renders the outcome picker only when the resolved tier is Manager; Duty-Manager-tier submission shows a "flagged, pending sign-off" confirmation instead of a final-state toast; Shows-list filtering by `Cancelled Pending Resolution` surfaces both gate kinds; Gate History renders from `Audit`, not `Task.content.history`.
