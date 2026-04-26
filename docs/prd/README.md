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

## Phase 4 PRDs

Sequencing follows the wave structure defined in [PHASE_4.md](../roadmap/PHASE_4.md#implementation-sequencing).

| #   | PRD                                                                  | Wave | Status                          |
| --- | -------------------------------------------------------------------- | ---- | ------------------------------- |
| 2.1 | [Economics Cost Model](./economics-cost-model.md)                    | 2    | 🔲 Active — docs-only            |
| 2.2 | [Compensation Line Items + Freeze + Actuals](./compensation-line-items.md) | 2    | 🔲 Planned                       |
| 3.1 | [Studio Economics Review](./studio-economics-review.md)              | 3    | 🔲 Planned                       |
| 3.2 | [Show Planning Export](./show-planning-export.md)                    | 3    | 🔲 Planned                       |
| 3.3 | [Creator Availability Hardening](./creator-availability-hardening.md) | 3    | 🔲 Planned                       |
| 4.1 | [P&L Revenue Workflow](./pnl-revenue-workflow.md)                    | 4    | 🔲 Planned (4 open design Qs)    |

Wave 2.3 (Economics Service) does not have its own PRD — it's a backend implementation against 2.1 + 2.2; the design doc lands when the workstream starts.

Studio schedule management is deferred (revisit with the Client Portal workstream): [PRD](./studio-schedule-management.md).

### Phase 5 Candidates (PRDs created, implementation deferred)

| PRD | Workstream | Track | Status |
| --- | --- | --- | --- |
| [Studio Reference Data](./studio-reference-data.md) | Studio-initiated creation of clients, platforms, types, standards, statuses | C | Deferred to Phase 5 |
| [Studio Creator Profile](./studio-creator-profile.md) | Studio-level editing of creator name, alias, metadata | C | Deferred to Phase 5 |

Sidebar redesign is tracked in app-local design doc: [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) (Wave 1, incremental rollout).
