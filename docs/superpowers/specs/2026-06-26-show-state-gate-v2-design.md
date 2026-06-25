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

`Show.status` *is* the gate state — `CANCELLED_PENDING_RESOLUTION` means open, anything else means resolved. Nothing else needs to model "is a gate open," and — important correction from an earlier draft of this design — nothing about the *content* of the open gate lives on `Show` either.

- **`Audit` is the only source of truth, including for the live snapshot.** Every transition (open, note update, resolve) writes one `Audit` row via the existing `AuditService.create`, targeted at `{ targetType: 'SHOW', targetId: show.id }` — this is already wired and already used by `openGate`/`resolveGate` today (confirmed against real data: the existing audit row already carries `reason`, `action`, and a `metadata` blob with `field`/`old_value`/`new_value`/`gate_kind`). The "live" reason/category/who-flagged-it shown in the Resolve dialog and the Shows-list row is **derived**, not stored: it's the most recent `Audit` row for that show whose action is `opened` or `note_updated` with no later `resolved` row following it (a simple "latest of this kind since the last resolve" query against `AuditService.findForTargets`, which already exists in `audit.service.ts`). Gate History renders the same query without the "most recent" filter — the full ordered list.
- **No `Show.metadata` write for any of this, and that's deliberate.** An earlier draft put the live snapshot in `Show.metadata.pending_resolution`. Reviewing it against the actual `updateShow` code path surfaced a real bug-in-waiting: `buildUpdatePayload` (`studio-show-management.service.ts:272-305`) does `if (dto.metadata !== undefined) payload.metadata = dto.metadata` — a **full replacement** of the JSONB column, and `UpdateStudioShowDto` already exposes `metadata` as an optional field on the generic show-edit endpoint. Any future caller sending a `metadata` payload on a routine edit while a gate is pending would silently wipe the snapshot — the same failure shape as the `show_status_id` bypass this whole redesign exists to fix, just hiding on a different field. Sourcing the snapshot from `Audit` instead removes the JSONB key entirely, so there's nothing left for a routine edit to clobber.
- **Amending the pending note.** While `status === CANCELLED_PENDING_RESOLUTION`, any current Duty Manager (tier-2 check, same as opening) can submit an updated note via a small dedicated action — this just writes another `Audit` row (`action: 'note_updated'`); there's no field to overwrite. The "latest snapshot" query above naturally picks up the newest one, while the original wording stays in Gate History.
- No `TaskType.STATE_GATE` enum value, no migration at all — `CANCELLED_PENDING_RESOLUTION` is already a seeded `ShowStatus` row on `master` today (the pre-existing `publishing.service.ts` auto-cancel logic already uses it), so this entire redesign needs zero schema changes.

This also kills the original justification for modeling gates as `Task` in the first place ("Task already has TaskTarget for linking to a Show, assignee, due date...") — that justification was about delegated, closeable work, which never applied once there's no owner.

## Manager and Duty Manager paths

Same cancellation dialog for both tiers; what's collected and what happens on submit differs by which tier authorized the request:

- **Manager tier — atomic resolution.** Dialog collects reason (category + note) *and* final outcome (`CANCELLED` / `COMPLETED`) together. One service call: validate guards (active-task count — rendering the same count-and-link-to-task-list UX PR #230 built if it blocks, not just a generic 400; LIVE safeguard), set `Show.status` directly to the outcome, write one `Audit` row. The show is never observably `CANCELLED_PENDING_RESOLUTION` — nothing is ever left for a later query to find as "pending."
- **Duty Manager tier — flag and defer.** Dialog collects reason only. `Show.status → CANCELLED_PENDING_RESOLUTION`, one `Audit` row (`action: 'opened'`) — this row *is* the snapshot (see above). Any Manager/Admin signs off later — see below.
- **Sign-off** is a second, plain call: re-derive `from_status` from the latest `opened`/`note_updated` `Audit` row, validate the same guards (active-task count with the same count+link UX, LIVE safeguard) against it, and update `Show.status` to the chosen outcome **conditioned on the row still being `CANCELLED_PENDING_RESOLUTION`** (a guarded update — `UPDATE ... WHERE show_status_id = <pending>`, not a plain read-then-write) so two Managers racing to resolve the same show can't both succeed. The loser gets a clear `SHOW_ALREADY_RESOLVED` conflict instead of a silent double-write — `Show` has no `version` column to lean on for this (confirmed against `prisma/schema.prisma`, unlike `Task`/`TaskTemplate`/`StudioCreator`, which all use `updateWithVersionCheck`), so the guard has to be the conditional `WHERE` clause itself. Writes a second `Audit` row (`action: 'resolved'`). There is no separate "sign-off" endpoint, status, or concept beyond "resolve a pending-resolution show" — it is the same operation whether the original flag came from a Duty Manager or from `schedule_publish_removal`.
- If a Duty Manager doesn't act in time, nothing forces them to — a Manager can always cancel the show directly through the Manager-tier path regardless of shift state. No timeout, no escalation logic; the fallback is just "a Manager has standing authority to act on any eligible show at any time."

`schedule_publish_removal` (system-generated, no human present) writes the same shape — `Show.status → CANCELLED_PENDING_RESOLUTION` plus an `Audit` row with `reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE'` — directly from `publishing.service.ts`'s remove-flow. No Task, same as the manual path, resolved through the identical guarded sign-off call.

## How a Manager finds a pending-resolution show

No Task Review involvement at all. The Shows list already supports filtering by `show_status_name` (confirmed in `get-studio-shows.ts`) — a Manager filters to `Cancelled Pending Resolution` to see every show awaiting sign-off across the studio. The show's own detail page shows the derived snapshot (reason, category, who flagged it, when — sourced from the latest open `Audit` row, per above) for anyone who already knows which show.

Either surface leads to the same Resolve action. Two things worth a follow-up check once this ships, flagging rather than deciding now: (1) confirm the existing status-badge styling on the Shows list makes a `Cancelled Pending Resolution` row visually distinct enough without a notification pointing anyone at it; (2) if a Duty Manager's shift ends mid-form-fill, the submit will 403 against a freshly-empty active-shift check — the dialog should surface that as a clear "your shift has ended" message rather than a generic error, so the form's contents aren't just lost with no explanation.

## Notification seam (placeholder only)

No notification system exists yet (confirmed: no `EventEmitter2`/domain-event pattern anywhere in `erify_api`), so v2 does not build one. It adds a single seam so future work has a clear, narrow point to plug into instead of threading new logic through `ShowStateGateService` itself:

```ts
@Injectable()
export class GateNotificationService {
  notifyGateOpened(show: Show, gateKind: GateKind, reason: { category: string; note: string }, actor: { uid: string; name: string }): void {
    // no-op today — structured log only
  }
  notifyGateResolved(show: Show, gateKind: GateKind, outcome: string, actor: { uid: string; name: string }): void {
    // no-op today — structured log only
  }
}
```

The `actor` parameter is required, not optional — any real notification ("Duty Manager Jane flagged...") needs to say who acted, and it's cheap to thread through now versus retrofitting once a real channel exists. Called at the same two points as before (open, resolve). For the Manager atomic path, both fire in sequence within the same request. Wiring this to a real channel is future work, tracked as a non-goal below.

## The bypass fix

`StudioShowManagementService.updateShow` rejects any request whose body changes `show_status_id` while `existingShow.showStatus.systemKey === 'CANCELLED_PENDING_RESOLUTION'` — a single field comparison now, no join, no Task lookup. This is the *only* guard this redesign needs: sourcing the live snapshot from `Audit` instead of `Show.metadata` (see "No Task at all") means there's no second field for a routine edit to silently clobber. The only paths that may move a pending-resolution show are the Manager-tier resolve call and the guarded sign-off call. This closes the exact gap found in manual QA.

## Data model changes from PR #230

- No `TaskType.STATE_GATE`, no `Task`/`TaskTarget` usage for either gate kind, no migration, no `Show.metadata` writes for gate content. `ShowStateGateService.openGate`/`resolveGate`/`claimGate` and `TaskOrchestrationService.claimTask` are all deleted (the latter confirmed to be a pure passthrough added by PR #230 for this feature, not pre-existing generic task functionality), along with the `PATCH /studios/:studioId/tasks/:id/claim` endpoint and the frontend `use-claim-task.ts` hook + "Claim" action.
- `findOpenStateGateForShow` is deleted — replaced by checking `show.showStatus.systemKey === 'CANCELLED_PENDING_RESOLUTION'` directly, with the snapshot itself sourced from `AuditService.findForTargets`.
- The sign-off write is a guarded update (`WHERE show_status_id = <pending>`, not a plain read-then-write) since `Show` has no `version` column for optimistic locking, unlike `Task`/`TaskTemplate`/`StudioCreator`.
- `CancelStudioShowDto` drops `resolution_owner_membership_id` and `follow_up_due_at` (both owner-scoped); gains a conditionally-required `outcome` field (required only at Manager tier) and a separate small DTO for the Duty-Manager note-amendment action.
- The generic task reassignment-with-note capability (`PATCH .../tasks/:id/assign`, extended by PR #230 with an optional handover `note`) is unrelated to this redesign now that gates aren't tasks — left as-is, out of scope to revert.

## Non-goals (this iteration)

- Building an actual notification system or wiring `GateNotificationService` to a real channel (email, in-app, Slack) — no channel exists yet; this is explicitly future work once one does.
- A dedicated `STUDIO_ROLE.DUTY_MANAGER` permission tier — duty-manager authority is purely the existing time-windowed shift flag, not a new static role.
- Multi-person notification/escalation lists, letting a Manager opt into the deferred path instead of atomic resolution, or any timeout/escalation logic for an unresolved pending show — confirmed out of scope.
- A graceful in-dialog recovery flow for a Duty Manager's shift ending mid-submission beyond a clear error message — flagged above as a UX detail for whoever builds the dialog, not solved at the design level here.
- Cross-studio dashboards, second-level `gate_kind` filtering, and the other PR #230 non-goals — unchanged, still out of scope.

## Testing

- Unit: tier resolution — Manager/Admin takes the atomic path even while also flagged duty manager; a plain member flagged duty manager right now takes the deferred path; a plain member with no duty-manager flag is rejected (403); a duty-manager flag outside the active shift window is rejected.
- Unit: Manager-tier cancel resolves atomically — `Show.status` lands directly on the chosen outcome, exactly one `Audit` row is written, `Show.status` is never observably `CANCELLED_PENDING_RESOLUTION` from a concurrent read.
- Unit: Duty-Manager-tier cancel only opens — no `outcome` accepted/required, `Show.status → CANCELLED_PENDING_RESOLUTION`, one `opened` `Audit` row.
- Unit: the derived-snapshot query returns the latest `opened`/`note_updated` `Audit` row with no later `resolved` row for that show; returns nothing once resolved.
- Unit: note-amendment — only a current Duty Manager can amend the note while pending (writes a `note_updated` `Audit` row); rejected once resolved; the original `opened` row's content is untouched in history.
- Unit: sign-off re-derives `from_status` from the latest open `Audit` row, re-validates active-task count (with the count+link UX, not a generic 400) and LIVE safeguard against it, and only writes if `show_status_id` still matches pending at write time — a forced double-resolve race (two concurrent calls against the same show) results in exactly one success and one `SHOW_ALREADY_RESOLVED` conflict, not two `Audit` rows with conflicting outcomes.
- Unit: a routine `updateShow` call carrying an unrelated `metadata` payload while a gate is pending does not affect the derived snapshot (there's nothing on `Show` for it to clobber) — this test exists specifically to pin the fix for the gap found in design review.
- Unit: `updateShow` rejects a `show_status_id` change whenever `showStatus.systemKey === 'CANCELLED_PENDING_RESOLUTION'`, for both gate kinds; succeeds once resolved.
- Unit: `GateNotificationService.notifyGateOpened`/`notifyGateResolved` are called with the expected arguments — including `actor` — at both transition points.
- Integration: schedule-publish removal writes the same `Audit`-based shape; a Manager resolves it through the same guarded sign-off path as a manual flag.
- Frontend: cancellation dialog renders the outcome picker only when the resolved tier is Manager; the active-task guard renders the count+link UX for both the Manager atomic path and the sign-off path; Duty-Manager-tier submission shows a "flagged, pending sign-off" confirmation instead of a final-state toast; Shows-list filtering by `Cancelled Pending Resolution` surfaces both gate kinds; Gate History renders from `Audit`, not `Task.content.history`.
