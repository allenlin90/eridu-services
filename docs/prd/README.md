# Product Requirement Documents

PRDs define user-facing requirements for each workstream in the **active phase**. Each PRD covers user stories, acceptance criteria, and product rules. Technical designs live in app-local docs.

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
- When a feature is **implemented** → delete its PRD; shipped behavior is documented in app-local canonical docs
- When a feature is **deferred** → delete its PRD; note the deferral in the phase doc
- When a phase **closes** → all PRDs should be cleaned up (archived or deleted)
- If work carries into the next phase → rewrite the PRD fresh for the new phase context

> PRDs own pre-ship intent. App-local docs own post-ship behavior.

## Phase 4 PRDs

Phase 4 is fully delivered. All PRDs have been deleted; shipped behavior is documented in app-local docs:
- [`apps/erify_api/docs/MC_OPERATIONS.md`](../../apps/erify_api/docs/MC_OPERATIONS.md)
- [`apps/erify_api/docs/SHOW_ECONOMICS.md`](../../apps/erify_api/docs/SHOW_ECONOMICS.md)
- [`apps/erify_studios/docs/MC_MAPPING.md`](../../apps/erify_studios/docs/MC_MAPPING.md)
