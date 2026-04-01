# Eridu Services Documentation

Monorepo-level source of truth for roadmap, product context, and cross-app planning.

## Structure

| Directory | Purpose | Lifecycle |
|-----------|---------|-----------|
| [roadmap/](./roadmap/README.md) | Phase scope, status, sequencing | Persistent — updated on phase close |
| [prd/](./prd/README.md) | Active in-flight requirements | Phase-scoped — promoted or deleted when features ship |
| [features/](./features/README.md) | Shipped feature specs (promoted from PRDs) | Persistent — updated as features evolve |
| [workflows/](./workflows/README.md) | Cross-feature end-to-end flow guides | Persistent — updated as flows change |
| [domain/](./domain/BUSINESS.md) | Business domain model and entity context | Persistent — updated as domain evolves |
| [engineering/](./engineering/README.md) | Architecture overview and engineering policies | Persistent — updated as conventions change |
| [ideation/](./ideation/README.md) | Deferred ideas with preserved reasoning | Lifecycle-managed — promoted to PRD or dropped |
| [adr/](./adr/) | Architecture decision records | Persistent — immutable after acceptance |

App-local docs (`apps/*/docs/`) own **shipped behavior** and **technical design** for implemented features.

## Ownership Model

- `docs/roadmap/` — phase status and cross-app scope
- `docs/prd/` — active requirements for the current phase (transient)
- `docs/features/` — product decisions and user context for shipped features
- `docs/workflows/` — end-to-end actor flows spanning multiple features
- `docs/domain/` — business entities, domain rules, and product vocabulary
- `docs/engineering/` — architecture, patterns, and engineering governance
- `docs/ideation/` — deferred ideas with preserved reasoning (lifecycle-managed)
- `apps/*/docs/` — canonical record of implemented behavior (persistent)

## Doc Lifecycle

1. **Roadmap** files are append-only status records, never deleted
2. **PRDs** are transient working docs — when a feature ships, promote to `features/` and delete the PRD
3. **Feature docs** are permanent — updated as features evolve
4. **Workflow docs** are permanent — updated as operational flows change
5. **Ideation docs** are lifecycle-managed — promoted to PRD when selected for a phase, dropped when obsolete
6. **App-local docs** are the canonical record of shipped behavior

> PRDs own pre-ship intent. Feature docs own product decisions. App-local docs own behavior.

## Current Phase State

- Phase 1–3: ✅ Closed. Summarized in [Phase 3](./roadmap/PHASE_3.md).
- Phase 4: 🚧 Active. Wave 1 shipped (studio member roster, studio creator roster, and studio creator onboarding). `eridu_docs` knowledge base also shipped as extended-scope internal tooling. Next: studio autonomy follow-ups plus economics cost model review and compensation line items. See [Phase 4](./roadmap/PHASE_4.md).
- Phase 5: Placeholder. Scope TBD after Phase 4 economics ships. See [Phase 5](./roadmap/PHASE_5.md).
