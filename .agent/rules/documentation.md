# Documentation Organization

## Doc Hierarchy

```
docs/
├── roadmap/          Phase scope, status, sequencing (persistent)
├── prd/              Active in-flight requirements (phase-scoped, transient)
├── features/         Shipped feature specs — promoted from PRDs on ship (persistent)
├── workflows/        Cross-feature end-to-end flows (persistent)
├── domain/           Business domain model and entity context (persistent)
├── engineering/      Architecture overview and engineering policies (persistent)
├── adr/              Architecture decision records (persistent)
└── README.md         Navigation hub

apps/*/docs/
├── design/           Technical design docs (persist after implementation)
├── *.md              Canonical behavioral docs (persistent)
└── README.md         App-level navigation
```

## Lifecycle Rules

### Persistent docs (survive phase changes)
- `docs/roadmap/PHASE_*.md` — updated with status on phase close
- `docs/features/` — shipped feature specs, updated as features evolve
- `docs/workflows/` — cross-feature flow guides, updated as flows change
- `docs/domain/` — business domain context, updated as domain evolves
- `docs/engineering/` — architecture and policies, updated as conventions change
- `docs/adr/` — architecture decisions, immutable after acceptance
- `apps/*/docs/` — shipped behavioral docs for implemented features

### Phase-scoped docs (cleaned up after ship)
- `docs/prd/` — PRDs are tied to the active phase. When features
  are implemented, their PRDs should be:
  1. **Promoted to `docs/features/`** — update status to Shipped, keep product decisions and user context
  2. **Never carried forward as-is** — if work is deferred, rewrite the PRD fresh for the next phase
- PRDs are working documents, not permanent records

### Technical designs
- `apps/*/docs/design/` persist after implementation as
  architectural reference but should be marked with status
  (Draft → Implemented) to distinguish active from historical

## Rules for Contributors

1. PRDs belong in `docs/prd/` and are scoped to the current phase
2. When a phase closes, review all PRDs:
   - Implemented → promote to `docs/features/`, delete the PRD
   - Deferred → delete PRD, note deferral reason in phase doc
   - Partially done → update or rewrite PRD for next phase
3. Roadmap files are append-only status records, never deleted
4. Design docs should reference the PRD or feature doc that motivated them
5. App-local docs own shipped behavior — feature docs own product decisions and user context
