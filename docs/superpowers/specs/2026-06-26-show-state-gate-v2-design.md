# Show State Gate v2 — Role-Tiered Cancellation Design

Status: Discussion / PoC. Supersedes the assignment-based flow shipped on the `codex/show-state-gate` branch (PR #230), which is closed without merging — kept as historical reference, the same treatment given to PR #229 (`ShowCancellationResolution`, also closed without merging). Implementation happens on a fresh branch off `master`.

## Why PR #230's design didn't hold up

PR #230 built the `STATE_GATE` primitive around a single-owner assignment model: cancelling a show always required picking a "resolution owner," who would later resolve it from the show-detail Resolve dialog. Manual QA against real data surfaced two problems serious enough to redo the design rather than patch it:

1. **The assignment is theater.** There's no notification system, so an assigned owner has no signal that they own anything — they'd have to remember to check the show or stumble onto it in task-review. `resolveGate` never actually enforced "only the assignee can resolve" either (any Manager/Admin could resolve regardless of who was assigned), so the assignment carried no authorization weight — it was bookkeeping nobody could act on and nobody was forced to honor.
2. **The gate is bypassable.** The generic `PATCH /studios/:studioId/shows/:id` endpoint accepts `show_status_id` directly and applies it with zero awareness that a `STATE_GATE` task is open. Confirmed against real data: a show was driven through `cancel-with-resolution` into `CANCELLED_PENDING_RESOLUTION` (audited), then its status was edited straight back to `CONFIRMED` via the regular show-edit form — no audit entry, no gate-task closure, the `STATE_GATE` task left permanently `PENDING`. The safeguard the whole feature exists to provide can be silently skipped by the same form used for routine show edits.

Both problems trace back to the same root cause: the design borrowed a generic "assign a task" pattern for something that isn't actually delegated work — it's an authorization-and-audit checkpoint on a status transition. v2 treats it as that directly.

## Two actor tiers, not an assignee

No `Task.assigneeId`, no claim, no ownership handover. Instead, two authorization tiers checked at the service layer when cancellation is requested:

1. **Manager tier** — `STUDIO_ROLE.ADMIN` or `STUDIO_ROLE.MANAGER` (today's existing static check, `STUDIO_SHOW_WRITE_ACCESS_ROLES`).
2. **Duty Manager tier** — fallback, checked only if tier 1 doesn't apply. Reuses the *existing* shift-scheduling concept: whoever `StudioShiftRepository.findActiveDutyManager(studioUid, now)` returns for that studio at the moment of the request. The match is by `StudioShift.userId` (the shift's direct user relation, confirmed in `prisma/schema.prisma` — no membership indirection) against the requesting actor's resolved `User.id`: if they're equal, the tier-2 check passes. This is not a new `STUDIO_ROLE` — `isDutyManager` is a per-shift flag any member can carry while on shift, independent of their static role. No schema change.

If a person holds both (a Manager who happens to be on shift as duty manager today), tier 1 wins — full authority takes precedence over the time-windowed grant.

The `cancel-with-resolution` endpoint's `@StudioProtected` widens to admit any studio member; the service performs the actual tier check, mirroring how `cancelShowWithResolution` already does bespoke validation today rather than relying solely on the declarative guard.

## Two paths from one dialog

The cancellation dialog is the same component for both tiers; the fields and what happens on submit differ by which tier authorized the request:

- **Manager tier — atomic resolution.** Dialog collects reason (category + note) *and* final outcome (`CANCELLED` / `COMPLETED`) in one submission. `openGate` and `resolveGate` run back-to-back inside one transaction. The show's `status` transitions directly to the chosen outcome — it is never observably `CANCELLED_PENDING_RESOLUTION`. A `Task` row is still created and immediately marked `COMPLETED`, preserving the audit/history trail (`opened` then `resolved` entries) without ever leaving anything open.
- **Duty Manager tier — flag and defer.** Dialog collects reason only — no outcome picker, because this tier doesn't decide the disposition. `openGate` runs alone; `Show.status → CANCELLED_PENDING_RESOLUTION`. Any Manager/Admin can resolve it later from the same Resolve dialog PR #230 already built (active-task guard and LIVE safeguard both carry over unchanged — those are real safety checks, independent of ownership). First Manager/Admin to act resolves it; there is no claim step and no "this one's mine" state.

`schedule_publish_removal` (the other gate kind, opened by the schedule-publish pipeline with no human present) gets the same simplification: it was already ownerless at creation under PR #230; v2 just removes the claim step that PR #230 required before resolving it. Any Manager/Admin resolves it directly.

## Notification seam (placeholder only)

No notification system exists yet (confirmed: no `EventEmitter2`/domain-event pattern anywhere in `erify_api`), so v2 does not build one. It adds a single seam so future work has a clear, narrow point to plug into instead of having to thread new logic through `ShowStateGateService` itself:

```ts
@Injectable()
export class GateNotificationService {
  notifyGateOpened(task: Task, show: Show, gateKind: GateKind): void {
    // no-op today — structured log only
  }
  notifyGateResolved(task: Task, show: Show, gateKind: GateKind, outcome: string): void {
    // no-op today — structured log only
  }
}
```

`openGate` calls `notifyGateOpened` after creating the gate task; `resolveGate` calls `notifyGateResolved` after completing it. For the Manager atomic path, both fire in sequence within the same request — downstream notification logic (when it exists) doesn't need to special-case "this one skipped the pending interval." This is intentionally the entire scope of the notification work in this iteration; wiring it to an actual stakeholder/client/creator notification channel is future work, tracked as a non-goal below.

## The bypass fix

`StudioShowManagementService.updateShow` rejects any request whose body changes `show_status_id` while the show currently has an open (`status: 'PENDING'`) `STATE_GATE` task targeting it — regardless of gate kind, regardless of what status is requested. The only paths that may transition a gated show's status are `cancelShowWithResolution` (open, or open+resolve for Manager tier) and `resolveShowCancellation`. This closes the exact gap found in manual QA.

## Data model changes from PR #230

- Drop `claimGate` from `ShowStateGateService`, `claimTask` from `TaskOrchestrationService` (confirmed it's a pure passthrough added by PR #230 for this feature, not pre-existing generic task functionality), the `PATCH /studios/:studioId/tasks/:id/claim` controller endpoint, and the frontend `use-claim-task.ts` hook + "Claim" action in task-review.
- `Task.content.history` event union shrinks from `opened | claimed | reassigned | resolved` to `opened | resolved`.
- `resolveGate` drops the `GATE_NOT_CLAIMED` precondition (nothing to claim against). Active-task guard and LIVE safeguard are unchanged.
- `CancelStudioShowDto` drops `resolution_owner_membership_id` and `follow_up_due_at` (both were owner-scoped); gains a conditionally-required `outcome` field, required only when the caller resolves at the Manager tier.
- The generic task reassignment-with-note capability (`PATCH .../tasks/:id/assign`, extended by PR #230 with an optional handover `note`) is left as-is. It's general task functionality now, independent of gate ownership; reverting it would be unrelated scope creep for this redesign.

## Non-goals (this iteration)

- Building an actual notification system or wiring `GateNotificationService` to a real channel (email, in-app, Slack) — no channel exists yet; this is explicitly future work once one does.
- A dedicated `STUDIO_ROLE.DUTY_MANAGER` permission tier — duty-manager authority is purely the existing time-windowed shift flag, not a new static role.
- Multi-person notification/escalation lists, or letting a Manager opt into the deferred (pending) path instead of atomic resolution — confirmed out of scope; Manager tier is always atomic.
- Cross-studio dashboards, second-level `gate_kind` filtering, and the other PR #230 non-goals — unchanged, still out of scope.

## Testing

- Unit: tier resolution — Manager/Admin role takes the atomic path even while also flagged duty manager; a plain member flagged duty manager right now takes the deferred path; a plain member with no duty-manager flag is rejected (403); a duty-manager flag outside the active shift window is rejected.
- Unit: Manager-tier `cancelShowWithResolution` resolves atomically — show status lands directly on the chosen outcome, `STATE_GATE` task is created already `COMPLETED`, history has both `opened` and `resolved` entries, no intermediate observable `CANCELLED_PENDING_RESOLUTION` state from a second query in between (same transaction).
- Unit: Duty-Manager-tier `cancelShowWithResolution` only opens the gate — no `outcome` field accepted/required, show lands on `CANCELLED_PENDING_RESOLUTION`, task stays `PENDING`.
- Unit: `resolveGate` no longer checks ownership — succeeds against a `PENDING` gate task regardless of `assigneeId` (which is always null now).
- Unit: `updateShow` rejects a `show_status_id` change when an open `STATE_GATE` task exists for the show, for both gate kinds, regardless of the requested target status; succeeds once the gate task is `COMPLETED`.
- Unit: `GateNotificationService.notifyGateOpened`/`notifyGateResolved` are called from `openGate`/`resolveGate` with the expected arguments (verifying the seam is wired, not its no-op behavior).
- Integration: schedule-publish removal still opens an ownerless gate; any Manager/Admin resolves it directly without a claim step.
- Frontend: cancellation dialog renders the outcome picker only when the resolved tier is Manager; Duty-Manager-tier submission shows a "pending manager sign-off" confirmation instead of a final-state toast; the Resolve dialog and Gate History rendering carry over from PR #230 unchanged except for dropping owner/claim references.
