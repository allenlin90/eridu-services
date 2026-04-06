# Studio Creator Onboarding

> **Status**: ✅ Implemented — Phase 4 Wave 1
> **Owner app**: `apps/erify_api`

## Purpose

Studio-owned creator onboarding without `/system/*` dependency:

- Create a brand-new global `Creator` plus active `StudioCreator` row in one atomic studio-scoped action
- Expose a studio-guarded user lookup for optional `user_id` linking during onboarding
- Fix the pre-existing roster-enforcement gap in show assignment so off-roster creators are rejected at write time

## API Surface

### `POST /studios/:studioId/creators/onboard`

Creates a new global `Creator` and a new active `StudioCreator` roster row in one transaction.

**Guard**: `@StudioProtected([STUDIO_ROLE.ADMIN])`

**Request**

```json
{
  "creator": {
    "name": "Alice Example",
    "alias_name": "Alice",
    "user_id": "user_123",
    "metadata": {}
  },
  "roster": {
    "default_rate": 500,
    "default_rate_type": "FIXED",
    "default_commission_rate": null,
    "metadata": {}
  }
}
```

**Response**: `201 Created` — returns the canonical `StudioCreatorRosterItem` DTO.

**Error behavior**

| HTTP  | Condition                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------- |
| `404` | Provided `user_id` does not exist                                                                                      |
| `400` | Provided `user_id` is already linked to another creator — preserves existing `CreatorService.createCreator()` behavior |
| `422` | Invalid payload or invalid compensation combination                                                                    |

### `GET /studios/:studioId/creators/onboarding-users`

Studio-scoped user lookup for optional creator-to-user linking during onboarding.

**Guard**: `@StudioProtected([STUDIO_ROLE.ADMIN])`

**Query**: `?search=alice&limit=20` — `search` required (min 1 char), `limit` optional (default 20, max 50)

**Response**: `200 OK` — array of `userApiResponseSchema` items.

**Lookup rules**:
- Search across `uid`, `email`, `name`, `ext_id`
- Exclude soft-deleted users
- Exclude users linked to an active (non-soft-deleted) creator
- Include users whose only creator link is soft-deleted
- Order: `name asc`, then `email asc`

This endpoint exists because `/admin/users` is not valid for studio-admin-owned flows.

### Assignment Enforcement Fix

No new endpoint. Fix applied to `ShowOrchestrationService.bulkAssignCreatorsToShow`.

| Code                         | HTTP  | Condition                                                             |
| ---------------------------- | ----- | --------------------------------------------------------------------- |
| `CREATOR_NOT_IN_ROSTER`      | `422` | Creator exists globally but has no `StudioCreator` row for the studio |
| `CREATOR_INACTIVE_IN_ROSTER` | `422` | Creator has a `StudioCreator` row but it is inactive                  |

## Design Decisions

- `StudioCreatorService` owns the onboarding transaction — the desired outcome is an active studio roster row; global creator creation is a prerequisite step inside that workflow.
- `user_id` stays optional, but if supplied it must be validated through a studio-safe lookup path rather than `/admin/users`.
- No new onboarding-specific duplicate-user-link error code. Preserves the existing `CreatorService.createCreator()` behavior when a user is already linked to another creator.
- Roster-first enforcement happens in the write path immediately. Overlap/conflict logic remains in the separate creator-availability hardening scope.
- Off-roster enforcement is write-path-only here; overlap enforcement remains in creator-availability hardening.
