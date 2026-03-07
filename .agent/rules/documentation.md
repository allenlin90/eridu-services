# Documentation Organization

## Doc Hierarchy

```
docs/
├── roadmap/          Phase scope, status, sequencing (persistent)
├── prd/              Product requirement documents (phase-scoped, transient)
├── product/          Business domain context (persistent)
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
- `docs/product/` — business domain context, updated as domain evolves
- `docs/adr/` — architecture decisions, immutable after acceptance
- `apps/*/docs/` — shipped behavioral docs for implemented features

### Phase-scoped docs (cleaned up after ship)
- `docs/prd/` — PRDs are tied to the active phase. When features
  are implemented, their PRDs should be:
  1. **Archived or deleted** — the shipped behavior is documented
     in app-local canonical docs, not in PRDs
  2. **Never carried forward** — if work is deferred, the PRD moves
     to the next phase's planning cycle, not kept as stale docs
- PRDs are working documents, not permanent records

### Technical designs
- `apps/*/docs/design/` persist after implementation as
  architectural reference but should be marked with status
  (Draft → Implemented) to distinguish active from historical

## Rules for Contributors

1. PRDs belong in `docs/prd/` and are scoped to the current phase
2. When a phase closes, review all PRDs:
   - Implemented → delete PRD, ensure behavior is in app-local docs
   - Deferred → delete PRD, note deferral reason in phase doc
   - Partially done → update or rewrite PRD for next phase
3. Roadmap files are append-only status records, never deleted
4. Design docs should reference the PRD that motivated them
5. App-local docs own shipped behavior — PRDs own pre-ship intent
