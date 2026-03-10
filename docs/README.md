# Eridu Services Documentation

This directory is the monorepo-level source of truth for roadmap, product context, and cross-app planning.

## Structure

| Directory | Purpose | Lifecycle |
|-----------|---------|-----------|
| [roadmap/](./roadmap/README.md) | Phase scope, status, sequencing | Persistent — updated on phase close |
| [prd/](./prd/README.md) | Product requirement documents | Phase-scoped — cleaned up after features ship |
| [product/](./product/README.md) | Business domain context | Persistent — updated as domain evolves |
| [adr/](./adr/0001-extract-data-table-to-ui.md) | Architecture decision records | Persistent — immutable after acceptance |

App-local docs (`apps/*/docs/`) own **shipped behavior** and **technical design** for implemented features.

## Ownership Model

- Root `docs/roadmap/` owns **phase status** and **cross-app scope**
- Root `docs/prd/` owns **product requirements** for the active phase (transient)
- App-local `apps/*/docs/` own **implemented behavior** and **technical designs** (persistent)
- Shared package READMEs own package-level contracts and usage details

## Doc Lifecycle

1. **Roadmap** files are append-only status records, never deleted
2. **PRDs** are phase-scoped working docs — deleted when features ship or the phase closes
3. **Technical designs** persist after implementation, marked with status (Draft → Implemented)
4. **App-local docs** are the canonical record of shipped behavior

> PRDs own pre-ship intent. App-local docs own post-ship behavior.

## Current Phase State

- Phase 3: Closed by scope reset. Delivered work summarized in [Phase 3](./roadmap/PHASE_3.md).
- Phase 4: P&L Visibility & MC Operations — scoped to the critical path to show-level profitability in [Phase 4](./roadmap/PHASE_4.md).
- Phase 5: Deferred backlog plus creator naming consolidation and other parking-lot work in [Phase 5](./roadmap/PHASE_5.md).
