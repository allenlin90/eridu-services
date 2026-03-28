# PRD: Studio Creator Profile Editing

> **Status**: Active
> **Phase**: 5 — Candidate (Studio Autonomy track)
> **Workstream**: Studio self-service — creator profile management
> **Depends on**: Studio Creator Onboarding — ✅ tracked (`docs/prd/studio-creator-onboarding.md`)
> **Blocks**: None (workaround exists via system admin)

## Problem

Studios can manage creator roster entries (compensation defaults, active state) but cannot edit a creator's **profile information** — name, alias, or user linkage. These fields live on the global `Creator` model and are only editable via `/admin/creators`.

Current state:

- `/admin/creators` (PATCH) can update: `name`, `aliasName`, `isBanned`, `metadata`, `userId`, `defaultRate`, `defaultRateType`, `defaultCommissionRate`.
- `/studios/:studioId/creators/:creatorId` (PATCH) can update: `defaultRate`, `defaultRateType`, `defaultCommissionRate`, `isActive`, `metadata` — all on the `StudioCreator` roster entry, not the global `Creator`.
- Studios cannot update a creator's display name, alias, ban status, or user linkage.

Consequences today:

- If a creator changes their stage name, a system admin must update the global `Creator` record.
- If a creator needs to be linked to a user account post-onboarding, a system admin must set the `userId`.
- Studios that onboard creators (once the onboarding PRD ships) can create the global record but cannot correct mistakes afterward.
- The ban mechanism (`isBanned`) is system-admin-only, which is appropriate for cross-studio governance — but basic profile corrections should not require escalation.

### Scope Decision: Which Fields Should Studios Edit?

| Field | Studio Edit? | Rationale |
| --- | --- | --- |
| `name` | ✅ Yes | Profile correction; common need |
| `aliasName` | ✅ Yes | Stage name changes frequently |
| `metadata` | ✅ Yes | Studio-relevant operational data |
| `userId` | ⚠️ Conditional | Only if creator was onboarded by the studio and has no existing user link |
| `isBanned` | ❌ No | Cross-studio governance; system admin only |
| `defaultRate` / `defaultRateType` / `defaultCommissionRate` | ❌ No | Global defaults should be set by system admin; studios use `StudioCreator` overrides |

## Users

- **Studio ADMIN** (primary): edit creator name, alias, metadata for rostered creators
- **System Admin**: retains full edit capability including ban status and global compensation defaults

## Requirements

### In Scope

1. **Studio-scoped creator profile editing**
   - Studio admins can update `name`, `aliasName`, and `metadata` on the global `Creator` for creators in their active roster.
   - Edits affect the global record (all studios see the updated name/alias).
   - Requires the creator to be in the studio's active roster (not just in the global catalog).

2. **User linkage (conditional)**
   - Studio admins can set `userId` on a creator they onboarded, only if `userId` is currently null.
   - Once a user link is established, only system admins can change it.

3. **Audit trail**
   - Track which studio initiated the profile edit (via standard audit fields or metadata).

### Out of Scope

- Ban/unban at studio level (system admin governance)
- Global compensation default editing at studio level (use `StudioCreator` overrides)
- Creator merge/deduplication
- Bulk profile updates
- Creator profile photos or extended bio fields

## API Shape

### New Studio Endpoint

```http
PATCH /studios/:studioId/creators/:creatorId/profile
```

Request:
```json
{
  "name": "Updated Name",
  "alias_name": "New Stage Name",
  "metadata": { "notes": "Name change effective April 2026" },
  "user_id": "user_abc123"
}
```

All fields optional. `user_id` accepted only when current value is null.

### Role Access

| Operation | ADMIN | MANAGER | TALENT_MANAGER | MEMBER |
| --- | --- | --- | --- | --- |
| Edit profile | ✅ | ❌ | ❌ | ❌ |

### Error Codes

| Code | HTTP Status | Condition |
| --- | --- | --- |
| `CREATOR_NOT_IN_ROSTER` | 422 | Creator is not in the studio's active roster |
| `USER_ALREADY_LINKED` | 400 | Attempting to set `user_id` when creator already has a linked user |
| `USER_NOT_FOUND` | 404 | Provided `user_id` does not exist |

## Acceptance Criteria

- [ ] Studio ADMIN can update `name`, `aliasName`, and `metadata` for active roster creators.
- [ ] Profile edits affect the global `Creator` record.
- [ ] Studio ADMIN can set `userId` only when currently null.
- [ ] Non-rostered creators return 422.
- [ ] `isBanned` is not editable at studio level.
- [ ] Global compensation defaults are not editable at studio level.
- [ ] `/admin/creators` retains full edit capability.
- [ ] MANAGER, TALENT_MANAGER, and MEMBER roles cannot edit profiles (403).

## Design Reference

- Backend design: create with implementation PR under `apps/erify_api/docs/design/`
- Frontend design: create with implementation PR under `apps/erify_studios/docs/design/`
- Related: Studio Creator Onboarding PRD (`docs/prd/studio-creator-onboarding.md`)
- Related admin controller: `apps/erify_api/src/admin/creators/admin-creator.controller.ts`
