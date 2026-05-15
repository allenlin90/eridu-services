# Phase 4 — Remaining Work

> **Canonical contract**: [docs/prd/economics-cost-model.md](../prd/economics-cost-model.md) — locked semantics, read first.
> **Journey traces**: [creator-operations.md](../workflows/creator-operations.md) · [shift-operations.md](../workflows/shift-operations.md)
> **Architecture rules**: [PHASE_4.md § Architecture Guardrails](./PHASE_4.md#architecture-guardrails)
> **Last updated**: 2026-05-15

## Why this file exists

Phase 4 started as a full P&L workstream and was re-scoped mid-flight to a **read-only cost reference viewer** — no revenue, no payments, no settlement, no bank transfers. Downstream PRDs and the implementation plan drafted under the old ambition either restated the locked 2.1 cost model or carried stale framing from the simplification. This file replaces them.

Each entry below is a focused PR with **one user-observable outcome**. The shape is user-flow-first, not schema-first: a reviewer should know what to click in the UI within ten seconds of reading the entry.

Replaced docs (deleted in this PR):

- `docs/prd/compensation-line-items.md` (2.2)
- `docs/prd/economics-service.md` (2.3)
- `docs/prd/studio-economics-review.md` (3.1)
- `docs/prd/show-planning-export.md` (3.2 — folded into PR 2)
- `docs/prd/creator-availability-hardening.md` (3.3 — design doc stays)
- `docs/prd/studio-schedule-management.md` (deferred per own status)
- `docs/superpowers/specs/2026-05-09-compensation-line-items-phase-2-2-breakdown.md`
- `docs/superpowers/plans/2026-05-09-compensation-line-items-phase-2-2.md`

Relocated:

- `docs/prd/pnl-revenue-workflow.md` → `docs/prd/future/pnl-revenue-workflow.md` (post-Phase-4 reference)

## PR roadmap

| #   | PR                                                                      | Depends on | Status     |
| --- | ----------------------------------------------------------------------- | ---------- | ---------- |
| 1   | `/shifts` table — unify date range and add export                       | PR 3       | 🔲 Planned |
| 2   | `/show-operations` — unify date range and add export                    | —          | 🔲 Planned |
| 3   | Drop stored `projected_cost` / `calculated_cost`; serve live `total_cost` | —          | 🚧 Next    |
| 4   | Manager corrects a creator's compensation terms on a show               | —          | 🔲 Planned |
| 5   | Manager reviews one creator's shows across a date range                 | PR 4       | 🔲 Planned |
| 6   | Manager records a show's actual start/end times                         | —          | 🔲 Planned |
| 7   | Manager finds shows needing actuals (queue view)                        | PR 6       | 🔲 Planned |
| 8   | Manager reviews one member's shifts across a date range                 | PR 7       | 🔲 Planned |
| 9   | Roster edit warns that existing snapshots are unchanged                 | —          | 🔲 Planned |
| 10  | Recipient flags missing actuals from their self-view                    | PR 7       | 🔲 Planned |
| 11  | Creator and operator self-view compensation reads                       | PR 4, PR 6 | 🔲 Planned |
| 12  | Cross-user creator/member compensation reads + show drill-in            | PR 11      | 🔲 Planned |
| 13  | Operational rollup endpoint                                             | PR 12      | 🔲 Planned |
| 14  | Studio economics review surface (cross-perspective rollup table)        | PR 13      | 🔲 Planned |
| 15  | Strict-mode creator availability with conflict metadata                 | —          | 🔲 Planned |

PRs 2, 3, 4, 6, 9, and 15 can start immediately in parallel. The rest have at least one upstream PR.

---

## PR 1 · `/shifts` table — unify date range and add export

**User flow** — A studio admin opens `/studios/:id/shifts?view=table`. Today the page shows two sections — a shift cost snapshot (aggregates) and a shift records list — each with its own date-range picker. The picker behavior diverges across sections and exporting requires copying numbers manually. After this PR: one date-range picker drives both sections, the columns include the live `total_cost` from PR 3, and an "Export" button downloads the current view as CSV or JSON.

**UX target**
- Single date-range picker at page top; both sections re-fetch on change
- Column set on the records table: date, member, status, duty manager, hourly rate, total cost, blocks summary
- Cost snapshot section aggregates the same date range as the records table
- Export button on the records section; exports rows currently displayed (respects filters)
- Loading and empty states are explicit; empty-with-filters distinguishes from empty-without-filters

**Scope**
- FE: refactor `/studios/:id/shifts` page to lift date-range state to the page level; both child sections subscribe. Add export action that serializes visible rows.
- BE: none — the existing list endpoint already accepts `date_from` / `date_to`; export is FE-side serialization of the current page

**Out of scope** (future)
- Server-side export endpoint (file generation, large-result streaming)
- Per-column sorting beyond the desc default landed in PR #67
- Bulk operations on selected rows

**Acceptance**
- [ ] Changing the date range refreshes both sections (snapshot and records) in one network round
- [ ] Records table renders `total_cost` from the API; no FE arithmetic
- [ ] Export downloads the current view; CSV includes column headers
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: PR 3 (delivers the `total_cost` field this table consumes).

---

## PR 2 · `/show-operations` — unify date range and add export

**User flow** — A studio manager opens `/studios/:id/show-operations` to review upcoming and recent shows. Today the page has multiple sections with independent date controls; aligning what the manager sees across sections requires repeated selection. After this PR: one date-range picker drives every section on the page, columns include projected cost (from 2.3 once it lands; until then, the existing column set), and an "Export" button downloads the current view as CSV or JSON.

This PR also eliminates the need for a separate "show planning export" workstream. Operations export the page they already review.

**UX target**
- Single date-range picker at page top
- Sections (upcoming shows, recent shows, summaries) all subscribe to it
- Default range: last 7 days through next 14 days
- Export button mirrors PR 1 behavior (CSV / JSON of the current view)
- Empty / loading / error states explicit per section

**Scope**
- FE: refactor `/studios/:id/show-operations` page to lift date-range state. Add export action.
- BE: none — existing show list endpoint accepts date filters; export is FE-side

**Out of scope**
- Cost columns sourced from 2.3 — those land via PR 11-13 and are surfaced here later
- Saved presets (planning vs review)
- Server-side export

**Acceptance**
- [ ] One date-range picker drives every section
- [ ] Export downloads current view; CSV includes column headers
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: nothing.

---

## PR 3 · Drop stored `projected_cost` / `calculated_cost`; serve live `total_cost`

**User flow** — A studio admin opens `/studios/:id/shifts` and sees a "Projected Cost" column. Today that number comes from a stored database column that can drift from reality whenever line items, blocks, or rates change. The admin has no way to know if the displayed value reflects the current state. After this PR: the column is renamed "Total Cost" and the number is calculated live from `hourlyRate × block-duration` + active `STUDIO_SHIFT` / `STUDIO_SHIFT_BLOCK` line items. Editing a line item or block updates the column on next refetch. Nothing visible to other admins changes.

**UX target**
- Column renamed: "Projected Cost" → "Total Cost"
- Number is always current — no stale stored values
- No new column added; this is a swap

**Scope**
- BE: drop `StudioShift.projected_cost` and `StudioShift.calculated_cost` from Prisma schema; remove every writer in the same change set (creation, update, response serialization, shift-calendar aggregation, fixtures). Add `total_cost` (string) to the shift list response, calculated live.
- Contract: drop the stored-cost fields from `packages/api-types/src/studio-shifts/` schemas; add `total_cost` to the list response shape.
- FE: rename the column header in the shift table; bind to the new field; remove form fields, cards, and mocks that referenced the stored fields.

**Single-PR constraint** — `projected_cost` is `Decimal NOT NULL`. Removing it requires deleting every writer at the same time or shift creation breaks between PRs. Run `rg 'projectedCost|calculatedCost|projected_cost|calculated_cost'` before opening the PR to confirm every reference is addressed.

**Out of scope**
- Calendar money totals — either pipe them through the live path or remove them in this PR; do not leave them on stored fields
- Adding `total_cost` to per-shift detail views (only the list response is required for PR 1)

**Acceptance**
- [ ] Migration removes both columns; shift creation succeeds without `projectedCost` in the request body
- [ ] Shift list response includes `total_cost` as a decimal string; FE renders without local arithmetic
- [ ] All `rg` hits for `projectedCost|calculatedCost` are addressed (removed or rewired)
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: nothing.

---

## PR 4 · Manager corrects a creator's compensation terms on a show

**User flow** — A talent manager opens `/studios/:id/creator-mapping/:showId`. They see a creator assignment row marked `AGREEMENT_SNAPSHOT_MISSING` (or with a rate that's wrong for this specific show). Today the row is read-only and the only way to fix it is to ask a system admin. After this PR: an "Edit terms" button on the row opens a dialog with `agreedRate` / `compensationType` / `commissionRate` / `note` and a required `override_reason` field. Submitting writes the snapshot edit and appends one entry to `metadata.audit.snapshot_overrides[]`. On refetch, the per-show compensation summary moves the row out of unresolved state.

The dialog is editable for `ADMIN` and `MANAGER`; `TALENT_MANAGER` sees the same panel read-only.

**UX target**
- Snapshot warning copy in the dialog: "Changing these terms updates historical reference values"
- `override_reason` is required; surfaced in the audit log
- Role gating is visible (talent manager sees disabled inputs with explanation)
- AGREEMENT_SNAPSHOT_MISSING badge disappears from the row on refetch after a valid edit
- Bulk-assign endpoint remains assignment-only — no regression of the boundary set in PR #64

**Scope**
- BE: new `PATCH /studios/:studioId/shows/:showId/creators/:showCreatorId` accepting `agreed_rate`, `compensation_type`, `commission_rate`, `note`, `override_reason`. Wires `appendSnapshotAudit()` for changed snapshot fields. Restricted to `ADMIN` / `MANAGER`.
- Contract: `updateShowCreatorAssignmentInputSchema` in `packages/api-types/src/studio-creators/`.
- FE: extend the existing `show-creator-compensation-dialog.tsx` with an "Assignment terms" panel above the line-items list. Invalidate `compensationSummary(studioId, showId)` on submit.

**Out of scope**
- Per-creator review across multiple shows — separate PR
- Bulk edit across rows — separate PR
- Showing the audit history in the UI (the data is captured; surfacing is a future UX PR)

**Acceptance**
- [ ] `TALENT_MANAGER` sees the panel read-only; `ADMIN` / `MANAGER` can submit edits
- [ ] A row in `AGREEMENT_SNAPSHOT_MISSING` transitions out on next refetch after a valid edit
- [ ] One audit entry per changed field is appended; internal DB IDs are never written into `metadata`
- [ ] Bulk-assign still rejects compensation fields
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: nothing (T4 `appendSnapshotAudit` and T5 per-show summary are already shipped).

---

## PR 5 · Manager reviews one creator's shows across a date range

**User flow** — A manager wants to see all shows a specific creator worked over a period — typically when reconciling pay or correcting a batch of terms. Today there's no creator-centered view: the manager has to open each show individually. After this PR: a new route `/studios/:id/creator-mapping/by-creator/:creatorId?from=...&to=...` lists every show that creator was assigned to in the range, with the same per-row breakdown the per-show view uses (base, line items, total, unresolved reason). Per-row edit reuses PR 4's PATCH endpoint. A bulk-edit dialog applies the same edits across selected rows.

**UX target**
- One screen, one creator, one date range — answers "what did this creator earn this month"
- Per-show row: same shape as the per-show creator summary (base / adjustment / total / unresolved)
- Per-row "Edit terms" reuses PR 4's dialog
- Bulk-edit applies the same PATCH across selected rows with per-row success / failure reporting
- Container total respects the same null-bubbling rules: unresolved rows don't contribute; pending count shown separately

**Scope**
- BE: new `GET /studios/:studioId/creators/:creatorId/compensation-summary?from=...&to=...`. Same row shape as `showCreatorCompensationSummarySchema`, plus a creator-level total + `unresolved_count`. Restricted to `ADMIN` / `MANAGER`.
- Contract: per-creator summary response in `packages/api-types/src/studio-creators/`.
- FE: new `apps/erify_studios/src/features/studio-creator-compensation-review/` with date-ranged list view, per-row edit (reuses PR 4's dialog), bulk-edit dialog.

**Out of scope**
- Operator-side equivalent (covered by PR 8)
- Comparison across creators on the same screen
- Saved report definitions

**Acceptance**
- [ ] Manager sees one creator's shows across the range with consistent breakdown
- [ ] Per-row edit invokes PR 4's PATCH; row state updates on refetch
- [ ] Bulk-edit reports per-row outcomes; partial failures don't lose successful writes
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: PR 4 (per-row edit dialog).

---

## PR 6 · Manager records a show's actual start/end times

**User flow** — A studio manager opens a finished show in `/studios/:id/show-operations` or the show detail view. The show has scheduled times but no actuals recorded. Today the show stays as "scheduled" in everyone's compensation view and recipient self-views show pending. After this PR: the show edit form exposes `actualStartTime` / `actualEndTime` inputs alongside the existing fields. A short note explains: "Recording actuals moves this show out of pending state for assigned creators." Submitting writes through the existing show update endpoint.

This is the show-side counterpart to block actuals, which already shipped in PR #65.

**UX target**
- Two paired datetime inputs with clear ("clear actual start / end") controls
- Client-side inverted-range guard (start ≤ end) with inline warning
- Submit goes through the existing show update mutation — no new endpoint
- After submit, invalidate the show detail and per-show creator compensation summary

**Scope**
- FE: new `apps/erify_studios/src/components/finance/ShowActualsInput.tsx`. Mount on the existing show update form. No new mutation.
- BE: none — the schema fields and route already accept these inputs from PR #63 (T4).

**Out of scope**
- Bulk actuals entry across multiple shows
- Operator-recorded actuals from a creator/operator app — extension point only, dormant in Phase 4
- The missing-actuals queue (covered by PR 7)

**Acceptance**
- [ ] Manager can set, clear (one side or both), and update actuals on a show
- [ ] Inverted-range input is blocked on the client; server rejection is a fallback
- [ ] Successful write invalidates show detail and the per-show creator summary
- [ ] FE lint/typecheck/test/build pass

**Depends on**: nothing (T4 schema columns shipped in PR #63).

---

## PR 7 · Manager finds shows needing actuals (queue view)

**User flow** — A studio manager wants to know which past shows still don't have actuals. Today there's no list — they have to find shows by date and check each one. After this PR: a new section on `/studios/:id/show-operations` (or a dedicated `/missing-actuals` subroute) lists shows whose end time is in the past and whose `actualStartTime` / `actualEndTime` are still null. Each row exposes the same inputs from PR 6 inline, so the manager records actuals without leaving the queue.

**UX target**
- Default sort: oldest-overdue first (the shift list defaults to desc, but a missing-actuals queue is more useful oldest-first because that's the priority)
- Inline submission — record actuals without navigating to the show detail
- Row disappears on successful submission
- Empty state: "All recent shows have actuals recorded"
- Counts: badge in the section header with the current overdue count

**Scope**
- BE: new `GET /studios/:studioId/shows/missing-actuals?include_recent_days=N` returning shows with past end time and null actuals. Restricted to `ADMIN` / `MANAGER`. Default lookback configurable; cap at e.g. 90 days.
- Contract: response in `packages/api-types/src/shows/`.
- FE: new queue section component; reuses `ShowActualsInput` from PR 6 in inline mode.

**Out of scope**
- Recipient-side "I notice my row has no actuals" affordance (covered by PR 10)
- Shift-block missing-actuals equivalent — block actuals input shipped in PR #65; if a parallel queue is needed for blocks, that's a follow-up PR not currently scoped

**Acceptance**
- [ ] Queue lists shows with past end time and null actuals only
- [ ] Inline submission writes through the existing show update path
- [ ] Row disappears on success; count badge updates
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: PR 6 (the inline submission reuses the input).

---

## PR 8 · Manager reviews one member's shifts across a date range

**User flow** — A manager wants to see all shifts one studio member worked over a period — the operator-side analogue of PR 5. Today there's no member-centered view; the shifts table shows everyone or filtered by member, but doesn't roll up cost. After this PR: a new route `/studios/:id/shifts/by-member/:membershipId?from=...&to=...` lists per-shift base labor (`hourlyRate × duration`), `STUDIO_SHIFT` line items at shift level, and `STUDIO_SHIFT_BLOCK` line items per block. Rows with missing or partial block actuals are surfaced with `ACTUALS_INCOMPLETE` and link to the block-actuals input.

**UX target**
- Same renderer pattern as PR 5 and the per-show creator summary (single rendering shape across all summary views)
- Actuals-fallback contract: both block actuals present → use them; both null → planned fallback with warning; one-sided → `ACTUALS_INCOMPLETE` and contribute null to container total
- Unresolved rows surface their reason inline; container total respects null bubbling
- Manager can click into a flagged row to land on the block-actuals input shipped in PR #65

**Scope**
- BE: new `GET /studios/:studioId/shifts/by-member/:studioMembershipId/compensation-summary?from=...&to=...`. Restricted to `ADMIN` / `MANAGER`. Returns per-shift breakdown plus a container total + `unresolved_count`. Uses the same fallback contract documented in cost-model §2.
- Contract: response shape in `packages/api-types/src/studio-shifts/`.
- FE: new review feature at `apps/erify_studios/src/features/studio-shift-compensation-review/`. Reuses the renderer pattern from PR 5; navigation back to block-actuals input is a deep link.

**Out of scope**
- Cross-member dashboard rollup (post-Phase-4 — that's 3.1)
- Editing snapshot fields here (the shift hourlyRate snapshot edit ships separately; in scope of T6's snapshot-warning dialog, already merged in PR #65)

**Acceptance**
- [ ] Manager sees one member's shifts across the range with consistent breakdown
- [ ] Actuals-fallback semantics match the documented contract
- [ ] `ACTUALS_INCOMPLETE` rows link to the input surface
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: PR 7 (the deep-link target for actuals input exists in the codebase from PR #65; PR 7 surfaces the queue affordance that's referenced from this view's row state).

---

## PR 9 · Roster edit warns that existing snapshots are unchanged

**User flow** — A studio admin opens the member roster and edits a member's `baseHourlyRate` from 25 to 28. Today there's no UI indication of what does and does not change. The admin might assume existing shifts retroactively reflect the new rate. After this PR: the member-roster edit dialog shows an inline notice: "Existing shift snapshots are unchanged. New shifts will use this rate." A parallel notice appears on the creator-roster edit dialog for `defaultRate` / `defaultRateType` / `defaultCommissionRate`. No code changes to write paths — snapshots already behave this way.

**UX target**
- Single sentence of warning copy on each affected dialog
- Copy is consistent across member-roster and creator-roster surfaces
- Notice appears next to the rate inputs, not buried in dialog footer
- No interaction change — this is purely informational

**Scope**
- FE only: warning copy on member-roster and creator-roster edit dialogs

**Out of scope**
- A "propagate to existing shifts" affordance — that's a deliberate non-feature; snapshots are intended-immutable
- Showing the count of existing snapshots that would have been affected

**Acceptance**
- [ ] Notice copy appears on member-roster edit dialog
- [ ] Notice copy appears on creator-roster edit dialog
- [ ] Copy is identical across both surfaces (single source of truth)
- [ ] FE lint/typecheck/test/build pass

**Depends on**: nothing.

---

## PR 10 · Recipient flags missing actuals from their self-view

**User flow** — A creator opens `/me/compensation/creator` and sees a show they worked sitting in pending state — the show has no actuals recorded yet, so no compensation is showing. Today they can ask their manager out-of-band. After this PR: a "Flag missing actuals" button on the pending row writes a flag the studio's missing-actuals queue (from PR 7) prioritizes. The manager sees the row with a "Recipient flagged" badge. No notification side effect in Phase 4 — the manager finds the flag in their queue.

**UX target**
- Affordance only appears on rows in pending state because of missing actuals (not other pending reasons)
- One-click flag with confirmation copy: "Your line manager will see this on their actuals review queue"
- Idempotent — re-clicking shows "Already flagged" rather than duplicating
- Manager queue surface (PR 7) sorts flagged rows ahead of unflagged ones and shows the badge

**Scope**
- BE: new `POST /me/compensation/pending-events/:eventKey/flag-missing-actuals`. Derives identity from auth context; persists the flag (small write — could be a flag column on the relevant row or a small `RecipientFlag` table — decide in implementation). PR 7's queue read joins this in.
- Contract: request / response in `packages/api-types/src/me-compensation/`.
- FE: button + confirmation state on `/me/compensation/creator` (and equivalent on operator self-view, once PR 11 ships the operator route).

**Out of scope**
- Notifications to the manager (deferred — cost-model §4 extension)
- Recipient dispute / counter-signature on the resolved value (post-Phase-4)
- Recipient-initiated rate adjustment requests (post-Phase-4)

**Acceptance**
- [ ] Recipient can flag a pending-actuals row; repeated flags don't multiply
- [ ] Manager queue from PR 7 surfaces flagged rows with the badge and priority
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: PR 7 (the manager-side surface) and PR 11 (the self-view routes that host the affordance).

---

## PR 11 · Creator and operator self-view compensation reads

**User flow** — A creator (or studio member) signs in and wants to see their reference compensation. Today there is no self-view — they have to wait for a manager to share figures. After this PR: `/me/compensation/creator` and `/me/compensation/operator` show per-event rows for the given date range. Rows with complete actuals show their resolved compensation; rows with missing or partial actuals show as pending without a money figure. Summary totals are countable-only — they include only complete-actuals resolved rows. Pending counts are shown separately.

This is the first PR of the 2.3 economics service split.

**UX target**
- Self-view derives identity from auth context — no studio-id selection (except as a filter when the user is in multiple studios)
- Pending rows are visible and explanatory: "Awaiting actuals" / "Awaiting commission revenue"
- Money is hidden for pending rows even on FIXED compensation packages (recipient countability requires actuals)
- Period total: countable only; pending count surfaced separately
- Loading and empty states explicit

**Scope**
- BE: economics module bootstrap (calculator + data loaders) per cost-model §2. Two routes: `GET /me/compensation/creator?studioId&from&to` and `GET /me/compensation/operator?studioId&from&to`. Identity from auth context.
- Fixture-based tests per Architecture Guardrail #7: FIXED flat per-show, COMMISSION null, HYBRID (FIXED + null commission), shift `hourlyRate × duration`, line-item subtotal composition, missing-actuals → pending suppression, null bubbling, soft-delete exclusion.
- Contract: row shape per cost-model §2 (`cost`, `base_subtotal`, `line_item_subtotal`, `unresolved_reasons[]`, `calculation_warnings[]`, `actuals_source`, `is_in_future`). Decimal-string serialization.
- FE: minimal self-view pages — table of rows with pending labeling and a period summary card.

**Out of scope**
- Cross-user reads (covered by PR 12)
- Operational rollup (covered by PR 13)
- Manager surfaces that consume these reads

**Acceptance**
- [ ] Calculator composes FIXED, COMMISSION (null), HYBRID, and shift base labor correctly
- [ ] Pending rows hide money; period totals exclude them
- [ ] Decimal strings end-to-end; no `Number` / `toFixed(2)` in aggregation paths
- [ ] Soft-deleted rows excluded
- [ ] Fixture tests cover every actuals branch (operator-record, planned-fallback, partial-actuals → pending)
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: PR 4 (the assignment-edit path that lets managers resolve `AGREEMENT_SNAPSHOT_MISSING` rows so calculator output is meaningful) and PR 6 (show actuals input so calculator has data to read).

---

## PR 12 · Cross-user creator/member compensation reads + show drill-in

**User flow** — A studio admin or talent manager wants to inspect another user's compensation reference, or drill into the breakdown for one show. Today there's no manager-facing API for this. After this PR: three new endpoints — per-creator, per-member, and per-show economics — return the same row shape as the self-views from PR 11 but with role guards instead of auth-context identity. These power the manager review surfaces in PR 14 and the per-show inspection from the show detail page.

**UX target**
- This PR adds the BE endpoints and minimal FE wiring (e.g., show drill-in panel). The full review surfaces consume them in PR 14.
- Same row shape across self-views and cross-user views — one renderer
- Admin / manager surfaces may show planned-fallback values with calculation warnings (unlike recipient self-views which hide money)
- TALENT_MANAGER can read creator compensation for the studio they manage; cannot read member compensation

**Scope**
- BE: `GET /studios/:studioId/creators/:creatorId/compensation?from&to` (ADMIN / MANAGER / TALENT_MANAGER), `GET /studios/:studioId/members/:membershipId/compensation?from&to` (ADMIN / MANAGER), `GET /studios/:studioId/shows/:showId/economics` (ADMIN / MANAGER). All return rows in the cost-model §2 shape.
- Contract: per-endpoint request / response in `packages/api-types/src/`.
- FE: show drill-in panel on the show detail view — small consumer that lays the wiring for PR 14. Tabbed or expandable summary.

**Out of scope**
- Operational rollup (covered by PR 13)
- Full review table surfaces (covered by PR 14)

**Acceptance**
- [ ] Three endpoints return rows in the canonical shape; planned-fallback returns calculation warnings
- [ ] Role guards enforced (TALENT_MANAGER blocked from member compensation)
- [ ] UIDs only externally; no internal DB IDs
- [ ] Show drill-in panel renders cost breakdown without local arithmetic
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: PR 11 (calculator and shared row shape).

---

## PR 13 · Operational rollup endpoint

**User flow** — A studio admin opens `/studios/:id/finance/economics` (set up in PR 14) and chooses a perspective: by show, by schedule, or by client. The page asks for rollup rows aggregated over the date range and perspective. Today there's no such endpoint. After this PR: `GET /studios/:studioId/economics?from=&to=&perspective=` returns grouped rows with the same shape as per-row reads, plus group-level counts and labels.

**UX target**
- Three perspectives: `show`, `schedule`, `client`
- Platform is a filter / display dimension, not an additive perspective
- Rollup `cost` follows null-bubbling: any unresolved child → null parent; counts always defined
- Same row shape as PR 11 / PR 12 with additional grouping fields

**Scope**
- BE: `GET /studios/:studioId/economics?from&to&perspective=show|schedule|client&filters...` returning grouped rows. Optional filters: client, schedule, platform, show status, show standard, room — exposed where 2.3 can resolve them from existing data.
- Contract: rollup response shape in `packages/api-types/src/economics/`.
- FE: nothing in this PR (consumer is PR 14).

**Out of scope**
- The review surface itself (PR 14)
- Show planning export — covered by PR 2 at the page-local level

**Acceptance**
- [ ] Three perspectives compose grouping correctly; counts always defined
- [ ] Null bubbling preserved (rollup `cost` null when any child unresolved)
- [ ] Platform filter / display dimension works as filter, not additive rollup
- [ ] Fixture tests cover each perspective and the null-bubble behavior
- [ ] BE lint/typecheck/test/build pass

**Depends on**: PR 12 (shared calculator and row shape).

---

## PR 14 · Studio economics review surface

**User flow** — A studio admin or manager opens `/studios/:id/finance/economics`. They pick a date range and a perspective (show / schedule / client) and see the rollup rows from PR 13. Filters narrow the result. Each row shows resolved totals, unresolved reasons, and warnings; the page makes clear what's planned-fallback vs operator-record vs unresolved. Export uses the same page-local pattern from PR 1 / PR 2 — download the visible table as CSV or JSON.

This is the manager review surface for cross-perspective reporting that doesn't fit on a single operational page.

**UX target**
- Sidebar Finance group lands here for the first time
- Date range, perspective selector, filter sidebar
- Renderer matches per-row summaries from PR 5 / PR 8 (single shape across surfaces)
- Loading, empty, and partial-result states explicit
- Export downloads visible rows
- "What you're looking at" header copy clarifies that figures are reference values, not payments

**Scope**
- FE: new route + feature `apps/erify_studios/src/features/studio-economics-review/`. Sidebar Finance group placement.
- Reuses the export pattern from PR 1 / PR 2.

**Out of scope**
- Saved report definitions, scheduled exports, server-side report files
- Cross-studio aggregation (admin-only via `/admin/...` — not Phase 4)

**Acceptance**
- [ ] Studio admin can review date-ranged economics with the perspective selector
- [ ] Unresolved and planned-fallback rows render with explicit copy
- [ ] Export downloads the visible rows; CSV includes column headers
- [ ] Sidebar Finance group present alongside this route
- [ ] FE lint/typecheck/test/build pass

**Depends on**: PR 13 (rollup endpoint).

---

## PR 15 · Strict-mode creator availability with conflict metadata

**User flow** — A talent manager assigns a creator to a show via creator mapping. Today the availability list returns creators broadly without enforcing roster membership or time-overlap conflicts — the manager can assign a creator who's already booked elsewhere, or a creator who's inactive in the studio roster, with no in-UI warning. After this PR: `GET /studios/:id/creators/availability?strict=true` returns the same list with `is_conflicted` and `conflict_reason` per creator. The assignment endpoint refuses conflicting writes with a distinct error code (not generic 403). The creator-mapping UI calls strict mode and surfaces conflict metadata so the manager makes an informed decision.

Independent of Wave 2; can ship in parallel with anything above.

**UX target**
- Strict mode opt-in via query param; default behavior unchanged for backward compatibility
- Conflict reasons: `OVERLAPPING_ASSIGNMENT`, `INACTIVE_IN_ROSTER`, `NOT_IN_ROSTER`
- Picker shows conflicted creators with a visual marker (warning icon + tooltip with reason)
- Assignment write returns a code the FE can distinguish from a permission failure
- Existing design doc remains the source of truth: [BE](../../apps/erify_api/docs/design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) · [FE](../../apps/erify_studios/docs/design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md)

**Scope**
- BE: add `strict` query param to `GET /studios/:studioId/creators/availability`. When set, response includes `is_conflicted` and `conflict_reason`. Assignment endpoint rejects conflicts with a distinct error code.
- Contract: response addition for strict mode.
- FE: creator-mapping picker calls strict mode and surfaces conflict metadata.

**Out of scope**
- Replacing the loose default — the loose mode is intentional for broad discovery
- Cross-studio conflict detection (creators can be assigned across studios; only intra-studio overlaps are conflicts)

**Acceptance**
- [ ] `strict=false` (default) preserves current loose-discovery response
- [ ] `strict=true` returns conflict metadata for overlapping or inactive creators
- [ ] Assignment endpoint rejects conflicts with a code distinguishable from 403
- [ ] Creator-mapping picker surfaces conflicts in strict mode
- [ ] BE + FE lint/typecheck/test/build pass

**Depends on**: nothing.

---

## Out of scope (post-Phase-4 / Phase 5)

Each item below has an extension sketch in cost-model §4. Listed here for re-orientation only:

- Revenue (P-side), commission resolution, contribution margin (`pnl-revenue-workflow.md` relocated to `docs/prd/future/`)
- Settlement, freeze, grace tolerance, payment processing, bank-statement reconciliation
- Recipient acknowledgement, dispute, recipient-initiated adjustments
- Notifications when manager edits actuals
- Standing / schedule-scoped / global / recurring / HR line items
- `ShowCreator` and `ShowPlatform` actual columns (extension points, dormant in Phase 4)
- Advanced compensation rule engine
- Platform / creator-app / punch-clock actuals sources

## Definition of Done

Phase 4 closes when every PR above is shipped and the Sidebar Finance group lands with PR 14. Phase 4 explicitly does **not** process payments — every figure produced is a read-only reference value. Admin and manager surfaces may show planned-fallback with warnings; recipient self-views hide money for any event with missing or incomplete actuals.

Scenario-based DoD (one bullet per shipped journey moment):

- [ ] Admin reviews shift records and cost on `/shifts` over a unified date range and exports the view (PRs 1, 3)
- [ ] Manager reviews show operations over a unified date range and exports the view (PR 2)
- [ ] Manager corrects a creator's compensation terms on one show; audit trail records the change (PR 4)
- [ ] Manager reviews one creator's shows across a date range and bulk-edits terms (PR 5)
- [ ] Manager records show actuals on the show edit form (PR 6)
- [ ] Manager finds and resolves missing actuals from a queue (PR 7)
- [ ] Manager reviews one member's shifts across a date range with actuals-fallback labeling (PR 8)
- [ ] Admin edits a roster default rate and sees the inline notice that existing snapshots are unchanged (PR 9)
- [ ] Creator flags missing actuals from their self-view; manager queue shows the flag (PR 10)
- [ ] Creator and member self-views show pending vs resolved compensation correctly (PR 11)
- [ ] Show detail drill-in shows the breakdown without local arithmetic (PR 12)
- [ ] Studio admin reviews date-ranged economics by perspective and exports the result (PRs 13, 14)
- [ ] Creator-mapping prevents overlapping or off-roster assignments in strict mode (PR 15)

## Verification gates per PR

```
pnpm --filter erify_api  lint && pnpm --filter erify_api  typecheck && pnpm --filter erify_api  test && pnpm --filter erify_api  build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```

App-local design docs land alongside the implementation PR only when a PR introduces a novel pattern. PRs that replicate a shipped shape do not require a separate design doc.
