# Phase 4 P&L Backend Feature Description

> **Status**: Completed for creator mapping foundation; economics deferred to next phase redesign
> **Phase scope**: Phase 4 P&L workstreams
> **Owner app**: `apps/erify_api`

## Purpose

Define backend feature behavior, contracts, and data-flow rules for Phase 4 P&L delivery after creator cutover is complete.

## Scope

### Mapping + Assignment Foundation

- Studio-scoped creator catalog/roster reads for assignment UX.
- Creator assignment payload normalization for show-level operations.
- Compensation inputs required by economics (`agreed_rate`, `compensation_type`, `commission_rate`).

### Economics Baseline + Rollout Ops

- Deferred to next phase redesign.
- Keep compensation input contracts for forward compatibility.
- Explicitly defer complex profit/performance execution logic.

## Domain Baseline

- Canonical entities:
  - `Creator`
  - `ShowCreator`
  - `StudioCreator`
- Naming policy:
  - External API contracts are creator-first.
  - Internal storage compatibility fields may still be mapped at ORM layer.

## API Contract Plan

### Mapping data contracts + read paths

| Endpoint | Method | Purpose | Status |
| --- | --- | --- | --- |
| `/studios/:studioId/creators/catalog` | `GET` | Searchable creator catalog for assignment picker | Implemented |
| `/studios/:studioId/creators/roster` | `GET` | Studio creator roster listing | Implemented |
| `/studios/:studioId/creators/availability` | `GET` | Creator discovery endpoint with optional search (`date_from`, `date_to` accepted; strict overlap enforcement deferred) | Implemented |
| `/admin/show-creators` | `POST/PATCH` | Persist show-creator assignment with compensation fields | Implemented |

Required `show-creator` write fields:

- `creator_id`
- `agreed_rate` (optional)
- `compensation_type` (optional enum)
- `commission_rate` (optional percentage)
- `note`, `metadata` (optional)

### Mapping write paths

| Endpoint | Method | Purpose | Status |
| --- | --- | --- | --- |
| `/studios/:studioId/shows/:showUid/creators` | `GET` | List creators assigned to one show for detail operations | Implemented |
| `/studios/:studioId/shows/:showUid/creators/bulk-assign` | `POST` | Bulk mapping creators to one show | Implemented |
| `/studios/:studioId/shows/:showUid/creators/:creatorUid` | `DELETE` | Remove one mapping | Implemented |

Behavior requirements:

- Idempotent duplicate handling for bulk assignment.
- Bulk summary response uses `assigned`, `skipped`, and `failed`.
- `failed` items include `creator_id` + `reason` for actionable client feedback.
- Studio authorization via `@StudioProtected`.

Authorization conventions for this domain:

| Endpoint group                        | Required roles                                |
| ------------------------------------- | --------------------------------------------- |
| Catalog / roster / availability reads | `[ADMIN, MANAGER, TALENT_MANAGER]`            |
| Show creator list read                | `[ADMIN, MANAGER, TALENT_MANAGER]`            |
| Bulk assign / remove creators         | `[ADMIN, MANAGER, TALENT_MANAGER]`            |
| Economics reads (planned)             | `[ADMIN, MANAGER]`                            |

Metadata behavior:

- Assignment `metadata` is stored as opaque JSON and returned as-is.
- Allowed use: operational/audit context (for example `source`, `operator_note`, `tags`).
- Not allowed: executable business logic, formulas, or compensation rule configuration.

### Economics APIs

| Endpoint | Method | Purpose | Status |
| --- | --- | --- | --- |
| `/studios/:studioId/shows/:showUid/economics` | `GET` | Show-level baseline economics breakdown | Deferred (next phase redesign) |
| `/studios/:studioId/economics` | `GET` | Grouped baseline economics view (`show|schedule|client`) | Deferred (next phase redesign) |
| `/studios/:studioId/performance` | `GET` | Grouped performance metrics | Deferred (next phase redesign) |

## Architecture Rules

- Keep financial arithmetic in dedicated economics domain services/calculators.
- Keep controllers transport-focused only (authz, input parsing, response mapping).
- Orchestration services can compose service calls but must not contain finance formulas.
- Treat `metadata` as descriptive context only, not as a future compensation rule container.

## Validation + Rules

- Use zod DTOs from `@eridu/api-types` as request/response source of truth.
- No DB internal IDs in API responses.
- Baseline economics does not execute complex bonus/tiered/hybrid compensation formulas.
- Complex compensation logic is intentionally deferred to a dedicated profit module.
- Use consistent decimal-safe arithmetic strategy before production-grade financial claims.

## Verification Gate (backend)

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api test`
- Targeted smoke for:
  - creator catalog/roster reads
  - show creator assignment with compensation fields

## Traceability

- Product intent: `docs/prd/creator-mapping.md`, `docs/prd/show-economics.md`
- Phase tracker: `docs/roadmap/PHASE_4.md`
