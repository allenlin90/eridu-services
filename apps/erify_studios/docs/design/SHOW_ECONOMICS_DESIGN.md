# Show Economics Frontend Design (2.3 consumer)

> **Status: Visioning — may be misaligned.** This design doc was written against the pre-simplification version of the Phase 4 cost model. The Phase 4 stack has since been narrowed to a read-only viewer (see [`economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)). Treat this document as roadmap reference: it is **not committed**, may contain assumptions that no longer hold, and will be rewritten when 2.3 activates.

> **Status**: 🔲 Planned — full design lands when 2.3 starts
> **Phase scope**: Phase 4 — Wave 2 (Cost Foundation)
> **Owner app**: `apps/erify_studios`
> **Authoritative spec**: [`docs/prd/economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md) — response shape, cost-state values, actuals priority cascade, three views.
> **Backend counterpart**: [`SHOW_ECONOMICS_DESIGN.md`](../../../erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md)

## Purpose

This is the FE consumer plan for the 2.3 economics service. The user-facing manager workspace lives in 3.1 ([`STUDIO_ECONOMICS_REVIEW_DESIGN.md`](./STUDIO_ECONOMICS_REVIEW_DESIGN.md)); the show-level drill-in lives on the existing show detail page. This doc covers the shared query-layer pattern both consumers use.

## Surfaces that consume the 2.3 endpoints

| Surface                                                  | Endpoint                                              | Owned by |
| -------------------------------------------------------- | ----------------------------------------------------- | -------- |
| Show detail / assignment-side embedded economics card    | `GET /studios/:studioId/shows/:showUid/economics`     | This doc |
| Manager review / export workspace                        | `GET /studios/:studioId/economics` (grouped)          | 3.1      |

## Query-layer rules

- Query key family: `economics`, scoped by `studioId` and the request shape.
- Response shape preserves backend nullability per [cost-model §9](../../../../docs/prd/economics-cost-model.md#9-nullability-bubbling) and §11. FE renders `null` as explicit unresolved state, never as `0`.
- `cost_state` drives row coloring / labeling (`PROJECTED`, `ACTUALIZED`, `PARTIAL_ACTUAL`, `UNRESOLVED`). UI surfaces `unresolved_reason` whenever a row is partial or unresolved.
- `actuals_source` and `available_sources` are exposed in row detail views per [cost-model §4](../../../../docs/prd/economics-cost-model.md#4-actuals-priority-cascade) — the user can see which source drove the calculation and what the other recorded sources said.
- `actuals_approval_state` is exposed; pre-approval values render with a "pending review" tag per [cost-model §6](../../../../docs/prd/economics-cost-model.md#6-actuals-approval).
- `grace_applied` indicator is exposed when grace normalized actuals to scheduled per [cost-model §7](../../../../docs/prd/economics-cost-model.md#7-grace-time-configuration).
- Frozen agreement total and post-freeze adjustment total are surfaced separately, never collapsed.
- Monetary numbers come from the API as `Prisma.Decimal`-serialized strings. FE formats for display only; never sums or computes locally.

## UX rules

- Loading, empty, null, and partial-actual states are explicit on every economics surface.
- The show-level embedded card is intentionally lightweight — a compact summary, not the manager review workspace. Heavy filtering / export lives in 3.1.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`

## Traceability

- 2.1 cost model: [`economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)
- 2.2 line items + freeze + actuals: [`compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md)
- 3.1 review engine: [`STUDIO_ECONOMICS_REVIEW_DESIGN.md`](./STUDIO_ECONOMICS_REVIEW_DESIGN.md)
- Phase 4 roadmap: [`docs/roadmap/PHASE_4.md`](../../../../docs/roadmap/PHASE_4.md)
