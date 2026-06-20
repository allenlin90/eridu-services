# Phase 5: Show Production Lifecycle Gap Closure

> **Status**: 🔲 Planned — lifecycle alignment and state-independent operational fixes first
> **Planning stance**: Fill operational gaps in the existing show production lifecycle before expanding into larger new domains. Operational record export waits until current features, lifecycle state enforcement, and post-production review semantics are stable. The lifecycle model, entity map, and state-gate detail live in the [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill.

**Quick links**

- **Lifecycle model** (read first): [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — state machine, entity relationships, readiness conditions, and operating roles
- **State-gate detail**: [`references/state-gates.md`](../../.agent/skills/show-production-lifecycle/references/state-gates.md) — full condition inventory per transition
- **Phase 4**: [PHASE_4.md](./PHASE_4.md) — upstream phase (P&L Visibility & Creator Operations)
- **Phase 6 deferrals**: [PHASE_6.md](./PHASE_6.md) — Tracks A/B/C + Phase 4/5 deferrals

## Goal

Build a clear show lifecycle contract that explains what must be ready, who owns each step, what can be flexible by studio policy, and what happens when a show cannot continue normally. Phase 5 starts with **current feature lifecycle alignment, cancellation resolution, import/correction records, issue ownership, and scheduling consistency**. Lifecycle state enforcement follows once creator mapping is complete as an operational flow and current feature surfaces fit the lifecycle model. Broader operational record export is deferred until the lifecycle and post-production review landscape is stable.

## Workstream Items

Each row is one workstream or deliverable. Rows are ordered top-to-bottom as execution order; rows with `—` in **Depends on** can ship in parallel. Items marked **Candidate** are promoted into active scope only if they become blocking during Phase 5 implementation.

### Ready Pickup (State-Independent)

| #   | Workstream                                                                                                                                          | Depends on | Status    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| 1   | [Current feature lifecycle alignment](#1-current-feature-lifecycle-alignment) — update or deprecate feature behavior that does not fit the lifecycle model | —          | 🔲 Planned |
| 2   | [Cancel show with resolution state](#2-cancel-show-with-resolution-state) — allow cancellation into resolution workflow from non-draft, non-pending shows | —          | 🔲 Planned |
| 3   | [Import platform performance data](#3-import-platform-performance-data) — controlled manual export/upload flow before platform API integration       | —          | 🔲 Planned |
| 4   | [Show performance correction](#4-show-performance-correction) — managers can correct missing/inaccurate metrics with audit reason                    | 3          | 🔲 Planned |
| 5   | [Show-level issue ownership](#5-show-level-issue-ownership) — narrow issue record for show blockers without state-gate enforcement                  | —          | 🔲 Planned |
| 6   | [Schedule-change task reconciliation](#6-schedule-change-task-reconciliation) — update generated task due dates when show timing changes             | —          | 🔲 Planned |
| 7   | [Update BUSINESS.md enum/roles](#7-update-businessmd-enumroles) — align `show_status` enum and supported roles                                      | —          | 🔲 Planned |

### Operational Efficiency (Candidates)

| #   | Workstream                                                                                                                                 | Depends on | Status    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------- |
| 8   | [Bulk show detail editing](#8-bulk-show-detail-editing) — bulk edit planning fields from studio show list after lifecycle alignment       | 1          | 🔲 Candidate |
| 9   | [Bulk room assignment](#9-bulk-room-assignment) — dedicated bulk room assignment flow                                                       | 1          | 🔲 Candidate |

### Blocked State / Lifecycle Enforcement

| #   | Workstream                                                                                                                                                                                    | Depends on | Status    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| 10  | [Show lifecycle state machine](#10-show-lifecycle-state-machine) — enforce `draft → confirmed → live → completed` and cancellation transitions with validation                 | Creator mapping operational flow, 1 | ⏸ Blocked |
| 11  | [Show-level planning readiness checklist](#11-show-level-planning-readiness-checklist) — aggregate readiness conditions into one show-level view for `draft → confirmed`       | 10         | ⏸ Blocked |
| 12  | [Post-production completion gate](#12-post-production-completion-gate) — show-level `completed` checklist confirming required closure records and facts                        | 10, 3, 4, 5 | ⏸ Blocked |
| 13  | [Readiness and live control dashboard](#13-readiness-and-live-control-dashboard) — unified manager view for planning readiness, live readiness, live-state transition, and blockers | 11, 12     | ⏸ Blocked |
| 14  | [State-based operational change notifications](#14-state-based-operational-change-notifications) — notification rules tied to show state, stakeholder role, and issue severity | 10, 5      | ⏸ Blocked |

### Deferred Review / Export

| #   | Workstream                                                                                                                                                               | Depends on | Status     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------- |
| 15  | [Operational record export](#15-operational-record-export) — broaden task-submission export into a post-production operational record export across reviewed show facts | 1, 10-14   | ⏭ Deferred |

### How to use this list

- **Pick up**: write a 1-3 sentence brief in the section below; flip status to `🚧 In progress`.
- **Wrap up (before merge)**: flip status to `✅`, replace the brief with the PR link, and update any other docs the PR's outcome affects. Land docs atomically with the code; prefer squash-merge.
- **Promote candidate**: move from `🔲 Candidate` to `🔲 Planned` when the item becomes blocking.
- **Unblock state work**: move from `⏸ Blocked` only after creator mapping is complete as an operational flow, lifecycle-alignment decisions are reflected in the active surfaces, and the workstream's state dependency is still valid.
- **Promote deferred export**: move from `⏭ Deferred` only after state-machine and post-production review semantics are stable enough that the export contract will not need immediate rework.

---

## Workstream Briefs

### 1. Current feature lifecycle alignment

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases; [`doc-hygiene`](../../.agent/skills/doc-hygiene/SKILL.md) skill

Review active planning, mapping, task review, show-run-review, performance, and focused feature-export behavior against the lifecycle model. Update or deprecate flows that create ineffective operating behavior, duplicate lifecycle responsibility, or assume lifecycle semantics the product is not ready to enforce. This work records which surfaces remain as-is, which become focused feature workflows, and which are retired or revised before state-machine work starts.

### 2. Cancel show with resolution state

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §4

Allow managers to cancel a show into `cancelled_pending_resolution` without requiring the full lifecycle state machine. This action is available for non-draft shows that are not already pending resolution, so production, post-production, or other active downstream consequences can be captured for follow-up. Capture reason category, resolution owner, follow-up fields, and final disposition (`cancelled` or `completed`) as operational records for review and later export; do not hard-code a broader transition graph in this workstream.

### 3. Import platform performance data

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

Start with a controlled manual export/upload flow (CSV or spreadsheet) for importing platform-source performance data (GMV, views, CTR, CTO) before considering platform API integration. Keep financial revenue semantics separate (deferred to Phase 6). Imported platform data supports business comparison against operator-submitted facts and later post-production review.

### 4. Show performance correction

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

Allow managers to directly correct missing or inaccurate performance metrics (GMV, views, CTR, CTO) with a business reason. Corrections should create audit records and follow the existing `MANAGER` priority level in the extraction pipeline's priority resolver. Corrections can feed review surfaces and later export without requiring lifecycle-state enforcement.

### 5. Show-level issue ownership

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

Define a narrow show-level issue record (or task-like workflow) that traces blockers: missing creator, equipment dysfunction, utility outage, platform violations, and post-production follow-up. Each issue has an owner, due date, severity, evidence, status, escalation path, and resolution record. In this pickup phase, issues are operational records for review and later export; they do not drive state transitions until the state machine is unblocked.

### 6. Schedule-change task reconciliation

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1

When show timing changes through schedule publish or manager edit, generated task due dates should be reconciled to reflect the new timing. This can ship without state enforcement because it keeps task execution aligned with the operational record rather than gating a status transition.

### 7. Update BUSINESS.md enum/roles

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle State Machine, Operating Roles

Doc-only fix. Update the `show_status` enum (add `cancelled_pending_resolution`) and supported roles list in `BUSINESS.md` to match the actual `STUDIO_ROLE` enum in code.

### 8. Bulk show detail editing

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1

**Candidate** — promote after item 1 identifies which planning fields remain valid lifecycle inputs. Allow managers to bulk edit planning fields from the studio show list, similar to how task setup handles bulk task generation. Status changes stay out of scope until state-machine work is unblocked.

### 9. Bulk room assignment

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1

**Candidate** — promote if room assignment remains a repeated planning bottleneck after lifecycle alignment. Provide a bulk flow for room assignment similar to task generation or creator mapping.

### 10. Show lifecycle state machine

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle State Machine

**Blocked** — do not implement until creator mapping is complete as an operational flow and current feature surfaces are aligned to the lifecycle model. Implement the state machine (`draft → confirmed → live → completed`, plus `cancelled` and `cancelled_pending_resolution` paths) with server-side transition validation. State gates should support configurable enforcement levels (off / warning / block) to avoid disrupting existing studio workflows.

### 11. Show-level planning readiness checklist

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1, Readiness Conditions

**Blocked** — depends on item 10. Aggregate existing readiness signals (room assigned, creators assigned, platforms assigned, required task stages generated, task stages assigned to operators) into one show-level checklist for the `draft → confirmed` transition. The checklist reads existing records — it does not create new data models. Readiness conditions are identified in [`references/state-gates.md`](../../.agent/skills/show-production-lifecycle/references/state-gates.md).

### 12. Post-production completion gate

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

**Blocked** — depends on item 10. Define a show-level `completed` checklist confirming that required closure records and facts are present: submitted/approved closure tasks, actual end/completion signal, creator attendance outcome, platform performance facts, correction/review status, and unresolved issue status. This gates `live → completed` using the same enforcement-level model as item 10.

### 13. Readiness and live control dashboard

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

**Blocked** — depends on state-backed readiness and completion flows. Unified manager view that consolidates planning readiness, live readiness, live-state transition controls, and production blockers. Decide whether this is one dashboard or separate planning/on-air views backed by the same lifecycle conditions. The existing `/studios/:studioId/dashboard` route should be cited as the extension point.

### 14. State-based operational change notifications

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

**Blocked** — promote only after state machine, issue severity model, stakeholder list, channels, recipients, and timing rules are defined. Draft changes should remain quiet, confirmed-show changes should notify stakeholders, and near/on-air changes may need escalation based on issue severity and reason.

### 15. Operational record export

**Source**: [`operations-review-surface`](../../.agent/skills/operations-review-surface/SKILL.md) skill — Per-tab export; [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

**Deferred** — promote after lifecycle state enforcement, completion semantics, issue ownership, imports, and correction flows settle. The export should cover the reviewed operational record for a show, operational day, or date range: task submissions, review status, extracted show/creator/platform facts, attendance outcomes, platform metrics, platform violations, manager corrections, import provenance, and issue/resolution context where available. This is a read-only post-production review output, not a lifecycle gate and not a financial revenue export.

Feature-specific exports remain focused: planning, task setup, creator mapping, and other mapping surfaces can keep their own current-view CSV exports for their local workflow. Operational record export is the broader post-production review package that sits downstream of task-submission review and should not be locked before the lifecycle surface is stable.

---

## Out of Scope (→ Phase 6)

Items explicitly deferred from Phase 5 lifecycle gap closure. See [PHASE_6.md](./PHASE_6.md) for full tracking.

| Item                                                    | Reason                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Granular role and module access (RBAC decomposition)    | Requires broad redesign; current MANAGER access is sufficient for lifecycle workflows    |
| Client operations portal                                | New domain foundation; not required by show lifecycle                                    |
| Revenue P&L, commission resolution, contribution margin | Financial revenue semantics; lifecycle produces operational facts, not financial figures |
| Inventory and material management                       | New domain models; not required by show lifecycle                                        |
| Full collaboration (comments, @mentions)                | Show-level issue ownership (item 5) is the smaller Phase 5 slice                         |
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

Doc-only item 7 requires no code verification — validate cross-references and content accuracy manually.
