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

## Phase 4 PRDs (Reopened)

| PRD | Workstream | Status |
| --- | --- | --- |
| [Show Economics](./show-economics.md) | P&L baseline — creator cost + shift cost endpoints | Active |
| [Studio Member Roster](./studio-member-roster.md) | Studio operator governance — L-side labor cost inputs (`baseHourlyRate`) | Active |
| [Studio Creator Roster](./studio-creator-roster.md) | Studio operator governance — L-side creator cost defaults | Active |
| [P&L Revenue Workflow](./pnl-revenue-workflow.md) | P&L revenue ("P") side — GMV/sales inputs, commission cost activation, contribution margin | Active |
| [Show Planning Export](./show-planning-export.md) | Operations planning export — pre-show shows + assignments + estimated cost; CSV + JSON | Active |
| [Creator Availability Hardening](./creator-availability-hardening.md) | Dual-mode availability endpoint — overlap + roster conflict enforcement | Active (depends on creator roster) |
