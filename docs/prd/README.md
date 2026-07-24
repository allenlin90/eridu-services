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
- When a feature is **deferred** → delete its PRD; preserve actionable discovery in `docs/ideation/` and note the deferral in the phase doc.
- When a phase **closes** → all PRDs should be cleaned up (deleted, promoted to `docs/features/`, or moved to `docs/ideation/` if they remain actionable beyond the phase).
- When **mid-phase scope changes** make downstream PRDs stale → retire them and consolidate into a `PHASE_<n>.md (§ PR Roadmap)` tracker. The Phase 4 simplification (2026-05) is the canonical example.

> PRDs own pre-ship intent for novel work. Trackers own remaining execution for additive work. App-local docs own post-ship behavior.

## Phase 4

✅ **Closed** (see [`PHASE_4.md`](../roadmap/PHASE_4.md)) — every PRD promoted or retired. The client-owned mechanics domain + `ACCOUNT_MANAGER` role + mechanic↔show coverage PRD (PR 20.1–20.8) was promoted to [`client-mechanics.md`](../features/client-mechanics.md). The task-input fact binding PRD was promoted to [shipped feature docs](../features/task-fact-binding.md). No active Phase 4 PRDs remain.

## Phase 5

Phase 5 ([`PHASE_5.md`](../roadmap/PHASE_5.md)) uses workstream briefs for additive lifecycle work. The cross-app notification capability introduces a new product and runtime pattern, so it has one active PRD:

| PRD | Workstream | Status |
| --- | --- | --- |
| [Operational Notifications and PWA Push](./notification-system.md) | Notification center, read status, optional PWA push, and reusable event policies | Active requirements |

Deferred Phase 4 and Phase 6 candidate work is tracked in the [ideation register](../ideation/README.md) until it is committed to an active phase.

Sidebar redesign is tracked in app-local design doc: [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) (Wave 1, incremental rollout).
