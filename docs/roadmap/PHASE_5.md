# Phase 5: Show Production Lifecycle Gap Closure

> **Status**: 🔲 Planned — scope defined from lifecycle gap analysis
> **Planning stance**: Fill operational gaps in the existing show production lifecycle before expanding into larger new domains. Scoped by a lifecycle gap analysis validated against code; the lifecycle model, entity map, and state-gate detail now live in the [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill.

**Quick links**

- **Lifecycle model** (read first): [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — state machine, entity relationships, readiness conditions, and operating roles
- **State-gate detail**: [`references/state-gates.md`](../../.agent/skills/show-production-lifecycle/references/state-gates.md) — full condition inventory per transition
- **Phase 4**: [PHASE_4.md](./PHASE_4.md) — upstream phase (P&L Visibility & Creator Operations)
- **Phase 6 deferrals**: [PHASE_6.md](./PHASE_6.md) — Tracks A/B/C + Phase 4/5 deferrals

## Goal

Build a clear show lifecycle contract that explains what must be ready, who owns each step, what can be flexible by studio policy, and what happens when a show cannot continue normally. Phase 5 produces **lifecycle state enforcement, readiness views, cancellation resolution workflows, and data-accuracy corrections** — the operational gaps that remain after Phase 4 shipped cost visibility, creator operations, and the fact-extraction pipeline.

## Workstream Items

Each row is one workstream or deliverable. Rows are ordered top-to-bottom as execution order; rows with `—` in **Depends on** can ship in parallel. Items marked **Candidate** are promoted into active scope only if they become blocking during Phase 5 implementation.

### Foundation / Lifecycle Model

| #   | Workstream                                                                                                                                                              | Depends on | Status    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| 1   | [Show lifecycle state machine](#1-show-lifecycle-state-machine) — enforce `draft → confirmed → live → completed` and cancellation transitions with validation           | —          | 🔲 Planned |
| 2   | [Show-level planning readiness checklist](#2-show-level-planning-readiness-checklist) — aggregate readiness conditions into one show-level view for `draft → confirmed` | 1          | 🔲 Planned |
| 3   | [Post-production completion gate](#3-post-production-completion-gate) — show-level `completed` checklist confirming required closure records and facts                  | 1          | 🔲 Planned |

### Cancellation & Resolution

| #   | Workstream                                                                                                                                 | Depends on | Status    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------- |
| 4   | [Pending-resolution workflow](#4-pending-resolution-workflow) — manual reasons, owner, queue, follow-up fields, and final disposition path | 1          | 🔲 Planned |

### Production Control

| #   | Workstream                                                                                                                                                                                    | Depends on | Status    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| 5   | [Readiness and live control dashboard](#5-readiness-and-live-control-dashboard) — unified manager view for planning readiness, live readiness, live-state transition, and production blockers | 2          | 🔲 Planned |
| 6   | [Show-level issue ownership](#6-show-level-issue-ownership) — narrow issue record for show blockers (owner, due date, severity, evidence, status, resolution)                                 | 1          | 🔲 Planned |

### Data Accuracy & Imports

| #   | Workstream                                                                                                                                     | Depends on | Status    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| 7   | [Show performance correction](#7-show-performance-correction) — managers can correct missing/inaccurate metrics with audit reason              | —          | 🔲 Planned |
| 8   | [Import platform performance data](#8-import-platform-performance-data) — controlled manual export/upload flow before platform API integration | —          | 🔲 Planned |

### Operational Efficiency (Candidates)

| #   | Workstream                                                                                                                                                                     | Depends on | Status      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------- |
| 9   | [Bulk show detail editing](#9-bulk-show-detail-editing) — bulk edit planning fields (room, platform, status) from studio show list                                             | —          | 🔲 Candidate |
| 10  | [Bulk room assignment](#10-bulk-room-assignment) — dedicated bulk room assignment flow                                                                                         | —          | 🔲 Candidate |
| 11  | [Schedule-change task reconciliation](#11-schedule-change-task-reconciliation) — update generated task due dates when show timing changes                                      | —          | 🔲 Candidate |
| 12  | [State-based operational change notifications](#12-state-based-operational-change-notifications) — notification rules tied to show state, stakeholder role, and issue severity | 6          | 🔲 Candidate |

### Doc Corrections

| #   | Workstream                                                                                                       | Depends on | Status    |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------- | --------- |
| 13  | [Update BUSINESS.md enum/roles](#13-update-businessmd-enumroles) — align `show_status` enum and supported roles | —          | 🔲 Planned |

### How to use this list

- **Pick up**: write a 1-3 sentence brief in the section below; flip status to `🚧 In progress`.
- **Wrap up (before merge)**: flip status to `✅`, replace the brief with the PR link, and update any other docs the PR's outcome affects. Land docs atomically with the code; prefer squash-merge.
- **Promote candidate**: move from `🔲 Candidate` to `🔲 Planned` when the item becomes blocking.

---

## Workstream Briefs

### 1. Show lifecycle state machine

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle State Machine

Today show status is a free-form field with no transition validation. Implement the state machine (`draft → confirmed → live → completed`, plus `cancelled` and `cancelled_pending_resolution` paths) with server-side transition validation. State gates should support configurable enforcement levels (off / warning / block) to avoid disrupting existing studio workflows.

### 2. Show-level planning readiness checklist

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1, Readiness Conditions

Aggregate existing readiness signals (room assigned, creators assigned, platforms assigned, required task stages generated, task stages assigned to operators) into one show-level checklist for the `draft → confirmed` transition. The checklist reads existing records — it does not create new data models. Readiness conditions are identified in [`references/state-gates.md`](../../.agent/skills/show-production-lifecycle/references/state-gates.md).

### 3. Post-production completion gate

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

Define a show-level `completed` checklist confirming that required closure records and facts are present: submitted/approved closure tasks, actual end/completion signal, creator attendance outcome, platform performance facts, and unresolved issue status. This gates `live → completed` using the same enforcement-level model as item 1.

### 4. Pending-resolution workflow

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §4

Today `cancelled_pending_resolution` can be set automatically by schedule publish but cannot be triggered manually by managers, and has no resolution path. Implement: manual transition to pending resolution with reason category (client conflict, creator missing, room unavailable, production failure, etc.), resolution owner assignment, follow-up fields, and final disposition (→ `cancelled` or → `completed`).

### 5. Readiness and live control dashboard

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

Unified manager view that consolidates planning readiness (item 2), live readiness, live-state transition controls, and production blockers. Decide whether this is one dashboard or separate planning/on-air views backed by the same lifecycle conditions. The existing `/studios/:studioId/dashboard` route should be cited as the extension point.

### 6. Show-level issue ownership

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

Define a narrow show-level issue record (or task-like workflow) that traces blockers: missing creator, equipment dysfunction, utility outage, platform violations, and pending-resolution follow-up. Each issue has an owner, due date, severity, evidence, status, escalation path, and resolution record. The boundary with show-run-review should be clarified — issues discovered during show-run-review should create records tracked here.

### 7. Show performance correction

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

Allow managers to directly correct missing or inaccurate performance metrics (GMV, views, CTR, CTO) with a business reason. Corrections should create audit records and follow the existing `MANAGER` priority level in the extraction pipeline's priority resolver.

### 8. Import platform performance data

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §3

Start with a controlled manual export/upload flow (CSV or spreadsheet) for importing platform-source performance data (GMV, views, CTR, CTO) before considering platform API integration. Keep financial revenue semantics separate (deferred to Phase 6).

### 9. Bulk show detail editing

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1

**Candidate** — promote if repeated readiness edits across many shows become blocking. Allow managers to bulk edit planning fields (room, platform, status) from the studio show list, similar to how task setup handles bulk task generation.

### 10. Bulk room assignment

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1

**Candidate** — promote if room assignment becomes a repeated planning-readiness bottleneck. Provide a bulk flow for room assignment similar to task generation or creator mapping.

### 11. Schedule-change task reconciliation

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §1

**Candidate** — promote if stale task due dates cause planning readiness issues. When show timing changes through schedule publish, generated task due dates should be reconciled to reflect the new timing.

### 12. State-based operational change notifications

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle Phases §2

**Candidate** — promote only after issue severity model, stakeholder list, channels, recipients, and timing rules are defined. Draft changes should remain quiet, confirmed-show changes should notify stakeholders, and near/on-air changes may need escalation based on issue severity and reason.

### 13. Update BUSINESS.md enum/roles

**Source**: [`show-production-lifecycle`](../../.agent/skills/show-production-lifecycle/SKILL.md) skill — Lifecycle State Machine, Operating Roles

Doc-only fix. Update the `show_status` enum (add `cancelled_pending_resolution`) and supported roles list in `BUSINESS.md` to match the actual `STUDIO_ROLE` enum in code.

---

## Out of Scope (→ Phase 6)

Items explicitly deferred from Phase 5 lifecycle gap closure. See [PHASE_6.md](./PHASE_6.md) for full tracking.

| Item                                                    | Reason                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Granular role and module access (RBAC decomposition)    | Requires broad redesign; current MANAGER access is sufficient for lifecycle workflows    |
| Client operations portal                                | New domain foundation; not required by show lifecycle                                    |
| Revenue P&L, commission resolution, contribution margin | Financial revenue semantics; lifecycle produces operational facts, not financial figures |
| Inventory and material management                       | New domain models; not required by show lifecycle                                        |
| Full collaboration (comments, @mentions)                | Show-level issue ownership (item 6) is the smaller Phase 5 slice                         |
| Creator/member availability management                  | Managers handle availability outside the system for Phase 5                              |
| Studio operating rules configuration system             | Phase 5 identifies rule conditions; enforcement toggles need separate design             |
| Monthly operations close workflow                       | Defer unless show-level completion gates cannot support monthly close                    |

## Definition of Done

Phase 5 closes when every `🔲 Planned` row in the workstream table is `✅` and all promoted candidates are resolved. The `show-production-lifecycle` skill remains the lifecycle source of truth; this phase doc tracks implementation status only.

## Verification gates per workstream

```
pnpm --filter erify_api    lint && pnpm --filter erify_api    typecheck && pnpm --filter erify_api    test && pnpm --filter erify_api    build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```

Doc-only item 13 requires no code verification — validate cross-references and content accuracy manually.
