# Feature: Creator Mapping & Talent Operations

> **Status**: ✅ Shipped — Phase 4
> **Workstream**: 2
> **Canonical docs**: [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md), [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md)

## Problem

Talent managers assigned creators to shows one at a time through system-admin endpoints or via Google Sheets import. For 100+ shows per month this was slow, error-prone, and offered no visibility into creator availability or booking conflicts.

## Users

- **Talent managers**: map creators to shows, check availability, manage assignments
- **Studio admins / managers**: oversight of creator-show assignments across the studio

## What Was Delivered

### Bulk creator-to-show mapping

- Assign multiple creators to a show in one operation (`POST /studios/:studioId/shows/:showId/creators/bulk-assign`)
- Idempotent — skips existing active assignments, restores soft-deleted ones
- Summary response: `{ assigned, skipped, failed }`
- Max 50 creators per call
- Accessible to: `ADMIN`, `MANAGER`, `TALENT_MANAGER`

### Studio-scoped creator endpoints

- `GET /studios/:studioId/shows/:showId/creators` — list creators assigned to a show
- `DELETE /studios/:studioId/shows/:showId/creators/:creatorId` — remove a creator from a show
- `GET /studios/:studioId/creators/catalog` — browse all creators (rostered + non-rostered)
- `GET /studios/:studioId/creators/roster` — studio's active creator roster
- `GET /studios/:studioId/creators/availability` — creators not booked in a date window

### Compensation fields

Per-show compensation inputs live on `ShowCreator` and are used by the economics layer (see [Show Economics PRD](../prd/show-economics.md)):

| Field | Description |
| --- | --- |
| `agreedRate` | Per-show fixed rate override (falls back to `Creator.defaultRate`) |
| `compensationType` | `FIXED`, `COMMISSION`, or `HYBRID` |
| `commissionRate` | Commission percentage (0–100); `FIXED` type uses `agreedRate` only |

Creator defaults: `Creator.defaultRate`, `Creator.defaultRateType`, `Creator.defaultCommissionRate`.

## Key Product Decisions

- Creators are **not** studio-scoped — a creator can work across multiple studios.
- `metadata` on `ShowCreator` is opaque JSON for audit/operations context (`source`, `operator_note`, `tags`) — not compensation rule execution logic.
- Creator availability check is currently **loose** (discoverability mode). Strict overlap-conflict enforcement is deferred to Phase 5 (see [PHASE_5.md](../roadmap/PHASE_5.md)).
- HRMS for leaves/unavailability is future — current availability is show-booking conflict only.

## Acceptance Record

- [x] Talent manager can bulk-assign creators to shows via studio endpoint
- [x] Duplicate creator-show assignments are silently skipped
- [x] Creator availability query returns unbooked creators for a window
- [x] Shows detail page displays assigned creators with add/remove actions
- [x] Assignment dialog shows availability status per creator
