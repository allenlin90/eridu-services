# Phase 4 P&L Backend Feature Description

> **Status**: Active — mapping foundation shipped; economics baseline developed (merge deferred); extended scope in progress
> **Phase scope**: Phase 4 P&L workstreams
> **Owner app**: `apps/erify_api`

## Purpose

Define backend feature behavior, contracts, and data-flow rules for Phase 4 P&L delivery: creator mapping + assignment (shipped), economics baseline (developed, merge deferred), and extended scope (roster management, planning export, availability hardening, revenue workflow).

## Scope

### Mapping + Assignment Foundation (Shipped)

- Studio-scoped creator catalog/roster reads for assignment UX.
- Creator assignment payload normalization for show-level operations.
- Compensation inputs required by economics (`agreed_rate`, `compensation_type`, `commission_rate`).

### Economics Baseline (Developed — merge deferred to after Wave 1)

- Show-level and grouped variable cost endpoints (creator costs + shift labor costs).
- `COMMISSION`/`HYBRID` yield `null` computed cost (revenue side in Wave 3).
- Creator cost precedence: `ShowCreator.agreedRate` → `Creator.defaultRate`.
- Shift cost proportionally attributed by block overlap with show time window.

### Extended Scope (Active — Waves 1–3)

- Studio member roster CRUD with `baseHourlyRate` editing.
- Studio creator roster write endpoints with compensation defaults and version-guarded updates.
- Show planning export with estimated cost column.
- Creator availability strict mode (overlap + roster conflict enforcement).
- P&L revenue workflow (GMV/sales input, commission cost activation) — Wave 3, pending design decisions.

## Domain Baseline

- Canonical entities:
  - `Creator`
  - `ShowCreator`
  - `StudioCreator`
  - `StudioMembership`
- Naming policy:
  - External API contracts are creator-first.
  - Internal storage compatibility fields may still be mapped at ORM layer.

## API Contract Plan

### Mapping data contracts + read paths

| Endpoint | Method | Purpose | Status |
| --- | --- | --- | --- |
| `/studios/:studioId/creators/catalog` | `GET` | Searchable creator catalog for assignment picker | ✅ Shipped |
| `/studios/:studioId/creators/roster` | `GET` | Studio creator roster listing (read-only) | ✅ Shipped |
| `/studios/:studioId/creators/availability` | `GET` | Creator discovery endpoint (`date_from`, `date_to` accepted; `strict` mode in Wave 2) | ✅ Shipped (strict mode pending) |
| `/admin/show-creators` | `POST/PATCH` | Persist show-creator assignment with compensation fields | ✅ Shipped |

Required `show-creator` write fields:

- `creator_id`
- `agreed_rate` (optional)
- `compensation_type` (optional enum)
- `commission_rate` (optional percentage)
- `note`, `metadata` (optional)

### Mapping write paths

| Endpoint | Method | Purpose | Status |
| --- | --- | --- | --- |
| `/studios/:studioId/shows/:showUid/creators` | `GET` | List creators assigned to one show for detail operations | ✅ Shipped |
| `/studios/:studioId/shows/:showUid/creators/bulk-assign` | `POST` | Bulk mapping creators to one show | ✅ Shipped |
| `/studios/:studioId/shows/:showUid/creators/:creatorUid` | `DELETE` | Remove one mapping | ✅ Shipped |

Behavior requirements:

- Idempotent duplicate handling for bulk assignment.
- Bulk summary response uses `assigned`, `skipped`, and `failed`.
- `failed` items include `creator_id` + `reason` for actionable client feedback.
- Studio authorization via `@StudioProtected`.

### Economics APIs

| Endpoint | Method | Purpose | Status |
| --- | --- | --- | --- |
| `/studios/:studioId/shows/:showUid/economics` | `GET` | Show-level baseline economics breakdown | ✅ Shipped (`@preview` — pending revenue workflow) |
| `/studios/:studioId/economics` | `GET` | Grouped baseline economics view (`show\|schedule\|client`) | ✅ Shipped (`@preview` — pending revenue workflow) |
| `/studios/:studioId/performance` | `GET` | Grouped performance metrics | Deferred |

### Studio Member Roster APIs (Wave 1)

PRD: [studio-member-roster.md](../../../docs/prd/studio-member-roster.md)

| Endpoint | Method | Purpose | Status |
| --- | --- | --- | --- |
| `/studios/:studioId/members` | `GET` | List active studio memberships with user details and rates | 🔲 Wave 1 |
| `/studios/:studioId/members` | `POST` | Add member by email lookup from user catalog | 🔲 Wave 1 |
| `/studios/:studioId/members/:membershipId` | `PATCH` | Update role or `baseHourlyRate` | 🔲 Wave 1 |
| `/studios/:studioId/members/:membershipId` | `DELETE` | Soft-deactivate member | 🔲 Wave 1 |

Key behaviors:
- Self-demotion guard: ADMIN cannot demote their own membership (returns 422 `SELF_DEMOTION_NOT_ALLOWED`).
- Duplicate email invite returns 409 `MEMBER_ALREADY_EXISTS`.
- Re-invite after soft-delete restores the membership.

### Studio Creator Roster Write APIs (Wave 1)

PRD: [studio-creator-roster.md](../../../docs/prd/studio-creator-roster.md)

| Endpoint | Method | Purpose | Status |
| --- | --- | --- | --- |
| `/studios/:studioId/creators` | `GET` | List roster with compensation defaults (expanded from read-only) | ✅ Shipped (read); write pending |
| `/studios/:studioId/creators` | `POST` | Add creator from system catalog to studio roster | 🔲 Wave 1 |
| `/studios/:studioId/creators/:creatorId` | `PATCH` | Update compensation defaults or active status (version-guarded) | 🔲 Wave 1 |

Key behaviors:
- Catalog-only onboarding: creator must exist in system catalog.
- Version-guarded PATCH: stale `version` returns 409 `VERSION_CONFLICT`.
- Duplicate add returns 409 `CREATOR_ALREADY_IN_ROSTER`.
- Deactivation (not deletion): `is_active=false` excludes from assignment workflows.
- Re-add after deactivation restores the roster entry.

### Show Planning Export API (Wave 2)

PRD: [show-planning-export.md](../../../docs/prd/show-planning-export.md)

| Endpoint | Method | Purpose | Status |
| --- | --- | --- | --- |
| `/studios/:studioId/shows/planning-export` | `GET` | Paginated JSON rows or CSV download for pre-show planning | 🔲 Wave 2 |

Query parameters: `date_from` (required), `date_to` (required), `format` (`json`\|`csv`, default `json`), `client_uid`, `status`, `standard`, `page`, `limit`.

Key behaviors:
- One row per show with aggregated `assigned_creators` (comma-separated).
- `estimated_total_cost` column from economics service (nullable).
- 90-day max date range (returns 400 `DATE_RANGE_EXCEEDED` if exceeded).
- Soft-deleted shows excluded.
- CSV: snake_case headers, UTF-8 with BOM, null costs as empty string.

### Creator Availability Strict Mode (Wave 2)

PRD: [creator-availability-hardening.md](../../../docs/prd/creator-availability-hardening.md)

Extension to existing `GET /studios/:studioId/creators/availability`:

| Param | Behavior | Status |
| --- | --- | --- |
| `strict=false` (default) | Current behavior — broad discovery, no enforcement | ✅ Shipped |
| `strict=true&show_id=<id>` | Enforces overlap, roster membership, active status | 🔲 Wave 2 |

Key behaviors:
- `show_id` required when `strict=true` (returns 400 if missing).
- Per-creator conflict metadata: `is_conflicted`, `conflict_reason` (`OVERLAP` \| `NOT_IN_ROSTER` \| `INACTIVE`), `conflicting_show_id`.
- Priority order: overlap > not in roster > inactive.
- Assignment endpoint enforcement: returns 409 `CREATOR_OVERLAP_CONFLICT` or 422 `CREATOR_NOT_IN_ROSTER`.
- `include_inactive=true` includes inactive creators with `INACTIVE` conflict reason.

### P&L Revenue Workflow APIs (Wave 3)

PRD: [pnl-revenue-workflow.md](../../../docs/prd/pnl-revenue-workflow.md)

**Blocked on 4 design decisions — see PRD for recommended resolutions.**

Planned scope (pending decisions):
- `ShowPlatform` schema extension with `gmv` and `netSales` fields (recommended Option A).
- Revenue input PATCH endpoint on show-platform records.
- Economics service activation of COMMISSION/HYBRID cost computation.
- Contribution margin calculation in economics response.
- Removal of `@preview` markers.
- `big.js` adoption for all financial arithmetic.

## Authorization Conventions

| Endpoint group | Required roles |
| --- | --- |
| Catalog / roster / availability reads | `[ADMIN, MANAGER, TALENT_MANAGER]` |
| Show creator list read | `[ADMIN, MANAGER, TALENT_MANAGER]` |
| Bulk assign / remove creators | `[ADMIN, MANAGER, TALENT_MANAGER]` |
| Economics reads | `[ADMIN, MANAGER]` |
| Studio member roster reads | `[ADMIN, MANAGER]` |
| Studio member roster writes | `[ADMIN]` |
| Studio creator roster writes | `[ADMIN]` |
| Show planning export | `[ADMIN, MANAGER]` |

Metadata behavior:

- Assignment `metadata` is stored as opaque JSON and returned as-is.
- Allowed use: operational/audit context (for example `source`, `operator_note`, `tags`).
- Not allowed: executable business logic, formulas, or compensation rule configuration.

## Schema Migrations Required

### Wave 1 — StudioMembership

None. All required fields already exist in the schema.

### Wave 3 — ShowPlatform (pending design decision)

```prisma
gmv       Decimal? @map("gmv")       @db.Decimal(12, 2)
netSales  Decimal? @map("net_sales") @db.Decimal(12, 2)
```

## Architecture Rules

- Keep financial arithmetic in dedicated economics domain services/calculators.
- Keep controllers transport-focused only (authz, input parsing, response mapping).
- Orchestration services can compose service calls but must not contain finance formulas.
- Treat `metadata` as descriptive context only, not as a future compensation rule container.
- Complex compensation (bonus, tiered/volume commission, hybrid rule sets) is explicitly deferred.

## Validation + Rules

- Use zod DTOs from `@eridu/api-types` as request/response source of truth.
- No DB internal IDs in API responses.
- Baseline economics does not execute complex bonus/tiered/hybrid compensation formulas.
- Complex compensation logic is intentionally deferred to a dedicated profit module.
- Use consistent decimal-safe arithmetic strategy before production-grade financial claims (see `big.js` adoption in Wave 3).

## Verification Gate (backend)

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke for:
  - creator catalog/roster reads
  - show creator assignment with compensation fields
  - member roster CRUD with rate and role updates (Wave 1)
  - creator roster write with version guard (Wave 1)
  - planning export with economics cost column (Wave 2)
  - availability strict mode conflict detection (Wave 2)
  - economics endpoint after roster rate change → verify updated cost

## Traceability

- Product intent:
  - Creator mapping: shipped (PRD deleted per lifecycle)
  - Economics baseline: [show-economics.md](../../../docs/features/show-economics.md) (shipped)
  - Studio member roster: [studio-member-roster.md](../../../docs/prd/studio-member-roster.md)
  - Studio creator roster: [studio-creator-roster.md](../../../docs/prd/studio-creator-roster.md)
  - Show planning export: [show-planning-export.md](../../../docs/prd/show-planning-export.md)
  - Creator availability hardening: [creator-availability-hardening.md](../../../docs/prd/creator-availability-hardening.md)
  - P&L revenue workflow: [pnl-revenue-workflow.md](../../../docs/prd/pnl-revenue-workflow.md)
- Phase tracker: [PHASE_4.md](../../../docs/roadmap/PHASE_4.md)
