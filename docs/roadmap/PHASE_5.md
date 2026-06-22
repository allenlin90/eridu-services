# Phase 5: Show Production Lifecycle Gap Closure

> **Status**: 🚧 In progress — lifecycle surface scope reconciled; state-independent operational fixes first
> **Planning stance**: Fill operational gaps in the existing show production lifecycle before expanding into larger new domains. Operational record export waits until import, correction, issue ownership, and post-production completion review records are stable. The lifecycle model, entity map, and state-gate detail live in the [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill.

**Quick links**

- **Lifecycle model** (read first): [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — state machine, entity relationships, readiness conditions, and operating roles
- **State-gate detail**: [`references/state-gates.md`](../../.agent/skills/show-production-lifecycle/references/state-gates.md) — full condition inventory per transition
- **Phase 4**: [PHASE_4.md](./PHASE_4.md) — upstream phase (P&L Visibility & Creator Operations)
- **Phase 6 deferrals**: [PHASE_6.md](./PHASE_6.md) — Tracks A/B/C + Phase 4/5 deferrals

## Goal

Build a clear show lifecycle contract that explains what must be ready, who owns each step, what can be flexible by studio policy, and what happens when a show cannot continue normally. Phase 5 starts with **creator roster intake clarification, status vocabulary alignment, cancellation resolution, scheduling consistency, import/correction records, issue ownership, and advisory readiness/completion review**. Lifecycle state enforcement follows once current feature surfaces fit the lifecycle model and the advisory readiness/completion contracts are stable. Broader operational record export is deferred until the imported/corrected/issue-backed operational record is stable enough to export without immediate rework.

## Workstream Items

Each row is one workstream or deliverable. Rows are ordered top-to-bottom as execution order; rows with `—` in **Depends on** can ship in parallel. Items marked **Candidate** are promoted into active scope only if they become blocking during Phase 5 implementation.

### Ready Pickup (State-Independent / Advisory)

| #   | Workstream                                                                                                                                                                         | Depends on | Status    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| 1   | [Current feature lifecycle alignment](#1-current-feature-lifecycle-alignment) — scope gate that locks the Phase 5 surface decisions and refined workstream list                    | —          | ✅ Done       |
| 2   | [Creator roster onboarding and intake clarification](#2-creator-roster-onboarding-and-intake-clarification) — clarify `/creators` intake for add, reactivate, and create-new-to-roster | —          | ✅ Done       |
| 3   | [Show status vocabulary alignment](#3-show-status-vocabulary-alignment) — align lifecycle status records, seed data, docs, and role vocabulary                                     | —          | ✅ Done       |
| 4   | [Cancel show with resolution workflow](#4-cancel-show-with-resolution-workflow) — guided cancellation into resolution workflow from non-draft, non-pending shows                   | 3          | 🔲 Planned    |
| 5   | [Schedule-change task reconciliation](#5-schedule-change-task-reconciliation) — update eligible generated task due dates when show timing changes                                  | —          | 🔲 Planned    |
| 6   | [Import platform performance data](#6-import-platform-performance-data) — controlled manual export/upload flow before platform API integration                                     | —          | 🔲 Planned    |
| 7   | [Show performance correction](#7-show-performance-correction) — managers can correct missing/inaccurate imported or extracted metrics with audit reason                            | 6          | 🔲 Planned    |
| 8   | [Show-level issue ownership](#8-show-level-issue-ownership) — narrow issue record for show blockers and extraction-detected anomalies without state-gate enforcement               | —          | 🔲 Planned    |
| 9   | [Advisory planning readiness checklist](#9-advisory-planning-readiness-checklist) — aggregate current planning readiness signals without enforcing a status transition             | 1, 2       | 🔲 Planned    |
| 10  | [Post-production completion review checklist](#10-post-production-completion-review-checklist) — show-level closure review over task, actual, import, correction, and issue records | 6, 7, 8    | 🔲 Planned    |

### Operational Efficiency (Candidates)

| #   | Workstream                                                                                                                                         | Depends on | Status      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- |
| 11  | [Bulk show detail editing](#11-bulk-show-detail-editing) — bulk edit planning fields from studio show list after readiness fields settle           | 9          | 🔲 Candidate |
| 12  | [Bulk room assignment](#12-bulk-room-assignment) — dedicated bulk room assignment flow                                                             | 9          | 🔲 Candidate |
| 13  | [Issue-event notifications](#13-issue-event-notifications) — notifications for issue open/severity-change events, independent of state transitions | 8          | 🔲 Candidate |

### Blocked State / Lifecycle Enforcement

| #   | Workstream                                                                                                                                                                          | Depends on | Status    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| 14  | [Show lifecycle state machine](#14-show-lifecycle-state-machine) — manager-driven `draft → confirmed → live → completed` and cancellation transitions with server validation        | 3, 9, 10   | ⏸ Blocked |
| 15  | [Lifecycle state-gate enforcement](#15-lifecycle-state-gate-enforcement) — apply readiness/completion checks as warning/block transition rules                                      | 14         | ⏸ Blocked |
| 16  | [Readiness and live control dashboard](#16-readiness-and-live-control-dashboard) — unified manager view for planning readiness, live readiness, live-state transition, and blockers | 8, 14, 15  | ⏸ Blocked |
| 17  | [State-transition notifications](#17-state-transition-notifications) — notification rules tied to show state, stakeholder role, and issue severity                                  | 8, 14      | ⏸ Blocked |

### Deferred Review / Export

| #   | Workstream                                                                                                                                                   | Depends on | Status     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------- |
| 18  | [Operational record export](#18-operational-record-export) — extend task reports into a post-production operational record export across reviewed show facts | 6, 7, 8, 10 | ⏭ Deferred |

### How to use this list

- **Pick up**: write a 1-3 sentence brief in the section below; flip status to `🚧 In progress`.
- **Wrap up (before merge)**: flip status to `✅`, replace the brief with the PR link, and update any other docs the PR's outcome affects. Land docs atomically with the code; prefer squash-merge.
- **Promote candidate**: move from `🔲 Candidate` to `🔲 Planned` when the item becomes blocking.
- **Unblock state work**: move from `⏸ Blocked` only after creator roster intake, advisory readiness/completion contracts, and status vocabulary are aligned, and the workstream's state dependency is still valid.
- **Promote deferred export**: move from `⏭ Deferred` only after import, correction, issue, and completion-review records are stable enough that the export contract will not need immediate rework.

---

## Workstream Briefs

### 1. Current feature lifecycle alignment

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases; [`doc-hygiene`](../../.agent/skills/doc-hygiene/SKILL.md) skill

**Completion result**: Phase 5 scope is locked around lifecycle gap closure in the current show production implementation. Existing surfaces are extended where they already own the workflow; new workstreams are reserved for missing operational records, advisory checklists, and eventual state enforcement.

**Scope rule**: every lifecycle-phase gap first checks the closest existing feature for that phase. Reorganizing, widening, or adding columns/sources to an existing feature counts as closing the gap when the feature already owns the user workflow.

**Lifecycle surface gap matrix**

| Surface                                              | Current implementation signal                                                                                                                                      | Phase 5 call                                                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Show planning & task setup (`/shows`, `/task-setup`) | Studio show CRUD, task generation/assignment, needs-attention filtering, and current-view show export exist.                                                       | Extend existing: add status vocabulary alignment, advisory planning readiness, schedule-change task reconciliation, and local export columns in place.                         |
| Creator roster (`/creators`)                         | Studio roster management, reactivation, default compensation, and brand-new creator onboarding exist, but the intake path needs clearer operational wording and sequence. | Extend existing: preserve brand-new creator creation into studio roster scope, clarify add/reactivate/create choices, and keep duplicate prevention explicit before readiness depends on creator assignment. |
| Creator mapping (`/creator-mapping`)                 | Bulk creator assignment, roster gating, per-show compensation context, and creator-mapping export exist.                                                           | Extend existing: keep creator assignment as its own operational flow and readiness input; do not create a parallel mapping surface. Creator mapping relies on the roster intake path being understandable. |
| Task review (`/task-review`)                         | Submitted task approval and exception surfacing write structured facts through extraction.                                                                         | Extend existing: keep approval/rejection review here; connect anomalies into issue ownership instead of creating a second task-review workflow.                                |
| Show run review (`/show-run-review`)                 | Daily exception review, active platform violations, attendance gaps, phase checks, and per-tab CSV exports exist.                                                  | Extend existing: add import/correction/issue context to review tabs as those records land.                                                                                     |
| Task reports (`/task-reports`)                       | Report builder, saved definitions, source discovery, run, view filters, and CSV export exist; platform performance aggregates already project from `ShowPlatform`. | Extend existing for item 18: widen the source catalog to show/creator/platform/violation/correction/import/issue facts instead of building a separate generic export pipeline. |
| Performance (`/performance`)                         | Read-only analytics over `ShowPlatform` metrics and show detail loop metrics exist.                                                                                | Extend existing for imports/corrections; keep finance semantics out.                                                                                                           |
| Costs (`/costs`)                                     | Read-only cost reference dashboard over show/shift cost calculators exists.                                                                                        | No Phase 5 expansion beyond reading lifecycle actuals; revenue/commission semantics stay Phase 6.                                                                              |
| Shifts (`/shifts`)                                   | Shift CRUD, duty-manager flag, shift detail routes, compensation, and shift export exist.                                                                          | Keep as the staffing record and readiness input; do not merge staffing export into the show operational record export.                                                         |

**Ideation disposition**

- Promoted into the active Phase 5 list: existing creator roster/onboarding scope where it governs `/creators` intake (item 2), `schedule-publish-task-due-date-reconciliation.md` (item 5), `late-material-edit-audit-policy.md` where it informs correction/issue reason capture (items 7 and 8), and the issue-event boundary from `show-change-notification-audit-ledger.md` as a candidate (item 13).
- Kept as dependency context rather than active work: `studio-config-settings.md` for state-gate enforcement levels and studio-timezone configuration; it remains out of scope until state enforcement or studio settings becomes a selected workstream.
- Kept deferred: task report batching/analytics summaries, performance re-backfill, shift optimistic versioning, lookup bundle scalability, show-platform batch restore, and broad collaboration topics. These are useful adjacent extensions but do not close the core Phase 5 lifecycle gaps.

### 2. Creator roster onboarding and intake clarification

**Source**: [`studio-creator-onboarding.md`](../features/studio-creator-onboarding.md), [`studio-creator-roster.md`](../features/studio-creator-roster.md), [`creator-mapping.md`](../features/creator-mapping.md)

**Completion result**: PR [#225](https://github.com/allenlin90/eridu-services/pull/225) keeps `/studios/:studioId/creators` as the studio-owned creator intake surface and makes **Add Creator** the single entry point for Admin, Manager, and Talent Manager roster managers. The dialog opens on catalog search and exposes explicit outcomes: add an existing global creator to the studio roster, reactivate an inactive roster row, or directly create a new global creator and add it to this studio roster.

**Acceptance closure**:

- Brand-new creator onboarding is preserved through the create mode; the flow collects name, alias, creator type (`STANDARD`, `FLEXIBLE`, or `OTHER`), optional user link, and studio compensation defaults, then creates a global `Creator` plus an active `StudioCreator` row.
- Existing creator and inactive roster outcomes are labeled directly in the picker, so roster managers can distinguish add vs. reactivate before submitting.
- Active rostered creators surface as a non-actionable "Already active in this studio" match in Add Creator instead of being filtered out of catalog results, while inactive roster rows remain available for reactivation.
- The create-new action is available immediately from the dialog while catalog search remains the default first view for duplicate-prevention intent.
- Creator mapping remains the show-assignment surface and continues to direct missing-roster cases back to `/creators`.

### 3. Show status vocabulary alignment

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle State Machine, Operating Roles

Align the lookup-backed show status vocabulary across seed data, `BUSINESS.md`, and studio-facing docs so `DRAFT`, `CONFIRMED`, `LIVE`, `COMPLETED`, `CANCELLED`, and `CANCELLED_PENDING_RESOLUTION` are all first-class lifecycle statuses. Keep role scope aligned to the actual `STUDIO_ROLE` enum; do not introduce granular planning/onset roles as platform roles in Phase 5.

### 4. Cancel show with resolution workflow

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §4; [`late-material-edit-audit-policy.md`](../ideation/late-material-edit-audit-policy.md)

Allow managers to cancel a show into `cancelled_pending_resolution` without requiring the full lifecycle state machine. This action is available for non-draft shows that are not already pending resolution, so production, post-production, or other active downstream consequences can be captured for follow-up. Capture reason category, resolution owner, follow-up fields, and final disposition (`cancelled` or `completed`) as operational records for review and later export; do not hard-code a broader transition graph in this workstream.

### 5. Schedule-change task reconciliation

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1; [`schedule-publish-task-due-date-reconciliation.md`](../ideation/schedule-publish-task-due-date-reconciliation.md)

When show timing changes through schedule publish or manager edit, generated task due dates should be reconciled to reflect the new timing. The first version applies to generated, non-terminal show-linked tasks whose due date still matches the old derived formula, so manual due-date overrides are preserved.

### 6. Import platform performance data

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

Start with a controlled manual export/upload flow (CSV or spreadsheet) for importing platform-source performance data (GMV, views, CTR, CTO) before considering platform API integration. Keep financial revenue semantics separate (deferred to Phase 6). Imported platform data supports business comparison against operator-submitted facts and later post-production review.

### 7. Show performance correction

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3; [`late-material-edit-audit-policy.md`](../ideation/late-material-edit-audit-policy.md)

Allow managers to directly correct missing or inaccurate performance metrics (GMV, views, CTR, CTO) with a business reason. Corrections should create audit records and follow the existing `MANAGER` priority level in the extraction pipeline's priority resolver. Corrections can feed review surfaces and later export without requiring lifecycle-state enforcement.

### 8. Show-level issue ownership

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2; [`late-material-edit-audit-policy.md`](../ideation/late-material-edit-audit-policy.md)

Define a narrow show-level issue record (or task-like workflow) that traces blockers: missing creator, equipment dysfunction, utility outage, platform violations, and post-production follow-up. Each issue has an owner, due date, severity, evidence, status, escalation path, and resolution record. In this pickup phase, issues are operational records for review and later export; they do not drive state transitions until the state machine is unblocked.

**Issue sourcing must include automated/audit-detected anomalies, not just manually filed ones.** Today the fact-extraction pipeline already writes `ShowPlatformViolation[]` rows, `attendanceMissing`/`attendanceReason`, and missing-performance-fact gaps across every lifecycle phase (pre-production through post-production) — but these land as silent data with no connection to an issue record; a manager only sees them by actively opening `/task-review` or `/show-run-review`. This item's issue record should be the landing point for those extraction-detected anomalies (in addition to manually opened issues), so "audit flagged a problem" and "someone filed a problem" produce the same kind of trackable record. Notification on open/severity-change is item 13's scope, not this item's — but the record this item defines is what item 13 fires off of.

### 9. Advisory planning readiness checklist

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1, Readiness Conditions; [`references/state-gates.md`](../../.agent/skills/show-production-lifecycle/references/state-gates.md)

Aggregate existing planning signals into one advisory checklist for the current planning surfaces: room assigned, creators assigned from a reliable roster intake path, platforms assigned, required task stages generated, and required tasks assigned to operators. This extends `/task-setup` and show detail/list readiness; it does not create a transition gate or new data model.

### 10. Post-production completion review checklist

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3; [`operations-review-surface`](../../.agent/skills/operations-review-surface/SKILL.md) skill

Define a show-level post-production checklist for review, reporting, and later export: closure tasks submitted/approved, actual end present, creator attendance finalized, platform performance facts present, correction/import review status, and unresolved issue status. This is a read-only completion review until item 14 and item 15 unblock lifecycle state enforcement.

### 11. Bulk show detail editing

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1

**Candidate** — promote after item 9 identifies which planning fields remain valid lifecycle inputs. Allow managers to bulk edit planning fields from the studio show list, similar to how task setup handles bulk task generation. Status changes stay out of scope until state-machine work is unblocked.

### 12. Bulk room assignment

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1

**Candidate** — promote if room assignment remains a repeated planning bottleneck after lifecycle alignment. Provide a bulk flow for room assignment similar to task generation or creator mapping.

### 13. Issue-event notifications

**Source**: [`show-change-notification-audit-ledger.md`](../ideation/show-change-notification-audit-ledger.md); [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

**Candidate** — promote after item 8 lands if issue opens, extraction-detected anomalies, or issue severity changes need stakeholder notification before the full lifecycle state machine exists. This work uses the issue record as its trigger source and stays separate from state-transition notifications.

### 14. Show lifecycle state machine

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle State Machine

**Blocked** — implement after creator roster intake, status vocabulary, advisory planning readiness, and advisory completion review contracts are stable. This work adds manager-driven lifecycle transition APIs and server-side transition validation for `draft → confirmed → live → completed`, plus `cancelled` and `cancelled_pending_resolution` paths. State gates remain separate in item 15.

### 15. Lifecycle state-gate enforcement

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle State Machine; [`studio-config-settings.md`](../ideation/studio-config-settings.md)

**Blocked** — depends on item 14. Apply planning readiness and post-production completion checks to lifecycle transitions using enforcement levels (`off`, `warning`, `block`). Keep the broader studio settings system deferred unless this workstream explicitly needs configurable enforcement in the first delivery.

### 16. Readiness and live control dashboard

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

**Blocked** — depends on state-backed readiness and completion flows. Unified manager view that consolidates planning readiness, live readiness, live-state transition controls, and production blockers. Decide whether this is one dashboard or separate planning/on-air views backed by the same lifecycle conditions. The existing `/studios/:studioId/dashboard` route is the extension point.

### 17. State-transition notifications

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

**Blocked** — promote only after state machine, issue severity model, stakeholder list, channels, recipients, and timing rules are defined. Draft changes should remain quiet, confirmed-show changes should notify stakeholders, and near/on-air changes may need escalation based on issue severity and reason.

**Boundary**: issue-event notifications are item 13. This item is only for lifecycle state transitions.

### 18. Operational record export

**Source**: [`operations-review-surface`](../../.agent/skills/operations-review-surface/SKILL.md) skill — Per-tab export; [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

**Deferred** — promote after import, correction, issue ownership, and completion review records settle. This extends the existing `task-reports` builder/source catalog rather than creating a new generic report pipeline. The export should cover the reviewed operational record for a show, operational day, or date range: task submissions, review status, extracted show/creator/platform facts, attendance outcomes, platform metrics, platform violations, manager corrections, import provenance, and issue/resolution context where available.

Feature-specific exports remain focused: planning, task setup, creator mapping, shifts, and show-run-review tabs keep their own current-view exports for local workflow. Operational record export is the broader post-production review package and is not a lifecycle gate or financial revenue export.

---

## Out of Scope (→ Phase 6)

Items explicitly deferred from Phase 5 lifecycle gap closure. See [PHASE_6.md](./PHASE_6.md) for full tracking.

| Item                                                    | Reason                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Granular role and module access (RBAC decomposition)    | Requires broad redesign; current MANAGER access is sufficient for lifecycle workflows    |
| Client operations portal                                | New domain foundation; not required by show lifecycle                                    |
| Revenue P&L, commission resolution, contribution margin | Financial revenue semantics; lifecycle produces operational facts, not financial figures |
| Inventory and material management                       | New domain models; not required by show lifecycle                                        |
| Full collaboration (comments, @mentions)                | Show-level issue ownership (item 8) is the smaller Phase 5 slice                         |
| Creator/member availability management                  | Managers handle availability outside the system for Phase 5                              |
| Studio operating rules configuration system             | Phase 5 identifies rule conditions; enforcement toggles need separate design             |
| Monthly operations close workflow                       | Defer unless show-level completion gates cannot support monthly close                    |

## Definition of Done

Phase 5 closes when every `🔲 Planned` row in the workstream table is `✅` and all promoted candidates are resolved. Deferred rows can remain deferred if the lifecycle and post-production review landscape is not stable enough to define a durable export contract. The `show-production-lifecycle` skill remains the lifecycle source of truth; this phase doc tracks implementation status only.

Blocked rows must either be unblocked and completed or explicitly deferred before Phase 5 closes.

## Verification gates per workstream

```
pnpm --filter erify_api    lint && pnpm --filter erify_api    typecheck && pnpm --filter erify_api    test && pnpm --filter erify_api    build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```

Doc-only status or business-reference work requires no code verification — validate cross-references and content accuracy manually.
