# Feature: Studio Member Roster Management

> **Status**: ✅ Shipped — Phase 4 Wave 1, PR #28, 2026-03-27
> **Workstream**: Studio operator governance — L-side labor cost inputs
> **Implementation refs**: [API types](../../packages/api-types/src/memberships/schemas.ts), [BE controller](../../apps/erify_api/src/studios/studio-membership/studio-members.controller.ts), [BE service](../../apps/erify_api/src/models/membership/studio-membership.service.ts), [FE route](../../apps/erify_studios/src/routes/studios/$studioId/members.tsx), [FE table](../../apps/erify_studios/src/features/studio-members/components/studio-members-table.tsx)

## Problem

Studio operators previously depended on system-admin-only membership tooling for routine roster changes. That blocked day-to-day operations and made it difficult to keep `StudioMembership.baseHourlyRate` accurate for shift labor cost inputs in the economics model.

## Users

| Role | Need |
| --- | --- |
| Studio Admin | Full roster management: add members, update roles, maintain hourly rates, remove access |
| Studio Manager | Read-only roster visibility for operational awareness |

## What Was Delivered

- Studio-scoped member roster page at `/studios/$studioId/members` under the **Studio Settings** sidebar group.
- Manager/Admin read access for active memberships with user name, email, role, hourly rate, and created timestamp.
- Admin-only write flows for add, edit, and remove actions from the roster UI and API.
- Email-based add-member workflow against the existing user catalog. Unknown users return `USER_NOT_FOUND`.
- Re-invite behavior for soft-deleted memberships: the membership is restored and updated instead of duplicated.
- Self-protection rules: admins cannot demote themselves and cannot remove their own membership from the roster surface.
- Non-negative `baseHourlyRate` management, including zero-value support.
- Soft-delete member removal so historical records remain intact while route access is revoked.

## Key Product Decisions

- **Soft delete only**: roster removal sets `deletedAt`; it does not hard-delete the membership.
- **No self-lockout from the roster surface**: self-demotion and self-removal are blocked.
- **Catalog lookup only**: the roster flow does not create new user accounts.
- **Rate-forward behavior**: roster rate changes are the maintained labor-cost input for future calculations; historical records are preserved.

## Acceptance Record

- [x] List endpoint returns active memberships with `user_name`, `user_email`, `role`, and `base_hourly_rate`.
- [x] Admin can add a member by email lookup; unknown users return `USER_NOT_FOUND`.
- [x] Admin can update another member role; self-demotion is blocked with `SELF_DEMOTION_NOT_ALLOWED`.
- [x] Admin can update `base_hourly_rate`; value must be non-negative and zero is valid.
- [x] Admin can remove a member; membership is soft-deleted and removed from roster access.
- [x] Manager is read-only; write routes are guarded for Admin only.
- [x] Role guards are enforced on all `/studios/:studioId/members` routes via `@StudioProtected`.
- [x] Historical records are preserved by soft delete and non-retroactive rate management.

## Forward References

- Shift labor cost semantics: [economics-cost-model.md](../prd/economics-cost-model.md)
- Creator-side cost input governance: [studio-creator-roster.md](./studio-creator-roster.md)
- Supplemental cost inputs: [compensation-line-items.md](../prd/compensation-line-items.md)
