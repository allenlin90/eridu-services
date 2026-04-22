# Product Requirement Documents

PRDs define user-facing requirements for each workstream in the **current or next promoted phase**. Each PRD covers user stories, acceptance criteria, and product rules. Technical designs live in app-local docs.

## Doc Flow

```
Roadmap (docs/roadmap/)              → what & why, phase-level scope
   ↓
PRDs (docs/prd/)                     → user stories, acceptance criteria, product rules
   ↓
Technical Designs (apps/*/docs/design/)  → data models, API contracts, service architecture
```

## Lifecycle

PRDs are **phase-scoped and transient**:

- PRDs are working documents for the current phase, not permanent records
- When a feature is **implemented** → promote to `docs/features/` (update status, check off ACs, add links to app-local docs), then delete the PRD
- When a feature is **deferred** → delete its PRD; note the deferral in the phase doc
- When a phase **closes** → all PRDs should be cleaned up (deleted or carried forward with a fresh rewrite)
- If work carries into the next phase → rewrite the PRD fresh for the new phase context

> PRDs own pre-ship intent. App-local docs own post-ship behavior.

## Phase 4 PRDs (Reopened — Extended Scope)

Sequencing follows the wave structure defined in [PHASE_4.md](../roadmap/PHASE_4.md#implementation-sequencing).

| PRD | Workstream | Wave | Status |
| --- | --- | --- | --- |
| ~~Show Economics~~ | P&L baseline — creator cost + shift cost endpoints | — | ⏸️ Deferred merge → [archived reference](../features/show-economics.md) |
| ~~Studio Member Roster~~ | Studio operator governance — L-side labor cost inputs (`baseHourlyRate`) | 1 | ✅ Shipped → [feature doc](../features/studio-member-roster.md) |
| ~~Studio Creator Roster~~ | Studio operator governance — L-side creator cost defaults | 1 | ✅ Implemented → [feature doc](../features/studio-creator-roster.md) |
| ~~Studio Creator Onboarding~~ | Studio-side creator intake outside `/system/*` plus roster-first assignment gate | 1 | ✅ Implemented → [feature doc](../features/studio-creator-onboarding.md) |
| ~~Internal Knowledge Base (`eridu_docs`)~~ | Internal tooling — authenticated knowledge base for repo docs | Ext | ✅ Implemented → [feature doc](../features/eridu-docs-knowledge-base.md) |
| ~~Studio Show Management~~ | Studio CRUD for shows — removes `/admin/*` dependency and keeps show writes schedule-ready | 1+ | ✅ Implemented → [feature doc](../features/studio-show-management.md) |
| [Studio Schedule Management](./studio-schedule-management.md) | Studio schedule lifecycle — create, assign/rearrange shows, validate, publish, duplicate | — | ⏸️ Deferred 2026-04-22 (revisit with Client Portal workstream) |
| [Compensation Line Items](./compensation-line-items.md) | Supplemental cost items (bonus, allowance, OT, deduction) for members + creators | R+ | Active (post-Wave 1) |
| [Studio Economics Review](./studio-economics-review.md) | Configurable studio finance review/export engine for future projected and past actual cost views | 2 | Active |
| [Show Planning Export](./show-planning-export.md) | Operations planning export — pre-show shows + assignments + estimated cost; CSV + JSON | 2 | Active (locked preset downstream of studio economics review) |
| [Creator Availability Hardening](./creator-availability-hardening.md) | Dual-mode availability endpoint — overlap + roster conflict enforcement | 2 | Active (depends on creator roster + onboarding gate) |
| [P&L Revenue Workflow](./pnl-revenue-workflow.md) | P&L revenue ("P") side — GMV/sales inputs, commission cost activation, contribution margin | 3 | Active (4 open design Qs) |

### Phase 5 Candidates (PRDs created, implementation deferred)

| PRD | Workstream | Track | Status |
| --- | --- | --- | --- |
| [Studio Reference Data](./studio-reference-data.md) | Studio-initiated creation of clients, platforms, types, standards, statuses | C | Deferred to Phase 5 |
| [Studio Creator Profile](./studio-creator-profile.md) | Studio-level editing of creator name, alias, metadata | C | Deferred to Phase 5 |

Sidebar redesign is tracked in app-local design doc: [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) (Wave 1, incremental rollout).
