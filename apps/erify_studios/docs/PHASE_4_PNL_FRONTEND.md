# Phase 4 — Frontend Query-Key Families

> **Owner app**: `apps/erify_studios`
> **Phase doc**: [docs/roadmap/PHASE_4.md](../../../docs/roadmap/PHASE_4.md) — workstream tracker, PR roadmap, architecture guardrails, doc flow, DoD, verification gates.
> **Role visibility**: [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](./STUDIO_ROLE_USE_CASES_AND_VIEWS.md)

This file is the Phase-4 TanStack Query key family reference. Everything else (frontend rules, per-feature design index, verification gates) lives in [PHASE_4.md](../../../docs/roadmap/PHASE_4.md).

## Query-Key Families

Scope every query key by studio (and show / member / creator when relevant). Mutations invalidate the families they affect.

- `studio-members`
- `studio-creator-roster`
- `compensation-items`
- `member-compensation-view`
- `creator-compensation-view`
- `show-actuals`
- `shift-block-actuals`
- `economics`
- `planning-export` *(page-local serialization; see PR 1-2 in PHASE_4.md)*
- `creator-availability` / `creator-mapping`
