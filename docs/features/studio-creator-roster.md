# Feature: Studio Creator Roster Management

> **Status**: ✅ Implemented — Phase 4 Wave 1, 2026-03-28
> **Workstream**: Studio operator governance — L-side creator cost defaults
> **Canonical docs**: [Backend reference](../../apps/erify_api/docs/STUDIO_CREATOR_ROSTER.md), [Frontend reference](../../apps/erify_studios/docs/STUDIO_CREATOR_ROSTER.md)
> **Implementation refs**: [API types](../../packages/api-types/src/studio-creators/schemas.ts), [BE controller](../../apps/erify_api/src/studios/studio-creator/studio-creator.controller.ts), [BE service](../../apps/erify_api/src/models/studio-creator/studio-creator.service.ts), [FE route](../../apps/erify_studios/src/routes/studios/$studioId/creators.tsx), [FE table](../../apps/erify_studios/src/features/studio-creator-roster/components/studio-creator-roster-table.tsx)

## Problem

Studio operators could map creators to shows, but they could not maintain the studio roster that owns creator-side fallback compensation. That left `StudioCreator.defaultRate`, `defaultRateType`, and `defaultCommissionRate` effectively admin-managed even though they are the intended studio-scoped inputs for future show economics when no per-show `ShowCreator` override exists.

## Users

| Role | Need |
| --- | --- |
| Studio Admin | Add creators to the studio roster, maintain default compensation, activate/deactivate roster entries |
| Studio Manager | Read-only roster visibility for planning and operations |
| Studio Talent Manager | Read-only roster visibility for creator assignment planning |

## What Was Delivered

- Canonical roster API cut over to `GET /studios/:studioId/creators` with matching `POST` and `PATCH` write routes.
- Studio roster page at `/studios/$studioId/creators` under the **Creators** sidebar group.
- Read access for `ADMIN`, `MANAGER`, and `TALENT_MANAGER`; write actions restricted to `ADMIN`.
- Catalog-based add flow with roster-state awareness: new creators can be added, inactive entries can be reactivated, and active duplicates are rejected.
- Studio-scoped default compensation management on `StudioCreator` with non-negative `default_rate`, compensation-type validation, and optimistic concurrency via `version`.
- Active/inactive roster management with inactive creators excluded from creator-availability discovery and rejected by bulk assignment writes.
- Compatibility-preserving creator catalog contract with both `is_rostered` and `roster_state`.

## Key Product Decisions

- **StudioCreator is the fallback source of truth**: creator-side cost fallback is studio-scoped, not global on `Creator`.
- **Creator-first public routing**: `PATCH /studios/:studioId/creators/:creatorId` uses the public creator UID; the backend resolves the unique studio roster row from `studioId + creatorId`.
- **Reactivation instead of duplication**: re-adding an inactive creator restores the existing `StudioCreator` row and updates defaults.
- **Full roster enforcement shipped in PR #32**: inactive roster creators are blocked from discovery and assignment writes; creators with no roster row at all are now rejected with `CREATOR_NOT_IN_ROSTER` at assignment write time. Full overlap/conflict enforcement remains in creator-availability hardening.
- **Version-guarded updates**: roster edits require the current `version` and return `VERSION_CONFLICT` on stale writes.

## Acceptance Record

- [x] List endpoint returns creator identity, active status, `default_rate`, `default_rate_type`, `default_commission_rate`, and `version`.
- [x] Admin can add a creator from the system catalog; unknown creators return `CREATOR_NOT_FOUND`.
- [x] Admin can reactivate an inactive creator without creating a duplicate roster row.
- [x] Admin can update default compensation fields with non-negative rate validation and cross-field compensation rules.
- [x] Admin can activate or deactivate a creator from the roster surface.
- [x] Inactive roster creators are excluded from availability discovery and rejected by bulk assignment writes.
- [x] Creator catalog exposes `roster_state` while retaining `is_rostered` for compatibility.
- [x] Manager and Talent Manager remain read-only on the roster surface.
- [x] The frontend handles `409 VERSION_CONFLICT` by refetching and prompting user review instead of silently overwriting.

## Forward References

- Creator assignment flows: [creator-mapping.md](./creator-mapping.md)
- Studio onboarding (brand-new creators): [studio-creator-onboarding.md](./studio-creator-onboarding.md)
- Show economics fallback contract: [show-economics.md](./show-economics.md)
- Full overlap/conflict enforcement: [creator-availability-hardening.md](../prd/creator-availability-hardening.md)
- Supplemental compensation: [compensation-line-items.md](../prd/compensation-line-items.md)
