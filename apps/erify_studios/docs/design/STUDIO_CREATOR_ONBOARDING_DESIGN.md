# Studio Creator Onboarding — Frontend Design

> **Status**: Design
> **Phase scope**: Phase 4 Wave 1
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/studio-creator-onboarding.md`](../../../../docs/prd/studio-creator-onboarding.md)
> **Depends on**: Studio creator roster FE ✅ (PR #30), backend onboard endpoint (this PR)

## Purpose

Extend the existing creator roster page (`/studios/$studioId/creators`) with a search-first onboarding flow so studio admins can create brand-new creators without leaving the studio workspace, and surface roster enforcement feedback in creator mapping when off-roster creators are rejected.

## Scope

| Change | Type | Priority |
| --- | --- | --- |
| Onboard dialog (search → create-and-roster) | New component | Primary |
| Refactor add-creator dialog to use onboard flow | Modify existing | Primary |
| Mapping UX for `CREATOR_NOT_IN_ROSTER` errors | Modify existing | Primary |
| Missing-creator guidance (role-aware CTA) | New UI element | Secondary |

## Route And Access

No new routes. The onboarding flow lives within the existing `/studios/$studioId/creators` page.

| Surface | Access | Change |
| --- | --- | --- |
| `/studios/$studioId/creators` | `ADMIN` write, `MANAGER` + `TALENT_MANAGER` read | No change |
| Add Creator button | `ADMIN` only | Launches redesigned dialog |
| Creator mapping assignment | `ADMIN`, `MANAGER`, `TALENT_MANAGER` | Error handling for off-roster |

## Dialog Redesign: Add Creator → Onboard Creator

The current `AddStudioCreatorDialog` picks from the existing catalog only. The redesigned dialog becomes a two-path onboarding flow:

### Flow

```
[Add Creator] button
      │
      ▼
┌─────────────────────────┐
│  Search Creator Catalog  │  ← Always starts here
│  (AsyncCombobox)         │
└─────────┬───────────────┘
          │
    ┌─────┴──────┐
    │             │
    ▼             ▼
Found?          Not found?
    │             │
    ▼             ▼
Select →        [Create New Creator]
Set defaults    secondary action link
    │             │
    ▼             ▼
POST /creators  POST /creators/onboard
(existing)      (new endpoint)
    │             │
    ▼             ▼
  ← Roster refreshed, dialog closes →
```

### Search-First UX

1. Dialog opens with a catalog search combobox (reuses `useCreatorCatalogQuery` with `include_rostered: false`).
2. Typing searches the global catalog — results show name, alias, and roster state badge.
3. If a match is found: select it, fill compensation defaults, submit → calls existing `POST /studios/:studioId/creators`.
4. If no match: a "Create new creator" link/button appears below the search results.

### Create-New Form

Clicking "Create new creator" expands the dialog to show creator identity fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| Name | `Input` (text) | Yes | Global creator name |
| Alias | `Input` (text) | Yes | Display name |
| User link | `AsyncCombobox` (user search) | No | Optional user association |
| Default rate | `Input` (number) | No | Studio compensation default |
| Rate type | `Select` | No | FIXED / COMMISSION / HYBRID / Not set |
| Commission rate | `Input` (number) | Conditional | Required if COMMISSION or HYBRID |

Submit calls `POST /studios/:studioId/creators/onboard`.

### Implementation Approach

Replace the internals of `AddStudioCreatorDialog` with a two-mode component:

```
State: 'search' | 'create'

'search' mode:
  - Catalog combobox (existing)
  - Compensation defaults (existing)
  - "Create new creator" link at bottom
  - Submit → POST /studios/:studioId/creators

'create' mode:
  - Creator identity fields (name, alias, user_id)
  - Compensation defaults (same fields)
  - "Back to search" link
  - Submit → POST /studios/:studioId/creators/onboard
```

This avoids a separate component — the dialog handles both paths with a mode toggle. The existing compensation field logic (`buildCreateStudioCreatorRosterPayload`, validation rules) is reused in both modes.

### Copy Guidance

- Dialog title: "Add Creator to Roster" (both modes)
- Search placeholder: "Search creators by name or alias..."
- Create link text: "Creator not found? Create a new one"
- Create mode subtitle: "New creators are shared across all studios"
- Back link text: "Back to search"

## API Layer

### New Mutation

Add to `src/features/studio-creator-roster/api/studio-creator-roster.ts`:

```typescript
export async function onboardStudioCreator(
  studioId: string,
  data: OnboardCreatorInput,
): Promise<StudioCreatorRosterItem> {
  const response = await apiClient.post(
    `/studios/${studioId}/creators/onboard`,
    data,
  );
  return response.data;
}

export function useOnboardStudioCreator(studioId: string) {
  // Same invalidation pattern as useAddStudioCreatorToRoster:
  // invalidates roster list, catalog, availability
}
```

### Type Contract

Import `onboardCreatorInputSchema` from `@eridu/api-types/studio-creators` and derive the input type:

```typescript
import type { z } from 'zod';
import { onboardCreatorInputSchema } from '@eridu/api-types/studio-creators';

type OnboardCreatorInput = z.infer<typeof onboardCreatorInputSchema>;
```

## Creator Mapping: Roster Enforcement UX

When the backend now rejects off-roster creators with `CREATOR_NOT_IN_ROSTER`, the mapping UI must handle this gracefully.

### Bulk Assignment Dialog

In `bulk-creator-assignment-dialog.tsx`, the response `errors[]` array may now include `CREATOR_NOT_IN_ROSTER` as a reason. Update the error display:

```
Error reasons mapping:
  CREATOR_INACTIVE_IN_ROSTER → "Creator is inactive in this studio's roster"
  CREATOR_NOT_IN_ROSTER      → "Creator is not in this studio's roster"
```

The toast already shows `"{n} error(s)"` — no structural change needed, just the human-readable mapping.

### Single-Show Assignment Dialog

The add-creator dialog for shows (`studio-show-creators/components/add-creator-dialog.tsx`) uses the availability endpoint, which already filters by roster. Creators not in the roster won't appear in search results. No change needed for the happy path.

For the error path (race condition where roster changes between search and submit): display the error reason from the bulk-assign response.

### Missing Creator Guidance

When a user searches for a creator in the mapping flow and finds nothing:

- **Admin**: Show "Creator not in roster. [Add to roster →]" with a link to `/studios/$studioId/creators`.
- **Manager / Talent Manager**: Show "Creator not in roster. Ask a studio admin to add them."

This is a small addition to the empty-state rendering in the assignment combobox.

## Query Invalidation

The onboard mutation follows the same invalidation pattern as add-to-roster:

| Query family | Why |
| --- | --- |
| `studioCreatorRosterKeys.listPrefix(studioId)` | New roster entry appears |
| `creatorCatalogKeys.listPrefix(studioId)` | New creator appears in catalog with `ACTIVE` state |
| `creatorAvailabilityKeys.listPrefix(studioId)` | New creator may be available for assignment |

## File Inventory

| File | Action |
| --- | --- |
| `src/features/studio-creator-roster/api/studio-creator-roster.ts` | Add `onboardStudioCreator` + `useOnboardStudioCreator` |
| `src/features/studio-creator-roster/components/add-studio-creator-dialog.tsx` | Redesign to two-mode flow (search / create) |
| `src/features/studio-show-creators/components/bulk-creator-assignment-dialog.tsx` | Add `CREATOR_NOT_IN_ROSTER` error reason label |
| `src/features/studio-show-creators/components/add-creator-dialog.tsx` | Add missing-creator guidance (role-aware) |

## Testing

### Unit / Component Tests

| Test | File |
| --- | --- |
| Onboard dialog renders search mode by default | `add-studio-creator-dialog` test |
| "Create new" link switches to create mode | `add-studio-creator-dialog` test |
| Create mode form validation (name + alias required) | `add-studio-creator-dialog` test |
| Compensation validation reused in create mode | existing compensation lib tests |

### Manual Smoke Tests

1. Open `/studios/$studioId/creators` as ADMIN → click Add Creator → search finds existing creator → add → roster refreshes.
2. Search with no results → "Create new creator" link appears → fill form → submit → creator appears in roster.
3. Open bulk assignment → assign a non-rostered creator (if possible via API) → see `CREATOR_NOT_IN_ROSTER` error.
4. As MANAGER, open creator mapping → search finds nothing → see "Ask admin" guidance (no create link).

## Open Questions

None — the PRD and backend design are fully specified. Proceed to implementation.
