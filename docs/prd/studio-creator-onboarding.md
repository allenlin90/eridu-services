# PRD: Studio Creator Onboarding & Roster-First Assignment

> **Status**: Active
> **Phase**: 4 — Extended Scope
> **Workstream**: Creator operations — studio onboarding and roster governance completion
> **Depends on**: Studio Creator Roster — ✅ **Complete** (`docs/features/studio-creator-roster.md` provides studio-scoped roster/defaults and inactive-state enforcement)
> **Blocks**: Creator Availability Hardening, completion of studio creator management in Phase 4

## Problem

Phase 4 shipped studio creator roster CRUD and studio-side creator mapping, but the end-to-end onboarding workflow is still incomplete.

Current state:

- `/system/creators` is still the only shipped surface that can create a brand-new `Creator`, and `/system/*` is reserved for system admins.
- `POST /studios/:studioId/creators` only adds or reactivates an **existing** creator from the global catalog.
- Creator mapping can still assign creators who are not in the studio roster, so the roster is not the authoritative gate for assignment.

Consequences today:

- A studio admin cannot onboard a brand-new creator from the studio workspace without system-admin help.
- Studio-managed creator defaults on `StudioCreator` can be bypassed because show assignment does not require active roster membership.
- Managers and talent managers can assign a creator who was never intentionally onboarded to the studio.
- Phase 4 cannot honestly claim "studio creator management complete" while day-to-day onboarding still depends on `/system/*`.

Key unanswered questions:

- *"What should a studio admin do when a new creator does not exist in the catalog yet?"*
- *"Should creator mapping ever allow assignment of a creator who is not in the studio roster?"*
- *"How does a talent manager resolve a missing creator without leaving the studio workspace?"*

## Users

- **Studio ADMIN**: onboard brand-new creators, reactivate roster rows, maintain studio defaults
- **Studio MANAGER**: assign only active roster creators; no dependency on system-admin tools
- **Studio TALENT_MANAGER**: same as Manager for assignment; needs a clear handoff when a creator is missing
- **System Admin**: retains cross-system governance, but is no longer the required operator for routine studio talent intake

## Existing Infrastructure

| Surface / Model | Current Behavior | Status |
| --- | --- | --- |
| `/system/creators` | Global creator CRUD, system-admin only | ✅ Exists |
| `POST /studios/:studioId/creators` | Adds/reactivates an existing catalog creator in the studio roster | ✅ Exists |
| `GET /studios/:studioId/creators/catalog` | Returns rostered + non-rostered creators for discovery | ✅ Exists |
| `POST /studios/:studioId/shows/:showId/creators/bulk-assign` | Accepts existing creators; blocks inactive roster rows only | ✅ Exists (**⚠️ BUG**: only checks for inactive roster entries; creators with *no roster entry at all* are silently assigned — see Implementation Bug below) |
| `Creator` | Global creator identity shared across studios | ✅ Exists |
| `StudioCreator` | Studio-scoped creator roster, defaults, active state | ✅ Exists |

## Implementation Bug (Pre-Existing)

The current `bulkAssignCreatorsToShow` in `show-orchestration.service.ts` has a **roster enforcement gap**: it only filters for *inactive* roster entries but does not reject creators who have *no roster entry at all*. A creator not in the studio roster can be silently assigned to shows.

**Root cause** (lines ~185-232 of `show-orchestration.service.ts`):
```typescript
// Only builds a set of INACTIVE roster entries
const inactiveRosterCreatorIds = new Set(
  studioCreatorRosterEntries
    .filter((entry) => !entry.isActive)
    .map((entry) => entry.creator.uid)
);
// A creator with NO roster entry passes this check — not in the inactive set
```

**Fix required**: Add a `CREATOR_NOT_IN_ROSTER` check that compares the requested creator UIDs against the roster entries returned. Any creator UID not found in `studioCreatorRosterEntries` (regardless of active state) should be rejected with a `422 CREATOR_NOT_IN_ROSTER` error.

**Priority**: Should be fixed as part of this PRD's implementation, not deferred. The roster-first assignment enforcement in Requirement #5 below directly addresses this bug.

## Requirements

### In Scope

1. **Studio-side onboarding path outside `/system/*`**
   - Add a studio-scoped onboarding workflow reachable from `/studios/$studioId/creators`.
   - A studio admin can either:
     - add/reactivate an existing catalog creator, or
     - create a brand-new creator and onboard them into the studio in one flow.
   - Ordinary studio talent onboarding must no longer require `/system/creators`.

2. **Search-first onboarding UX**
   - The flow starts by searching the existing creator catalog.
   - If a suitable creator already exists, the operator should reuse that identity instead of creating a duplicate.
   - "Create new creator" is a secondary action shown only after search, with clear copy that creator identities are global across studios.

3. **Create-and-roster in one operation**
   - Creating a new creator from the studio flow must create the global `Creator` record and the `StudioCreator` roster row in the same workflow.
   - The newly created creator is immediately active in the current studio roster after success.
   - Studio default compensation still belongs to `StudioCreator`, not to the global `Creator`.

4. **Minimum onboarding fields**
   - Required: `name`, `alias_name`
   - Optional: `user_id`, `metadata`, `default_rate`, `default_rate_type`, `default_commission_rate`
   - Linking a creator to a user account remains optional at onboarding time.

5. **Roster-first assignment enforcement**
   - Only **active studio roster creators** are assignable from `/studios/:studioId/creator-mapping`.
   - Creators with `roster_state = NONE` are not assignable in single-show or bulk assignment flows.
   - Assignment write APIs must reject off-roster creators with a typed `CREATOR_NOT_IN_ROSTER` error.

6. **Studio mapping UX for missing creators**
   - If an operator cannot find a creator in mapping, the UI explains that the creator must be onboarded to the studio roster first.
   - Studio admins see a direct CTA back to the creator roster onboarding flow.
   - Managers and talent managers see guidance to ask a studio admin to onboard the creator.

7. **Preserve current role ownership**
   - `ADMIN`: create/onboard/reactivate/update studio creator roster
   - `MANAGER`, `TALENT_MANAGER`: read roster, assign active roster creators only
   - No expansion of `/system/*` access and no change to system-admin route rules

8. **Reactivation over duplication**
   - If the creator already has an inactive `StudioCreator` row for the studio, onboarding reactivates that row instead of creating a duplicate.
   - If the creator is already active in the roster, the flow returns the existing duplicate error rather than silently creating another path.

### Out of Scope

- Creator invitation emails or automatic account provisioning
- Cross-studio duplicate merge tools
- Fuzzy identity matching or automated duplicate resolution
- Silent creator creation directly from creator-mapping without explicit onboarding
- Expanding roster write permissions beyond `ADMIN`
- Overlap/conflict metadata rules beyond off-roster enforcement (tracked by `creator-availability-hardening.md`)

## Desired User Flow

1. A studio admin opens `/studios/$studioId/creators`.
2. They click `Add Creator`.
3. They search the existing catalog first.
4. If a matching creator exists, they add or reactivate that creator in the studio roster.
5. If no suitable creator exists, they choose `Create and onboard new creator`.
6. They enter name, alias, and optional user/default-compensation fields.
7. The system creates the global creator and the active studio roster row.
8. The creator is immediately available in creator mapping.
9. Managers and talent managers only assign active roster creators from that point onward.

## Product Decisions

- **Studio onboarding may create a global creator identity** — `Creator` remains global, but routine creator intake is a studio operation and must not depend on system-admin-only routes.
- **Search first, create second** — duplicate risk is reduced by forcing catalog search before create.
- **Roster is authoritative** — assignment is roster-first, not catalog-first.
- **No silent auto-create during mapping** — onboarding happens explicitly through the roster flow so defaults and audit intent are captured at the right moment.
- **Admin-owned onboarding** — this removes the system-admin dependency without widening studio roster write permissions.

## API / Route Shape

### Studio UI Surface

- Continue to use `/studios/$studioId/creators` as the onboarding home.
- The Add Creator dialog becomes a search-first onboarding flow instead of a catalog-only picker.

### API Shape

Keep the existing roster-add route for existing creators:

```http
POST /studios/:studioId/creators
```

Add a dedicated studio onboarding action for brand-new creators:

```http
POST /studios/:studioId/creators/onboard
```

Example request:

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

Expected behavior:

- `creator` creates the global identity
- `roster` creates the studio-scoped `StudioCreator` row
- response returns the canonical studio roster item so the UI can refresh the roster directly

### Assignment Error Contract

| Code | HTTP Status | Condition |
| --- | --- | --- |
| `CREATOR_NOT_IN_ROSTER` | 422 | Creator exists globally but is not active in the studio roster |
| `CREATOR_INACTIVE_IN_ROSTER` | 422 | Creator has a studio roster row but it is inactive |

These are distinct from 403 (authorization) and 404 (creator not found).

## Acceptance Criteria

- [ ] A studio admin can onboard a brand-new creator from `/studios/$studioId/creators` without using `/system/*`.
- [ ] The onboarding flow always begins with catalog search before showing create-new.
- [ ] Creating a new creator from the studio flow creates both the global `Creator` and the active `StudioCreator` row.
- [ ] Existing catalog creators can still be added or reactivated in the studio roster from the same studio surface.
- [ ] Managers and talent managers can no longer assign `roster_state = NONE` creators from single-show or bulk creator mapping.
- [ ] Assignment APIs return typed `CREATOR_NOT_IN_ROSTER` errors for off-roster creators.
- [ ] Mapping UI shows a clear "onboard to roster first" message when a creator is missing.
- [ ] Studio creator onboarding no longer depends on `/system/creators` for ordinary day-to-day operations.

## Design Reference

- Backend design: create with implementation PR under `apps/erify_api/docs/design/`
- Frontend design: create with implementation PR under `apps/erify_studios/docs/design/`
- Related shipped feature: `docs/features/studio-creator-roster.md`
- Related follow-up PRD: `docs/prd/creator-availability-hardening.md`
