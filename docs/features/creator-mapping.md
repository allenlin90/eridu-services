# Feature: Creator Mapping & Talent Operations

> **Status**: ✅ Shipped — Phase 4
> **Workstream**: 2
> **Canonical docs**: No per-feature design doc retained (shipped before per-feature design doc pattern was established)

## Problem

Talent managers assigned creators to shows one at a time through system-admin endpoints or via Google Sheets import. For 100+ shows per month this was slow, error-prone, and offered no visibility into creator availability or booking conflicts.

## Users

- **Talent managers**: map creators to shows, check availability, manage assignments
- **Studio admins / managers**: oversight of creator-show assignments across the studio

## What Was Delivered

### Bulk creator-to-show mapping

- Assign multiple creators to a show in one operation (`POST /studios/:studioId/shows/:showId/creators/bulk-assign`)
- Idempotent — skips existing active assignments, restores soft-deleted ones
- **Assignment-only payload** since Task 5 (PR #64): the endpoint accepts `{ creator_id, note?, metadata? }` per creator. `agreed_rate`, `compensation_type`, `commission_rate`, and `override_reason` were removed because per-show terms belong on the per-show compensation surface, not on a multi-show assignment write.
- Summary response: `{ assigned, skipped, failed }`
- Max 50 creators per call
- Accessible to: `ADMIN`, `MANAGER`, `TALENT_MANAGER`

### Studio-scoped creator endpoints

- `GET /studios/:studioId/shows/:showId/creators` — list creators assigned to a show; each row's `id` is the `ShowCreator` assignment UID used as `target_id` for `SHOW_CREATOR` line items
- `GET /studios/:studioId/shows/:showId/creators/compensation-summary` — backend-calculated per-MC base, adjustment, total, plus a show-level total and unresolved count (`ADMIN`/`MANAGER` only)
- `DELETE /studios/:studioId/shows/:showId/creators/:creatorId` — remove a creator from a show
- `GET /studios/:studioId/creators/catalog` — browse all creators (rostered + non-rostered); includes `default_rate`, `default_rate_type`, `default_commission_rate` per creator since Task 5
- `GET /studios/:studioId/creators` — studio creator roster (active by default; filterable)
- `GET /studios/:studioId/creators/availability` — creators not booked in a date window; includes roster defaults since Task 5

### Compensation fields and fallback contract

Per-show compensation inputs live on `ShowCreator` and are consumed by the Wave 2 economics service per the canonical contract in [`economics-cost-model.md`](../domain/economics-cost-model.md); remaining 2.3 calculator work is tracked in [`PHASE_4.md`](../roadmap/PHASE_4.md):

| Field | Description |
| --- | --- |
| `agreedRate` | Per-show fixed rate snapshot (resolved from `StudioCreator.defaultRate` on assignment when no purpose-built compensation edit workflow supplies an explicit value) |
| `compensationType` | `FIXED`, `COMMISSION`, or `HYBRID` |
| `commissionRate` | Commission percentage (0–100); `FIXED` type uses `agreedRate` only |

Studio-scoped creator defaults live on `StudioCreator`: `defaultRate`, `defaultRateType`, `defaultCommissionRate`.

The bulk-assign endpoint **no longer carries** these compensation fields (Task 5). Assignments resolve their snapshot server-side from creator roster defaults; Task 8 owns explicit per-assignment term edits. Supplemental adjustments on top of an assigned creator are managed as `SHOW_CREATOR` line items via `/studios/:studioId/compensation-line-items` with `target_id=<ShowCreator assignment uid>`. The compensation summary endpoint above is the single read source for totals; the frontend does not compute money locally.

For `HYBRID` and `COMMISSION` assignments the compensation summary returns `total_amount: null` with `unresolved_reason: COMMISSION_REVENUE_NOT_AVAILABLE` and counts them in `unresolved_count`, since the total cannot be computed without future revenue input. Rows missing snapshot fields surface as `AGREEMENT_SNAPSHOT_MISSING`.

## Key Product Decisions

- Creators are **not** studio-scoped — a creator can work across multiple studios.
- `metadata` on `ShowCreator` is opaque JSON for audit/operations context (`source`, `operator_note`, `tags`) — not compensation rule execution logic.
- **Assignment writes are roster-first** (shipped PR #32): `bulkAssignCreatorsToShow` rejects creators with no studio roster row (`CREATOR_NOT_IN_ROSTER`) and creators with an inactive row (`CREATOR_INACTIVE_IN_ROSTER`). Already-assigned creators are idempotently skipped before any roster check.
- Creator **discovery** remains loose/broad — `GET /studios/:studioId/creators/availability` does not yet filter by roster membership; full discovery-side gating is deferred to creator-availability hardening.
- HRMS for leaves/unavailability is future — current availability is show-booking conflict only.

## Acceptance Record

- [x] Talent manager can bulk-assign creators to shows via studio endpoint
- [x] Duplicate creator-show assignments are silently skipped
- [x] Creator availability query returns unbooked creators for a window
- [x] Shows detail page displays assigned creators with add/remove actions
- [x] Assignment dialog shows availability status per creator
- [x] Assignment write rejects off-roster creators with typed `CREATOR_NOT_IN_ROSTER` error (PR #32)
- [x] Assignment write rejects inactive roster creators with typed `CREATOR_INACTIVE_IN_ROSTER` error
- [x] Mapping UI surfaces readable roster failure copy and role-aware onboarding guidance (PR #32)
- [x] Bulk assignment dialog stays open when errors remain that require user action (PR #32)
- [x] Bulk assignment is assignment-only — no rate/commission/compensation-item fields in payload (PR #64)
- [x] Per-show creator mapping renders backend-calculated compensation totals and manages `SHOW_CREATOR` line items by assignment UID (PR #64)
- [x] `HYBRID` and `COMMISSION` rows return `total_amount: null` with `COMMISSION_REVENUE_NOT_AVAILABLE` until revenue is available (PR #64)

## Forward References

- Studio onboarding (resolving off-roster failures): [studio-creator-onboarding.md](./studio-creator-onboarding.md)
- Full discovery-side gating: [PHASE_4.md §PR 15](../roadmap/PHASE_4.md#pr-15--strict-mode-creator-availability-with-conflict-metadata)
