# Phase 5: Show Production Lifecycle Gap Closure

> **Status**: 🚧 In progress — lifecycle surface scope reconciled; state-independent operational fixes first; state-machine sequencing revised and items renumbered into execution order (July 2026 review)
> **Planning stance**: Fill operational gaps in the existing show production lifecycle before expanding into larger new domains. The lifecycle state machine (item 18) is scoped as **status write-path consolidation** and is deliberately sequenced last; it must never block the current operational workflow — transitions carry minimal intrinsic requirements, readiness conditions stay advisory, and hard enforcement configuration is deferred to the [`studio-config-settings`](../ideation/studio-config-settings.md) ideation. Operational record export waits until import, correction, issue ownership, and post-production completion review records are stable. The lifecycle model, entity map, and state-gate detail live in the [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill.

**Quick links**

- **Lifecycle model** (read first): [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — state machine, entity relationships, readiness conditions, and operating roles
- **State-gate detail**: [`references/state-gates.md`](../../.agents/skills/show-production-lifecycle/references/state-gates.md) — full condition inventory per transition
- **Phase 4**: [PHASE_4.md](./PHASE_4.md) — upstream phase (P&L Visibility & Creator Operations)
- **Phase 6 deferrals**: [PHASE_6.md](./PHASE_6.md) — Tracks A/B/C + Phase 4/5 deferrals

## Goal

Build a clear show lifecycle contract that explains what must be ready, who owns each step, what can be flexible by studio policy, and what happens when a show cannot continue normally. Phase 5 starts with **creator roster intake clarification, status vocabulary alignment, cancellation resolution, scheduling consistency, performance correction, issue ownership, platform performance import, and advisory readiness/completion review**.

The show lifecycle state machine (item 18) is the **single canonical show-status transition mechanism**: it consolidates today's four parallel status write paths (studio generic edit, admin generic edit, cancellation gate, schedule publish) behind one validated, audited transition service. It is sequenced last and designed to be **non-blocking**: association records regularly complete late in real operations — creator mapping often lands after the point a manager needs to move a show forward — so transitions require only a valid graph edge, a permitted role, and a reason where the transition class demands one, never data completeness. Readiness and completion conditions (items 11/12) surface as advisory warnings at transition time; warning/block *enforcement* (item 19) follows once those contracts are stable, ships warning-only by default, and defers per-studio block configuration to the [`studio-config-settings`](../ideation/studio-config-settings.md) ideation. Broader operational record export is deferred until performance facts, import provenance, correction records, and issue-backed review records are stable enough to export without immediate rework.

## Workstream Items

Each row is one workstream or deliverable. Items are numbered in execution order: delivered work first, in-flight and ready pickup next, candidates and the deferred export after, and lifecycle state-machine work last. Rows with `—` in **Depends on** can ship in parallel. Items marked **Candidate** are promoted into active scope only if they become blocking during Phase 5 implementation.

> **Renumbering note (July 2026)**: items were renumbered into execution order. Old → new: 6→10, 7→6, 8→9, 9→11, 10→12, 11→13, 12→14, 13→15, 14→18, 15→19, 16→20, 17→21, 18→17, 19→7, 20→8, 21→16 (items 1–5 unchanged). Merged PRs and older docs may reference the old numbers.

### Delivered

| #   | Workstream                                                                                                                                                                             | Depends on | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1   | [Current feature lifecycle alignment](#1-current-feature-lifecycle-alignment) — scope gate that locks the Phase 5 surface decisions and refined workstream list                        | —          | ✅ Done |
| 2   | [Creator roster onboarding and intake clarification](#2-creator-roster-onboarding-and-intake-clarification) — clarify `/creators` intake for add, reactivate, and create-new-to-roster | —          | ✅ Done |
| 3   | [Show status vocabulary alignment](#3-show-status-vocabulary-alignment) — align lifecycle status records, seed data, docs, and role vocabulary                                         | —          | ✅ Done |
| 4   | [Cancel show with resolution workflow](#4-cancel-show-with-resolution-workflow) — guided cancellation and pending-resolution sign-off from show detail and duty-manager dashboard      | 3          | ✅ Done |
| 5   | [Schedule-change task reconciliation](#5-schedule-change-task-reconciliation) — update eligible generated task due dates when show timing changes                                      | —          | ✅ Done |
| 6   | [Show performance correction](#6-show-performance-correction) — managers can correct missing/inaccurate performance metrics from any source with audit reason                          | —          | ✅ Done |

### Ready Pickup (State-Independent / Advisory)

| #   | Workstream                                                                                                                                                                                                 | Depends on                                | Status         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | -------------- |
| 7   | [Schedule publish impact review enhancements](#7-schedule-publish-impact-review-enhancements) — filters, persisted publish-run batches, and scoped past-show creator-mapping backfill for `/schedule-publish-impacts` | — (informational: 4, 9, 11/19 — see brief) | ✅ Done |
| 8   | [Show status write-path hardening](#8-show-status-write-path-hardening) — close the admin show-edit status bypass so gate-owned statuses cannot move outside the cancellation gate                         | —                                         | 🔲 Planned     |
| 9   | [Show-level issue ownership](#9-show-level-issue-ownership) — narrow issue record for show blockers and extraction-detected anomalies without state-gate enforcement                                       | —                                         | 📐 Ready       |
| 10  | [Import platform performance data](#10-import-platform-performance-data) — controlled manual export/upload flow before platform API integration; design doc first                                          | —                                         | 🔲 Planned     |
| 11  | [Advisory planning readiness checklist](#11-advisory-planning-readiness-checklist) — aggregate current planning readiness signals without enforcing a status transition                                    | 1, 2                                      | 🔲 Planned     |
| 12  | [Post-production completion review checklist](#12-post-production-completion-review-checklist) — show-level closure review over task, actual, import, correction, and issue records                        | 6, 9, 10                                  | 🔲 Planned     |

### Operational Efficiency (Candidates)

| #   | Workstream                                                                                                                                                                                        | Depends on | Status       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| 13  | [Bulk show detail editing](#13-bulk-show-detail-editing) — bulk edit planning fields from studio show list after readiness fields settle                                                          | 11         | 🔲 Candidate |
| 14  | [Bulk room assignment](#14-bulk-room-assignment) — dedicated bulk room assignment flow                                                                                                            | 11         | 🔲 Candidate |
| 15  | [Issue-event notifications](#15-issue-event-notifications) — notifications for issue open/severity-change events, independent of state transitions                                               | 9          | 🔲 Candidate |
| 16  | [Cross-surface navigation continuity](#16-cross-surface-navigation-continuity) — contextual links across the manager's end-to-end flow (publish impacts → creator mapping → task setup → task review → show run review) | —          | 🔲 Candidate |

### Deferred Review / Export

| #   | Workstream                                                                                                                                                       | Depends on   | Status     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ---------- |
| 17  | [Operational record export](#17-operational-record-export) — extend task reports into a post-production operational record export across reviewed show facts    | 6, 9, 10, 12 | ⏭ Deferred |

### Lifecycle State Machine (Sequenced Last)

| #   | Workstream                                                                                                                                                                          | Depends on                    | Status     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------- |
| 18  | [Show lifecycle state machine](#18-show-lifecycle-state-machine) — the single canonical, audited, **non-blocking** show-status transition mechanism; consolidates all existing status write paths | 3, 8                          | 🔲 Planned |
| 19  | [Lifecycle state-gate enforcement](#19-lifecycle-state-gate-enforcement) — surface the shared readiness/completion condition contract as advisory transition warnings; block levels deferred to studio configuration | 11, 12, 18                    | ⏸ Blocked  |
| 20  | [Readiness and live control dashboard](#20-readiness-and-live-control-dashboard) — 20a advisory manager view (readiness, issues, transition controls); 20b enforcement affordances  | 20a: 9, 11, 12, 18 · 20b: 19 | ⏸ Blocked  |
| 21  | [State-transition notifications](#21-state-transition-notifications) — notification rules tied to show state, stakeholder role, and issue severity                                  | 9, 18                         | ⏸ Blocked  |

### How to use this list

- **Pick up**: write a 1-3 sentence brief in the section below; flip status to `🚧 In progress`.
- **Wrap up (before merge)**: flip status to `✅`, replace the brief with the PR link, and update any other docs the PR's outcome affects. Land docs atomically with the code; prefer squash-merge.
- **Promote candidate**: move from `🔲 Candidate` to `🔲 Planned` when the item becomes blocking.
- **State-machine work**: item 18 is planned and gated only on item 8 (write-path hardening); it is sequenced last by choice, and its non-blocking contract means starting it earlier cannot freeze current workflows if capacity allows. Items 19–21 move from `⏸ Blocked` when their listed dependencies land; item 20a needs only advisory inputs (9, 11, 12, 18), while 20b waits for item 19.
- **Promote deferred export**: move from `⏭ Deferred` only after import, correction, issue, and completion-review records are stable enough that the export contract will not need immediate rework.

---

## Workstream Briefs

### 1. Current feature lifecycle alignment

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases; [`doc-hygiene`](../../.agents/skills/doc-hygiene/SKILL.md) skill

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
| Task reports (`/task-reports`)                       | Report builder, saved definitions, source discovery, run, view filters, and CSV export exist; platform performance aggregates already project from `ShowPlatform`. | Extend existing for item 17: widen the source catalog to show/creator/platform/violation/correction/import/issue facts instead of building a separate generic export pipeline. |
| Performance (`/performance`)                         | Read-only analytics over `ShowPlatform` metrics and show detail loop metrics exist.                                                                                | Extend existing for imports/corrections; keep finance semantics out.                                                                                                           |
| Costs (`/costs`)                                     | Read-only cost reference dashboard over show/shift cost calculators exists.                                                                                        | No Phase 5 expansion beyond reading lifecycle actuals; revenue/commission semantics stay Phase 6.                                                                              |
| Shifts (`/shifts`)                                   | Shift CRUD, duty-manager flag, shift detail routes, compensation, and shift export exist.                                                                          | Keep as the staffing record and readiness input; do not merge staffing export into the show operational record export.                                                         |

**Ideation disposition**

- Promoted into the active Phase 5 list: existing creator roster/onboarding scope where it governs `/creators` intake (item 2), `schedule-publish-task-due-date-reconciliation.md` (item 5), `late-material-edit-audit-policy.md` where it informs correction/issue reason capture (items 6 and 9), and the issue-event policy from the [notification PRD](../prd/notification-system.md) as a candidate (item 15).
- Kept as dependency context rather than active work: `studio-config-settings.md` for state-gate enforcement levels and studio-timezone configuration; it remains out of scope until state enforcement or studio settings becomes a selected workstream. Item 19 explicitly defers per-studio block-level configuration there.
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

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle State Machine, Operating Roles

Align the lookup-backed show status vocabulary across seed data, `BUSINESS.md`, and studio-facing docs so `DRAFT`, `CONFIRMED`, `LIVE`, `COMPLETED`, `CANCELLED`, and `CANCELLED_PENDING_RESOLUTION` are all first-class lifecycle statuses. Keep role scope aligned to the actual `STUDIO_ROLE` enum; do not introduce granular planning/onset roles as platform roles in Phase 5.

### 4. Cancel show with resolution workflow

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §4; [`Show Cancellation Gate`](../../apps/erify_api/docs/SHOW_CANCELLATION_GATE.md); [`late-material-edit-audit-policy.md`](../ideation/late-material-edit-audit-policy.md)

**Completion result**: PR [#233](https://github.com/allenlin90/eridu-services/pull/233) ships the focused cancellation gate without enabling the full lifecycle state machine. Studio Admin/Manager users can cancel directly from show detail with reason category, reason note, and final outcome. Active Duty Managers can open `cancelled_pending_resolution` from the dashboard with a reason-only request, and Admin/Manager users can later sign off the final outcome (`cancelled` or `completed`).

**Acceptance closure**:

- Cancellation history is backed by `Audit` rows and remains readable from show detail and dashboard status surfaces after final resolution.
- The generic studio show-edit path no longer owns `cancelled` or `cancelled_pending_resolution` transitions; studio show-status lookups hide those gate-owned statuses.
- `cancelled` outcomes require zero active tasks, using the shared active-task definition that excludes deleted task targets, deleted tasks, and finalized task statuses (`COMPLETED`, `CLOSED`).
- Legacy shows already in `cancelled_pending_resolution` without a gate-opening audit row remain resolvable through the same `show_cancellation` gate.
- Broader follow-up ownership, notifications, comments, and full lifecycle transition enforcement remain outside this item.

**Deferred follow-up (June 2026)**: a follow-up PR (#236, split into #237–#240) built and reviewed three extensions on top of this gate — unifying schedule publish onto the gate primitive, a notification seam, and Duty Manager note amendment. All three were closed without merging: they reach into correctness-sensitive code or speculated on architecture ahead of the owning mechanisms. The audit-trail gaps are recorded as tech debt; the two transition designs remain ideation to revisit **inside item 18**, while the notification seam is superseded by the generic notification PRD and its cancellation-gate policy:

- [`schedule-publish-removal-no-audit.md`](../tech-debt/schedule-publish-removal-no-audit.md), [`schedule-publish-restore-no-audit.md`](../tech-debt/schedule-publish-restore-no-audit.md) — tech debt
- [`schedule-publish-gate-unification.md`](../ideation/schedule-publish-gate-unification.md), [`cancellation-gate-note-amendment.md`](../ideation/cancellation-gate-note-amendment.md) — transition ideation
- [Operational Notifications and PWA Push](../prd/notification-system.md) — notification event and delivery contract

### 5. Schedule-change task reconciliation

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1; `schedule-publish-task-due-date-reconciliation.md` (retired)

**Completion result**: PR [#243](https://github.com/allenlin90/eridu-services/pull/243) automatically recalculates and shifts the due dates of eligible, generated, non-terminal show-linked tasks when a show's start or end time changes. Manual due-date overrides are preserved.

### 6. Show performance correction

**Delivered**: PR #247 — `feat(shows): implement manager show performance correction`

`POST /studios/:studioId/shows/:id/platforms/:showPlatformUid/correct-performance` — restricted to `ADMIN` and `MANAGER`. Accepts GMV, viewer count, CTR, CTO (all optional; only changed values write), plus a required business reason. Sets `actuals_source` to `MANAGER` for each corrected metric, protecting it from subsequent lower-priority extraction overwrites. Creates an `OVERRIDE` audit record. The extraction pipeline `BasePlatformPerformanceExtractor` now checks source priority at read time AND atomically enforces it at write time via a `WHERE actuals_source <> 'MANAGER'` predicate, closing the TOCTOU gap. See [feature doc](../features/show-performance-analytics.md#performance-correction-phase-5).

### 7. Schedule publish impact review enhancements

**Source**: [`schedule-continuity-workflow`](../../.agents/skills/schedule-continuity-workflow/SKILL.md) skill; canonical behavior in [`SCHEDULE_CONTINUITY.md`](../../apps/erify_api/docs/SCHEDULE_CONTINUITY.md)

**Completion result**: PR [#310](https://github.com/allenlin90/eridu-services/pull/310) persists a `PublishRun` per publish call (source-tagged, summary counts, stamped onto every impact audit row via `Audit.publishRunId`), adds impact-kind/resolution-status/change-time/publish-run filters plus a server-side summary endpoint and a lean publish-runs list, and splits `/schedule-publish-impacts` into URL-synced Impacts/Runs tabs whose KPI cards read the summary endpoint. The fill-gap-only terminal-show creator-mapping backfill ships on the same `/validate`/`/publish` API: LIVE/COMPLETED shows with incoming `creators` and zero existing `ShowCreator` rows get their mappings created, recorded as `past_show_creator_backfilled` impacts; `/validate` surfaces the eligible count non-blockingly. Existing mappings are never overridden (no settlement/freeze guard exists); `ShowPlatform` backfill and historical `PublishRun` backfill remain deferred — see [`SCHEDULE_CONTINUITY.md`](../../apps/erify_api/docs/SCHEDULE_CONTINUITY.md) for the shipped contract.

### 8. Show status write-path hardening

**Source**: [`Show Cancellation Gate`](../../apps/erify_api/docs/SHOW_CANCELLATION_GATE.md); Phase 5 review (July 2026)

The admin show-update path (`updateShowWithAssignments` → `show.service.buildUpdatePayload`) accepts any `show_status_id` with no transition validation, while the studio edit path explicitly blocks entering or leaving `CANCELLED` and `CANCELLED_PENDING_RESOLUTION` precisely because a direct write "would skip the gate's active-task guard and Audit trail entirely." Any admin-role caller can currently move a show into or out of gate-owned statuses with no active-task check, no reason, and no audit row — a live bypass of the shipped item 4 contract.

Mirror the studio-level guard on the admin path (or extract it into a shared helper both endpoints call) and apply the same gate-owned-status exclusions to admin status lookups. This is a narrow, state-independent correctness fix: it neither needs nor prejudges item 18's design, and item 18's write-path consolidation builds on the shared guard.

### 9. Show-level issue ownership

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2; [`Show-Level Issue Ownership Design`](../../apps/erify_api/docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md); [`late-material-edit-audit-policy.md`](../ideation/late-material-edit-audit-policy.md)

Implement a dedicated `ShowIssue` operational record for creator attendance, equipment dysfunction, utility outage, platform violations, and post-production follow-up. Each issue has an owner, due date, severity, evidence, status, manual escalation state, optimistic version, and resolution record. Issues are advisory records for review and later export; they do not drive state transitions until items 18 and 19.

Automated sourcing is limited to facts that positively report an anomaly: active `ShowPlatformViolation` rows and `ShowCreator.attendanceMissing`. Reconciliation runs synchronously in the existing per-fact transaction so the fact, extraction audit, and required issue commit or roll back together. Source correction resolves the same issue identity; replay does not create duplicates. Missing performance is a derived absence rather than a fact-extraction event and remains item 12's policy decision.

The API uses one studio-scoped `/show-issues` collection with UID-only external identifiers and real database pagination. Show detail receives an Issues tab, while Show Run Review receives a lean unresolved count and lazy paginated Issues tab. Assignment, severity, escalation, resolution, reopening, and automated evidence changes use standard `Audit` history.

**Architecture boundary**: use explicit `ShowIssueWorkflowService` and `ShowIssueReconciliationService` orchestration, not a generic event bus or NestJS CQRS. The [notification PRD](../prd/notification-system.md) owns the durable event/outbox capability; item 15 activates the issue publisher after that foundation exists.

**Implementation readiness**: the data model, roles, route shape, automated identity/resolution rules, transaction boundary, read surfaces, performance contract, and deferrals are locked in the linked design. No product or architecture decision blocks implementation.

### 10. Import platform performance data

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

Start with a controlled manual export/upload flow (CSV or spreadsheet) for importing platform-source performance data (GMV, views, CTR, CTO) before considering platform API integration. Keep financial revenue semantics separate (deferred to Phase 6). Imported platform data feeds the same operational `ShowPlatform` performance facts as task extraction, adds external-system provenance, and supports business comparison against operator-submitted facts and later post-production review.

**Design doc first (July 2026 review)**: item 10 is the only remaining hard dependency of item 12 without a locked design — write the design doc (row-to-`ShowPlatform` matching, import provenance, review status, failure handling) before implementation, matching the rigor items 4, 6, 7, and 9 received. Item 10's design, not item 7's delivery, is the actual gate on item 12. The substrate already exists; reuse it rather than inventing new mechanics:

- `actuals_source = PLATFORM` (priority 3) is already reserved in the extraction source-priority ladder; imported writes slot below `MANAGER`, and item 6's write-time `WHERE actuals_source <> 'MANAGER'` predicate already protects manager corrections from being overwritten by imports.
- Item 7's `PublishRun` model is the structural precedent for an import batch/provenance record (an `ImportRun`-style batch unit with per-row audit provenance) instead of implicit audit clusters.
- Upload/parse precedents: the Google Sheets schedule publish flow and `@eridu/browser-upload`.

The design must define the "import review status" shape that item 12's completion checklist consumes.

### 11. Advisory planning readiness checklist

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1, Readiness Conditions; [`references/state-gates.md`](../../.agents/skills/show-production-lifecycle/references/state-gates.md)

Aggregate existing planning signals into one advisory checklist for the current planning surfaces: room assigned, creators assigned from a reliable roster intake path, platforms assigned, required task stages generated, and required tasks assigned to operators. This extends `/task-setup` and show detail/list readiness; it does not create a transition gate or new data model.

**Shared condition contract (July 2026 review)**: compute the checklist **server-side** behind one shared readiness-condition schema (lifecycle-phase discriminator plus `conditions[]` of key/label/status) that item 12 reuses for completion review and item 19 later maps to `off`/`warning`/`block` enforcement levels — one condition schema, one future enforcement engine. The existing client-side bucket composition (`show-readiness.utils.ts` / `ShowReadinessTriagePanel`) stays as display, but must not remain the authority: a client-computed result can never back item 19's server-authoritative gates, so extending the FE pattern here would be rework waiting to happen.

### 12. Post-production completion review checklist

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3; [`operations-review-surface`](../../.agents/skills/operations-review-surface/SKILL.md) skill

Define a show-level post-production checklist for review, reporting, and later export: closure tasks submitted/approved, actual end present, creator attendance finalized, platform performance facts present, correction/import review status, and unresolved issue status. This is a read-only completion review until item 19 applies it as advisory transition warnings.

This checklist emits the **same shared condition contract as item 11** (one schema across planning readiness and completion review, so item 19 builds one enforcement engine, not two adapters). Its "import review status" field cannot be finalized until item 10's design doc defines import provenance — the rest of the checklist can proceed and stage that field.

### 13. Bulk show detail editing

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1

**Candidate** — promote after item 11 identifies which planning fields remain valid lifecycle inputs. Allow managers to bulk edit planning fields from the studio show list, similar to how task setup handles bulk task generation. Status changes stay out of scope until state-machine work is picked up.

### 14. Bulk room assignment

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1

**Candidate** — promote if room assignment remains a repeated planning bottleneck after lifecycle alignment. Provide a bulk flow for room assignment similar to task generation or creator mapping.

### 15. Issue-event notifications

**Source**: [Operational Notifications and PWA Push](../prd/notification-system.md); [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

**Candidate** — promote after item 9 lands if issue opens, extraction-detected anomalies, or issue severity changes need stakeholder notification before the full lifecycle state machine exists. This work activates the PRD's show-issue policy through the shared event/recipient capability and stays separate from state-transition notifications.

### 16. Cross-surface navigation continuity

**Source**: Phase 5 review (July 2026); [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases "Current surfaces"

**Candidate** — the manager's real end-to-end flow spans `/schedule-publish-impacts` → `/shows` → `/creator-mapping` → `/task-setup` → `/task-review` → `/show-run-review` across disconnected sidebar routes; today only the publish-impact row → show detail link exists. Add lightweight contextual links between adjacent lifecycle surfaces (publish-impact rows onward to creator mapping / task setup with show context, task setup → task review, task review → show run review). These are small router-link PRs with no new backend contracts and can also ride as fast-follow polish on items that already touch those surfaces. Item 20a supersedes much of this; promote if navigation friction blocks daily operation before 20a lands.

### 17. Operational record export

**Source**: [`operations-review-surface`](../../.agents/skills/operations-review-surface/SKILL.md) skill — Per-tab export; [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

**Deferred** — promote after import, correction, issue ownership, and completion review records settle. This extends the existing `task-reports` builder/source catalog rather than creating a new generic report pipeline. The export should cover the reviewed operational record for a show, operational day, or date range: task submissions, review status, extracted show/creator/platform facts, attendance outcomes, platform metrics, platform violations, manager corrections, import provenance, and issue/resolution context where available.

Feature-specific exports remain focused: planning, task setup, creator mapping, shifts, and show-run-review tabs keep their own current-view exports for local workflow. Operational record export is the broader post-production review package and is not a lifecycle gate or financial revenue export.

### 18. Show lifecycle state machine

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle State Machine; [`Show Cancellation Gate`](../../apps/erify_api/docs/SHOW_CANCELLATION_GATE.md); [`erify_api` Architecture Refactoring Guide](../../apps/erify_api/docs/design/ARCHITECTURE_REFACTORING_GUIDE.md#phase-4--trigger-gated-show-operations); ideation docs [`schedule-publish-gate-unification.md`](../ideation/schedule-publish-gate-unification.md) and [`cancellation-gate-note-amendment.md`](../ideation/cancellation-gate-note-amendment.md)

**Architecture activation**: item 18 activates Phase 4 of the architecture guide. Implement the transition service inside `ShowOperationsModule`; do not create a fifth parallel writer or perform a standalone folder move. Its schedule-publish integration activates the guide's Phase 5 only when that integration requires `PublishingService` decomposition, or when measured query, lock, rollback, or maintainability risk independently reaches the guide's gate.

**Scope decision (July 2026 review)**: item 18 is the **single canonical show-status transition mechanism**, not a fifth parallel writer. Today `Show.status` is written by four independent paths with uneven validation: studio generic edit (guards only the two cancellation statuses), admin generic edit (no validation — item 8 closes the immediate bypass), `ShowCancellationGateService` (the only path with reason capture, actor-tier checks, active-task guard, and Audit history), and schedule publish (direct writes, no audit — tracked tech debt). Item 18 converges them:

1. **Transition service**: a lifecycle transition service owning the transition graph (`draft → confirmed → live → completed` plus cancellation paths), server-side transition validation, and `Audit`-row history, extending the status + Audit pattern the cancellation gate proved. There is no task-based `STATE_GATE` mechanism in code — the lifecycle skill has been corrected on this point; whether gates ever become task-backed is this item's design decision, not an existing constraint.
2. **Fold in the cancellation gate**: the item 4 endpoints remain the cancellation UX but delegate to the transition service as its cancellation transitions. The two deferred state-machine designs above are revisited **inside this item**, not before or after it. Notification publishing follows the [notification PRD](../prd/notification-system.md) and item 21 rather than a no-op gate-specific seam.
3. **Route schedule publish through it**: automatic cancel/pending/restore status changes go through the same service, closing [`schedule-publish-removal-no-audit.md`](../tech-debt/schedule-publish-removal-no-audit.md) and [`schedule-publish-restore-no-audit.md`](../tech-debt/schedule-publish-restore-no-audit.md).
4. **Retire free-form status editing**: generic edit paths stop accepting arbitrary `show_status_id`; the frontend replaces the status dropdown with guided transition actions.

**Non-blocking guarantee (July 2026)**: transitions carry minimal intrinsic requirements only — a valid edge in the transition graph, a permitted role, and a reason where the transition class requires one (cancellation paths). Data completeness is never an intrinsic requirement: a show can be confirmed before creator mapping lands (mapping regularly completes late in real operations), go live without full readiness, and complete with facts still missing. Missing association records surface as advisory warnings at transition time (via the item 11/12 condition contract once available) — never as blocks — so the state machine cannot freeze the current operational workflow.

Transitions stay manager-driven and **ungated**: readiness/completion conditions surface as advisory context only, until item 19 renders them as transition warnings. Depends on item 3 (done) and item 8; deliberately **not** on items 11/12 — those feed item 19.

### 19. Lifecycle state-gate enforcement

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle State Machine; [`studio-config-settings.md`](../ideation/studio-config-settings.md)

**Blocked** — depends on items 11, 12, and 18. Apply the shared readiness/completion condition contract from items 11/12 to item 18's transitions: one enforcement engine consumes one condition schema across both planning readiness (`draft → confirmed`) and completion review (`live → completed`).

**First delivery is warning-level only with hardcoded defaults**: conditions render as advisory warnings on transition surfaces, and no transition is ever blocked. The `block` enforcement level, per-studio condition configuration (which conditions are `off`/`warning`/`block`), required-condition selection, and waiver/override flows are deferred to the [`studio-config-settings`](../ideation/studio-config-settings.md) ideation and promote only when a studio operationally needs hard gates. Rationale: association records such as creator mapping often complete after the moment a manager needs to move a show forward; blocking transitions on data completeness would freeze daily workflow, so `block` must remain per-studio opt-in configuration, never default behavior.

### 20. Readiness and live control dashboard

**Source**: [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

**Blocked** — split into two slices so the unified view is not held behind enforcement work (July 2026 review):

- **20a Advisory dashboard** (depends on 9, 11, 12, 18): unified manager view consolidating planning readiness, completion signals, unresolved issues, and manual transition controls. This is the surface that fixes the manager's fragmented navigation across disconnected sidebar routes; it ships without any warning/block behavior. Decide whether this is one dashboard or separate planning/on-air views backed by the same lifecycle conditions. The existing `/studios/:studioId/dashboard` route is the extension point.
- **20b Enforcement affordances** (depends on 19): warning indicators and any future waive/override flows, layered onto 20a once enforcement levels exist.

### 21. State-transition notifications

**Source**: [Operational Notifications and PWA Push](../prd/notification-system.md); [`show-production-lifecycle`](../../.agents/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

**Blocked** — the notification PRD defines the common channels, recipients, and timing principles; activate this policy only after item 18 owns state transitions and item 9 defines issue severity. Draft changes remain quiet, confirmed-show changes notify selected stakeholders, and near/on-air changes may escalate based on severity and reason.

**Boundary**: issue-event notifications are item 15. This item is only for lifecycle state transitions.

---

## Out of Scope (→ Phase 6)

Items explicitly deferred from Phase 5 lifecycle gap closure. See [PHASE_6.md](./PHASE_6.md) for full tracking.

| Item                                                    | Reason                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Granular role and module access (RBAC decomposition)    | Requires broad redesign; current MANAGER access is sufficient for lifecycle workflows    |
| Client operations portal                                | New domain foundation; not required by show lifecycle                                    |
| Revenue P&L, commission resolution, contribution margin | Financial revenue semantics; lifecycle produces operational facts, not financial figures |
| Inventory and material management                       | New domain models; not required by show lifecycle                                        |
| Full collaboration (comments, @mentions)                | Show-level issue ownership (item 9) is the smaller Phase 5 slice                         |
| Creator/member availability management                  | Managers handle availability outside the system for Phase 5                              |
| Studio operating rules configuration system             | Phase 5 ships warning-only hardcoded defaults; block-level enforcement toggles and per-studio condition configuration are scoped in the [`studio-config-settings`](../ideation/studio-config-settings.md) ideation |
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
