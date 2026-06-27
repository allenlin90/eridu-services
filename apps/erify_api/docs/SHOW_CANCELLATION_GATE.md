# Show Cancellation Gate

> **Status**: ✅ Implemented
> **Owner app**: `apps/erify_api` (backend), `apps/erify_studios` (frontend)

## Purpose

Lets a show in production be interrupted (creator no-show, room unavailable, equipment failure, platform issue, etc.) and parked in a middle status — "cannot proceed yet, needs someone to decide" — before its lifecycle closes, with two authorization tiers instead of a single flow:

- **Manager/Admin** resolves a cancellation in one atomic step (reason + final outcome together) — the show is never observably left in a pending state.
- **Duty Manager** (whoever is flagged `isDutyManager` on the studio's currently active shift) can only flag a cancellation with a reason — no outcome — leaving it for any Manager/Admin to sign off later. They may also amend the pending note while it's open.

The same primitive also backs `schedule_publish_removal`: when a schedule republish removes a show that still has active tasks attached, the show is parked the same way instead of being silently cancelled, and (new in this implementation) the auto-cancel now writes an audit trail for the first time.

## API Surface

| Endpoint                                                            | Purpose                                                            | Roles                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- |
| `POST /studios/:studioId/shows/:showId/cancel-with-resolution`      | Cancel a show — atomic for Manager/Admin, flag-only for Duty Manager | Any studio member; tier enforced in the service        |
| `POST /studios/:studioId/shows/:showId/resolve-cancellation`        | Sign off a pending cancellation (pick the final outcome)             | Manager/Admin only (enforced in the service)            |
| `PATCH /studios/:studioId/shows/:showId/cancellation-note`          | Amend the pending reason note while a gate is open                  | Current active Duty Manager only (enforced in service) |
| `GET /studios/:studioId/shows/:showId/cancellation-status`         | Read the live snapshot + full history for a show                    | Any studio member                                       |

Request/response field names are `snake_case` (`reason_category`, `reason_note`, `outcome`, `resolution_notes`); the cancellation-status response maps the service's internal `camelCase`/`Date` shape to `snake_case`/ISO strings (`StudioShowController.toCancellationStatusApiResponse`).

## Design Decisions

1. **`Show.status` is the gate state — no new model, no `Task`, no assignee.** `CANCELLED_PENDING_RESOLUTION` means a gate is open; any other status means resolved. An earlier iteration of this feature modeled the gate as a `Task` row with an assignee (mirroring the codebase's general task-as-form pattern); it was abandoned after manual QA against real data found the assignment carried no real signal (no notification system existed to alert anyone) and the underlying `Task` infrastructure added ownership/claim machinery this feature never needed.
2. **`Audit` (already-wired, pre-existing) is the only persistence for gate content** — reason, category, who, when. No `Show.metadata` write exists anywhere in this feature. An earlier draft stored the live snapshot in `Show.metadata.pending_resolution`; that was replaced before merge after review found `StudioShowManagementService.updateShow`'s generic edit path does a full-object JSONB replace on `metadata`, so any unrelated routine edit while a gate was open would have silently wiped the snapshot — the exact bug class the bypass fix (below) exists to close, just on a different field. Deriving the snapshot from the most recent relevant `Audit` row removes the field entirely, so there's nothing left to clobber.
3. **Two authorization tiers, resolved server-side** (`ShowCancellationGateService.resolveActorTier`): Manager/Admin role is checked first and wins outright; the Duty Manager check (does the active shift's `isDutyManager` flag belong to this actor, by internal `User.id`) only runs as a fallback. The frontend has its own tier hook (`useCancellationTier`) purely for what the dialog displays — the backend independently re-derives and enforces the real tier on every request, so a stale or wrong client guess can only hide/show UI, never execute an unauthorized action.
4. **`ShowRepository.updateStatusIfPending(showId, expectedCurrentStatusId, targetShowStatusId)` is a named repository method, not an inlined query.** `Show` has no `version` column for optimistic locking (unlike `Task`/`TaskTemplate`/`StudioCreator`), so resolving a pending show needs a conditional `UPDATE ... WHERE id = ? AND show_status_id = ?` — a plain read-then-write would let two Managers racing to resolve the same show both succeed and overwrite each other's outcome. The method's third parameter is a scalar `bigint`, not a `Prisma.ShowUpdateInput` — an earlier version accepted the wider update-input type and every caller passed a relation write (`showStatus: { connect: { id } } }`); that type-checked (the wider type is a structural superset and TypeScript doesn't excess-property-check a variable reference nested in an object literal) but fails at the database, since Prisma's `updateMany` only accepts scalar fields. Mocked unit tests never caught it because they never touch a real Prisma engine. The scalar-only signature makes that bug class unrepresentable.
5. **`TaskTargetRepository.countActiveByShowId(showId)` is a named repository method, not an inlined query.** The active-task guard (blocks resolving to `CANCELLED` while real production work remains) must exclude `TaskStatus.COMPLETED`/`CLOSED` in addition to soft-delete filtering — a flat `findMany`/`count` from the service can't express the cross-model join (`task.deletedAt`, `task.status`) without leaking Prisma relation semantics into the service layer. This also fixed a pre-existing imprecision: `publishing.service.ts`'s own inline active-task check (used by `schedule_publish_removal`) previously counted *any* non-deleted task regardless of status; it now uses this same canonical helper, so report and resolve paths can't drift.
6. **The generic `PATCH /studios/:studioId/shows/:showId` edit endpoint cannot move a show into or out of a pending gate.** Manual QA against real data found the original gap: a show driven into `CANCELLED_PENDING_RESOLUTION` via the gate endpoint could be silently edited back to its prior status through the regular show-edit form, with zero audit trail. `StudioShowManagementService.updateShow` now rejects any `show_status_id` change while the show is already pending (`SHOW_STATUS_LOCKED_BY_PENDING_CANCELLATION`), and — found during PR review — also rejects setting `show_status_id` directly *to* the pending status (`SHOW_STATUS_PENDING_RESOLUTION_REQUIRES_GATE`), since entering pending that way skips the opening `Audit` row entirely and leaves a later resolve attempt unable to find any gate history.
7. **The Duty Manager tier never picks the final outcome.** `cancel-with-resolution` requires `outcome` for Manager/Admin and forbids it for Duty Manager — front-line staff are not asked to judge things like partial-production-credit implications; that's deferred to whoever signs off.
8. **No notification system is built.** `GateNotificationService.notifyGateOpened`/`notifyGateResolved` are structured-log-only no-ops, taking a nullable actor (`schedule_publish_removal` opens with no human present). This is the single, narrow seam future notification work plugs into instead of threading new logic through the gate service itself.

## Key Business Rules

### Eligibility to open a gate

A show may only be cancelled from `CONFIRMED` or `LIVE`. `DRAFT`, `CANCELLED_PENDING_RESOLUTION`, `CANCELLED`, and `COMPLETED` all reject with `SHOW_CANCELLATION_NOT_ALLOWED`.

### Active-task guard

Resolving to `CANCELLED` is blocked with `ACTIVE_TASKS_REMAIN` (and the live count) while any non-deleted, non-terminal (`COMPLETED`/`CLOSED` excluded) task is still attached to the show. `COMPLETED` does not require this check — partial production already happened.

### No special case for LIVE

`CANCELLED` is gated the same way regardless of whether `from_status` was `CONFIRMED` or `LIVE` — only the active-task guard applies. An earlier draft hard-blocked `CANCELLED` from `LIVE` (`LIVE_CANCELLATION_REQUIRES_OVERRIDE`, forcing `COMPLETED`/`RESTORE_PREVIOUS` instead) on the assumption that a live show always has nonzero production to credit. Manual QA found this didn't hold for the common case — a client cancelling a show mid-stream for reasons unrelated to production (the `CLIENT_REQUEST` reason category exists for exactly this) — so the safeguard was removed in favor of the uniform active-task rule every other `from_status` already used.

### Sign-off is the same operation regardless of origin

There is no separate "sign-off" status or endpoint distinct from "resolve a pending-resolution show" — a Duty-Manager-flagged gate and a system-generated `schedule_publish_removal` gate are resolved through the identical `resolvePending` path. This includes schedule publish itself: if a republish finds a show already parked `CANCELLED_PENDING_RESOLUTION` and its active-task count has since dropped to zero, publish calls `resolvePending` (with a null actor) rather than writing `show_status_id` directly — a raw status write would skip the closing `Audit` row the same way the studio show-edit bypass would have.

### Discovery has no dedicated screen

A Manager finds a pending-resolution show via the existing Shows-list `show_status_name` filter, or directly on the show's own detail page — there is no Task Review involvement (there is no `Task`) and no dedicated queue route.

## Follow-Ups

- `publishing.service.ts`'s `fromStatusSystemKey: removed.showStatus.systemKey ?? 'CONFIRMED'` fallback silently substitutes a value rather than failing loudly if `systemKey` were ever null — not reachable today (every show has a non-null status), flagged during final review as a defensive nicety worth tightening if it ever becomes load-bearing.
- `resolve-cancellation-dialog.tsx`'s outcome value is cast `as any` before the mutation call; narrowing it to `GateOutcome` would drop the cast without changing behavior.
- No dedicated pending-resolution queue, status badges, or member-facing task-page indicator exist (the original MVP design proposed all three — see `docs/design/IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md`). The Shows-list filter is the accepted MVP discovery surface; revisit if studios report difficulty finding pending shows that way.
- No structured observability (counters/logs for resolve success/rejection rates) beyond the pre-existing `publishSummary.shows_pending_resolution`/`shows_cancelled` publish-time tallies and the no-op notification seam.
