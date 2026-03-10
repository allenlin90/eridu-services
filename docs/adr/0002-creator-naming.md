# ADR 0002: Canonical Creator Naming

- Status: Accepted
- Date: 2026-03-10
- Related roadmap: `docs/roadmap/PHASE_5.md`

## Context

The codebase still contains mixed `mc` and `creator` terminology across backend modules, API contracts, and frontend features.
This causes drift in DTO fields and increases rename/refactor risk.

## Decision

Use `Creator` as the canonical domain term across application code and contracts.

Rules:

1. Domain/service/repository/module naming should use `creator` terminology.
2. "MC" remains only as business classification metadata (for example `creatorType`), not as canonical entity naming.
3. New frontend feature code should consume creator-first field names (`creator_id`, `creator_name`, etc.).
4. During rollout, compatibility shims may map legacy `mc_*` payload fields to creator-first aliases at boundaries.

## Consequences

Positive:

- Reduces contract ambiguity and naming drift.
- Makes future schema and API changes easier to reason about.
- Aligns backend/frontend language with product-facing terminology.

Trade-offs:

- Temporary compatibility mapping is required during transition.
- Some duplicate fields/adapters will exist until full rollout is complete.
