# Show Economics Backend Design (2.3)

> **Status: Visioning — may be misaligned.** This design doc was written against the pre-simplification version of the Phase 4 cost model. The Phase 4 stack has since been narrowed to a read-only viewer (see [`economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)). Treat this document as roadmap reference: it is **not committed**, may contain assumptions that no longer hold, and will be rewritten when 2.3 activates.

> **Status**: 🔲 Planned — full design lands when 2.3 starts
> **Phase scope**: Phase 4 — Wave 2 (Cost Foundation)
> **Owner app**: `apps/erify_api`
> **Authoritative spec**: [`docs/prd/economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md) — contract model, freeze semantics, actuals priority cascade, cost-state machine, nullability bubbling, response shape, three views.
> **Depends on**: 2.1 Economics Cost Model (docs locked), 2.2 Compensation Line Items + Freeze + Actuals (data model, freeze guards, actuals fields)

## Purpose

This design covers the greenfield economics service for Phase 4. It implements the cost model defined in 2.1 and consumes the line-item / actuals / freeze surface from 2.2. The full design (endpoint shapes, query plans, service decomposition, fixture set) is written when the workstream starts.

## Scope

- Show-level cost breakdown and grouped (schedule / client / platform-filter) reads.
- Cost-state computation per [cost-model §2](../../../../docs/prd/economics-cost-model.md#2-cost-state-machine).
- Actuals priority cascade resolution per [cost-model §4](../../../../docs/prd/economics-cost-model.md#4-actuals-priority-cascade) (both show-time and shift-block-time cascades).
- Approval gating per [cost-model §6](../../../../docs/prd/economics-cost-model.md#6-actuals-approval) — `cost_state` reaches `ACTUALIZED` only when actuals are approved (and other inputs resolve).
- Grace-window normalization per [cost-model §7](../../../../docs/prd/economics-cost-model.md#7-grace-time-configuration).
- Null-bubbling rollups per [cost-model §9](../../../../docs/prd/economics-cost-model.md#9-nullability-bubbling).
- Response fields per [cost-model §11](../../../../docs/prd/economics-cost-model.md#11-response-shape-implications).
- Live-projection arithmetic for shift labor (`hourlyRate × scheduled minutes` for projections; `hourlyRate × approved effective actual minutes` for actualized rows); `StudioShift.projectedCost` is dropped by 2.2 and not consumed here.

## Out of scope (owned elsewhere)

- Line-item CRUD, freeze guards, assignment-time creator agreement snapshots, actuals fields, and approval routes — owned by 2.2.
- Per-creator and per-member compensation views — owned by 2.2.
- Manager-facing perspective-based review/export workspace — owned by 3.1.
- Show planning export preset — owned by 3.2.
- Revenue inputs and commission resolution — owned by 4.1.

## API Surface (preliminary)

| Endpoint                                          | Purpose                                             |
| ------------------------------------------------- | --------------------------------------------------- |
| `GET /studios/:studioId/shows/:showUid/economics` | Show-level cost breakdown (drill-in target for 3.1) |
| `GET /studios/:studioId/economics`                | Grouped summary (`group_by=show                     | schedule | client`) |

Endpoint contracts are finalized when the design doc is filled in. Both endpoints follow the response-shape rules in cost-model §11.

## Service shape (planned)

- Finance arithmetic lives in a dedicated economics calculator module per Architecture Guardrail 1.
- All monetary composition uses `Prisma.Decimal` per Architecture Guardrail 2.
- Repository helpers return lean creator / shift / show / schedule slices; the calculator composes them.
- Show-level and grouped reads share the same per-show cost-resolution helper so precedence and nullability rules stay identical.
- Fixture-based tests cover every worked example in [cost-model §12](../../../../docs/prd/economics-cost-model.md#12-worked-examples) per Architecture Guardrail 7.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`

## Traceability

- 2.1 cost model: [`economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)
- 2.2 line items + freeze + actuals: [`compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md) and [`COMPENSATION_LINE_ITEMS_DESIGN.md`](./COMPENSATION_LINE_ITEMS_DESIGN.md)
- 3.1 review engine: [`STUDIO_ECONOMICS_REVIEW_DESIGN.md`](./STUDIO_ECONOMICS_REVIEW_DESIGN.md)
- Phase 4 roadmap: [`docs/roadmap/PHASE_4.md`](../../../../docs/roadmap/PHASE_4.md)
- Architecture guardrails: [`PHASE_4.md#architecture-guardrails`](../../../../docs/roadmap/PHASE_4.md#architecture-guardrails)
