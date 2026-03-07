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

| PRD                                   | Workstream                         | Status |
| ------------------------------------- | ---------------------------------- | ------ |
| [RBAC Roles](./rbac-roles.md)         | Studio role expansion              | Draft  |
| [MC Mapping](./mc-mapping.md)         | MC-to-show assignment & talent ops | Draft  |
| [Show Economics](./show-economics.md) | P&L, compensation, performance     | Draft  |
