# Studio Creator Onboarding Frontend Reference

> **Status**: ✅ Implemented
> **Phase scope**: Phase 4 Wave 1
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/features/studio-creator-onboarding.md`](../../../docs/features/studio-creator-onboarding.md)
> **Depends on**: [Studio Creator Roster](./STUDIO_CREATOR_ROSTER.md), backend onboarding + onboarding-user lookup endpoints

## Purpose

Technical reference for the shipped studio-owned creator intake flow, including the roster dialog's search/add/create paths, the studio-safe user-link lookup, and the roster-enforcement guidance shown from creator-mapping surfaces.

## Route And Access

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/creators` | Creator roster page with Add Creator intake dialog | `ADMIN` + `MANAGER` + `TALENT_MANAGER` roster/default write |
| `/studios/$studioId/creator-mapping` | Assignment guidance and roster-error recovery path | `ADMIN`, `MANAGER`, `TALENT_MANAGER` |

Access rules:

- `ADMIN`, `MANAGER`, and `TALENT_MANAGER` can open the Add Creator intake action from the roster page
- `TALENT_MANAGER` can create a creator identity, add/reactivate an existing creator, and set roster compensation defaults; user linking can be skipped and completed later when the creator needs account access
- route access stays on the shared `creatorRoster` and `creatorMapping` policy keys

## Key Frontend Modules

- `src/routes/studios/$studioId/creators.tsx`
- `src/features/studio-creator-roster/components/add-studio-creator-dialog.tsx`
- `src/features/studio-creator-roster/api/studio-creator-roster.ts`
- `src/features/studio-show-creators/components/add-creator-dialog.tsx`
- `src/features/studio-show-creators/lib/creator-roster-guidance.ts`

## Data And Query Model

- onboarding write path lives in `studio-creator-roster.ts` through `onboardStudioCreator()` / `useOnboardStudioCreator()`
- optional `user_id` search uses `GET /studios/:studioId/creators/onboarding-users` through `get-onboarding-users.ts`
- do not reuse `/admin/users` or `useUsersQuery()` for this flow
- successful onboarding invalidates:
  - `studioCreatorRosterKeys.listPrefix(studioId)`
  - creator catalog query family
  - creator availability query family

## Dialog Behavior

### Search-first entry

- the roster add flow always starts from the single **Add Creator** action in search mode
- catalog search remains the default first view, but **Create new creator and add to this studio** is available immediately for confirmed new identities
- the catalog query excludes active rostered creators so existing active roster rows do not appear in Add Creator results
- selectable catalog results are labeled by outcome: add an existing creator or reactivate an inactive creator
- the current search term is preserved when switching between search and create modes

### Create new creator and add to studio mode

- create mode collects:
  - `name`
  - `alias`
  - creator `type` (`STANDARD`, `FLEXIBLE`, or `OTHER`)
  - optional `user_id`
  - compensation defaults
- compensation validation stays aligned with the roster defaults rules already used elsewhere in the roster feature
- successful create closes the dialog and refreshes the roster/cross-feature discovery queries

## Mapping Guidance And Error Handling

- creator discovery in mapping remains intentionally broad; the authoritative roster gate is still the write path
- the UI maps backend roster failures into readable guidance:
  - `CREATOR_NOT_IN_ROSTER`
  - `CREATOR_INACTIVE_IN_ROSTER`
- roster managers get a CTA back to `/studios/$studioId/creators`
- read-only roles get an "ask a studio admin or talent manager" message instead of a write affordance
- bulk assignment stays open when actionable failures remain

## UX Rules

- keep the onboarding flow on the roster page; no separate route is added
- keep creator identity search-first to reduce duplicate global identities
- do not expose raw backend error codes in mapping dialogs
- do not auto-create creators from creator mapping; onboarding remains an explicit roster-owned action
