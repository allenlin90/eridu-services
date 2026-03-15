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

All Phase 4 PRDs are resolved. Shipped behavior is in app-local docs.

| PRD | Status | Canonical Docs |
| --- | --- | --- |
| RBAC Roles | ✅ Shipped — deleted | [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md) |
| Creator Mapping | ✅ Shipped — deleted | [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md), [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md) |

## Phase 5 PRDs

| PRD | Workstream | Status |
| --- | --- | --- |
| [Show Economics](./show-economics.md) | P&L baseline — creator cost + shift cost endpoints | Active |
| [Task Submission Reporting & Export](./task-submission-reporting.md) | Submitted-task review, manager reporting, and client-side export | Active |
