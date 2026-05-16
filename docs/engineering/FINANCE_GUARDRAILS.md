# Finance Guardrails

Platform-level rules for monetary computation, financial storage, and audit. These rules outlast any single phase — they apply whenever code touches money or snapshot data.

The Phase 4 cost model in [`docs/domain/economics-cost-model.md`](../domain/economics-cost-model.md) is the concrete contract these guardrails support. Other phases and future workstreams (revenue, payments, reconciliation) must also conform.

## 1. Finance arithmetic is owned by economics services and calculators

Controllers stay transport-only (authz, DTO parsing, response shaping). Orchestration services coordinate flows but do not own financial formulas.

## 2. Monetary arithmetic uses decimal libraries end-to-end

Do not convert to JS `Number` before aggregation or display formatting. Backend money values use `Prisma.Decimal` (backed by `decimal.js`, ships with `@prisma/client`). Frontend money formatting uses `Big` from `big.js`. Serialize money to string at the API boundary, and reject JS-number inputs in shared decimal serializers (`decimalToString` on the backend, `toDecimalDisplayString` on the frontend). `toFixed(2)` is forbidden inside aggregation paths unless it is called on an approved decimal-library value (`Prisma.Decimal` or `Big`).

## 3. Polymorphic discriminators on financial tables use Prisma enums where cleanly supported

Applies to the compensation line-item attachment discriminator and any future financial / audit-bearing tables. Use the repo's `TaskTarget` pattern as the local Prisma polymorphism reference, but do not migrate `TaskTarget` itself.

## 4. Historical cost inputs are snapshot-on-write

`StudioShift.hourlyRate` and `ShowCreator.agreedRate` (plus `compensationType` and `commissionRate`) are persisted at the moment of assignment from explicit input or roster defaults, and never rewritten by source-table edits to `StudioMembership.baseHourlyRate` or `StudioCreator.defaultRate`.

Snapshot fields are intended-immutable: ADMIN/MANAGER may update them through the normal endpoint with an FE warning; each update appends an audit entry to the entity's `metadata` column. No separate audit table.

Recorded actual / performance / revenue facts live on their narrowest meaningful entity scope (`Show`, `ShowCreator`, `ShowPlatform`, `StudioShiftBlock`). Projection arithmetic is computed live, not cached.

## 5. Aggregation queries exclude soft-deleted rows by default

An explicit `includeDeleted` flag is permitted only on admin / audit surfaces.

## 6. Self-access uses the existing `/me/` module

Endpoints where a user reads their own data live under `/me/<resource>` (`apps/erify_api/src/me/`) and derive identity from auth context. Cross-user reads (admin viewing another user's data) live under studio-scoped routes with role guards. Do not invent new self-access decorators or per-endpoint identity checks.

## 7. Economics aggregation services ship with fixture-based tests

Coverage includes the actuals priority cascade resolution, null-bubbling cases at each grain, and the read shape defined in [economics-cost-model.md](../domain/economics-cost-model.md). No cost-state machine — tests target the calculator's resolved-vs-unresolved branches directly.

## 8. Symmetry by default across parallel entities

When two entities share an architectural pattern (e.g., `ShowCreator` and `StudioShift` both use snapshot + line items + actuals + audit), they share a UX pattern by default. Asymmetry is a deliberate, documented decision with a written reason. New plans must run the symmetry diff in [`.agent/skills/plan-workflow-completeness/`](../../.agent/skills/plan-workflow-completeness/SKILL.md) before sign-off.

## 9. Every snapshot field has a documented post-creation edit path with audit

Snapshot-on-write fields (`ShowCreator.{agreedRate, compensationType, commissionRate}`, `StudioShift.hourlyRate`) must ship with:

- the write path that creates the snapshot,
- the edit path that updates it after creation via `appendSnapshotAudit()`,
- the UI surface that exposes the edit to the right role.

A snapshot without an edit path produces data managers cannot correct without admin intervention and must be flagged as a planning bug.
