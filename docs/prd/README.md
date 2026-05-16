# Product Requirement Documents

PRDs define user-facing requirements for **novel features** in the current or next promoted phase — anything that introduces a new domain, a new pattern, or unresolved product decisions. Each PRD covers user stories, acceptance criteria, and product rules. Technical designs live in app-local docs.

**Additive work that replicates a shipped pattern does not need a PRD.** Use a per-PR entry in the phase's `PHASE_<n>.md (§ PR Roadmap)` tracker instead. The tracker entry — user flow, UX target, scope, acceptance — is the spec.

## Doc Flow

**Novel feature:**

```
Roadmap (docs/roadmap/)              → what & why, phase-level scope
   ↓
PRDs (docs/prd/)                     → user stories, acceptance criteria, product rules
   ↓
Technical Designs (apps/*/docs/design/)  → when the implementation introduces a novel pattern
```

**Additive PR replicating a shipped pattern:**

```
Tracker entry in docs/roadmap/PHASE_<n>.md (§ PR Roadmap)  → user flow + UX target + scope + acceptance
   ↓
Implementation PR
```

## Lifecycle

PRDs are **phase-scoped and transient**:

- PRDs are working documents for the current phase, not permanent records.
- When a feature is **implemented** → promote to `docs/features/` (update status, check off ACs, add links to app-local docs), then delete the PRD.
- When a feature is **deferred** → delete its PRD; note the deferral in the phase doc.
- When a phase **closes** → all PRDs should be cleaned up (deleted, promoted to `docs/features/`, or moved to `docs/prd/future/` if they're scoped beyond this phase).
- When **mid-phase scope changes** make downstream PRDs stale → retire them and consolidate into a `PHASE_<n>.md (§ PR Roadmap)` tracker. The Phase 4 simplification (2026-05) is the canonical example.

> PRDs own pre-ship intent for novel work. Trackers own remaining execution for additive work. App-local docs own post-ship behavior.

## Phase 4

Phase 4 has **no active PRDs**. The phase was re-scoped mid-flight to a read-only cost reference viewer:

- The cost contract (2.1) is an operating contract, not pre-ship requirements — promoted to [`docs/domain/economics-cost-model.md`](../domain/economics-cost-model.md).
- All remaining work (2.2 compensation line items, 2.3 economics service, 3.1 economics review surface, 3.2 page-local exports, 3.3 creator availability hardening) is tracked PR-by-PR in [`PHASE_4.md`](../roadmap/PHASE_4.md) as 15 user-flow-first entries.
- Studio schedule management was deferred (revisit with the Client Portal workstream); retained at [`future/studio-schedule-management.md`](./future/studio-schedule-management.md).
- Future P&L revenue workflow is sketched in [`future/pnl-revenue-workflow.md`](./future/pnl-revenue-workflow.md); redraft when revenue planning restarts.

### Phase 5 Candidates (PRDs created, implementation deferred)

| PRD                                                   | Workstream                                                                  | Track | Status              |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | ----- | ------------------- |
| [Studio Reference Data](./studio-reference-data.md)   | Studio-initiated creation of clients, platforms, types, standards, statuses | C     | Deferred to Phase 5 |
| [Studio Creator Profile](./studio-creator-profile.md) | Studio-level editing of creator name, alias, metadata                       | C     | Deferred to Phase 5 |

Sidebar redesign is tracked in app-local design doc: [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) (Wave 1, incremental rollout).
