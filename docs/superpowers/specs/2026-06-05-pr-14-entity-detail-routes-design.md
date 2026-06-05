# PR 14 · Entity edit dialogs → dedicated routes — Design Spec

> **Status**: Draft (brainstorming) · **Date**: 2026-06-05 · **Roadmap row**: [PHASE_4 #14](../../roadmap/PHASE_4.md#pr-14--entity-edit-dialogs--dedicated-routes)
> **Scope of this branch**: the audit deliverable (`ENTITY_DETAIL_ROUTES.md`) **and** the 14a pilot conversion (creator detail).
> **Retirement**: per `doc-lifecycle.md` (Superpowers Spec Retirement), this spec retires once 14a merges; durable content lands in `apps/erify_studios/docs/ENTITY_DETAIL_ROUTES.md` and (eventually) a `docs/features/` entry when the full 14a–14d series closes.

## 1. Problem & goal

Per-entity edits in `erify_studios` open `Dialog`s from row actions. Dialogs lose URL state — you cannot share a link to "Alice's roster row", and back/forward doesn't step through edits — and they constrain richer detail surfaces. `task-templates/$templateId.tsx` is the existing precedent for dedicated entity routes.

**Goal**: convert each single-entity detail/edit dialog into a `/studios/:studioId/<entity>/:entityId` route. This branch delivers:

1. **Audit doc** — `apps/erify_studios/docs/ENTITY_DETAIL_ROUTES.md`: target route per entity, share-link contract, migration order.
2. **14a pilot** — creator detail route at `/studios/:studioId/creators/:creatorId` hosting a **Profile** tab (the converted `edit-studio-creator-dialog`) and a **Compensation** tab (the already-extracted `creator-compensations` view), with deep-linkable URLs.

**Design principle (user-stated)**: *reuse UI and flow, keep UX consistent, with proper scope and authorization.* No new UI primitive, no new dependency, no broadened access surface.

## 2. Audit — `ENTITY_DETAIL_ROUTES.md` (covers 14a–14d)

| #   | Today (dialog)                                                       | Target route                                | Share-link contract (surviving search params)                                  | Notes                                                                                     |
| --- | ------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 14a | `edit-studio-creator-dialog` + creator compensation view            | `/studios/:studioId/creators/:creatorId`    | Compensation tab: `date_from`, `date_to` (existing). Profile tab: none.        | **This branch.** Layout + Link tabs. Compensation route already exists; folds in as a tab. |
| 14b | `edit-member-dialog`                                                 | `/studios/:studioId/members/:memberId`      | Compensation tab: `date_from`, `date_to` (mirror creator).                     | Wait for PR 8 (string wire type). `members/$memberId/compensations.tsx` already exists.     |
| 14c | `show-update-dialog`                                                 | `/studios/:studioId/shows/:showId`          | None expected (no range filter); finalized when 14c is scoped.                  | Show-creator compensation becomes a section; `show-actuals-dialog` folds in (PR 12.1).      |
| 14d | `studio-shift-form-dialog` + `shift-compensation-dialog`            | `/studios/:studioId/shifts/:shiftId`        | None expected (no range filter); finalized when 14d is scoped.                  | Compensation becomes a tab/section.                                                         |

**Migration order**: 14a (creator, pilot) → 14b (member, after PR 8) → 14c (show) → 14d (shift). Each is its own scoped PR. The pilot establishes the reusable **entity-detail layout pattern** (nested layout route + Link tab strip + per-tab authorization) the others copy. Refined follow-up: the first tab is user-facing **Profile**, not Defaults, and the detail header follows the in-content task-setup show-tasks pattern.

**Out of scope** (stay as `Dialog`): confirmation/destructive (`delete-*`, `remove-*`), inline add-to-list (`add-studio-creator`, `add-member`, `add-creator`), bulk (`bulk-task-generation`, `bulk-creator-assignment`), task-scoped sub-forms (`system-task-details`, `task-due-date`, `compensation-line-item-form`). Note: `show-creator-compensation-dialog` (per-show, opened from inside the compensation view) **stays a Dialog** — it is a sub-edit of a show assignment, not a single top-level entity.

## 3. 14a pilot — route structure

Chosen pattern: **nested layout route + `<Link>` tab strip** (no `@radix-ui/react-tabs` dependency; each tab is a real, shareable URL).

```
routes/studios/$studioId/creators/
├── creators.tsx                     (UNCHANGED — section guard: routeKey="creatorRoster")
├── creators/index.tsx               (UNCHANGED — roster list)
└── creators/$creatorId/
    ├── route.tsx        ← NEW  layout: fetch creator (GET :creatorId), header
    │                            (compact icon back link + name + metadata panel)
    │                            + Link tab strip (Profile | Compensation) + <Outlet/>
    ├── index.tsx        ← NEW  "Profile" tab: converted edit form (admin-only edit)
    └── compensations.tsx← EXISTING view, de-chromed (drop its own PageLayout/back button;
                                  keep StudioRouteGuard + date-range + cards + list). Now a tab.
```

Rationale vs alternatives: a single page with radix `Tabs` needs a new dependency + a `?tab=` param to stay shareable; a `?tab=` search-param page loses the clean `/compensations` nested URL and would have to replace the existing route. The nested-route approach reuses the existing compensation route untouched and gives native back/forward + deep links.

### 3.1 Layout (`creators/$creatorId/route.tsx`)

- `createFileRoute('/studios/$studioId/creators/$creatorId')`.
- Fetches the creator via a new `useStudioCreatorRosterEntry(studioId, creatorId)` query (see §4 endpoint).
- Loading / not-found states stay in the same in-content layout with a short bordered status message.
- Renders a shared **in-content header**: compact icon back `<Link>` to `/studios/$studioId/creators`, creator name, short description, and a small metadata panel. Use `task-setup/$showId/tasks` / `ShowHeaderSection` as the navigation precedent; do not put the back action in `PageLayout.actions`.
- Renders a **tab strip** of TanStack `<Link>`s using `activeProps`/`data-status` styling (reuse existing utility classes; segmented-control look). The **Compensation** tab `<Link>` is rendered **only** when the viewer has `creatorCompensations` access (`hasStudioRouteAccess(role, 'creatorCompensations')`); otherwise the Profile tab is the only tab.
- `<Outlet/>` renders the active child.
- The whole subtree already sits under `creators.tsx`'s `routeKey="creatorRoster"` guard (MANAGER / TALENT_MANAGER / ADMIN), so no extra guard is needed on the layout itself.

### 3.2 Profile tab (`creators/$creatorId/index.tsx`)

- `createFileRoute('/studios/$studioId/creators/$creatorId/')`.
- Reuses the **exact form fields + submit logic** currently in `EditStudioCreatorForm` (default rate, compensation type, commission rate, status), refactored out of the dialog into a reusable `CreatorProfileForm` component under `studio-creator-roster/components/`. Same `buildUpdateStudioCreatorRosterPayload` helper, same `useUpdateStudioCreatorRoster` mutation, same 409/optimistic-concurrency handling (`version` round-trip), same toasts.
- **Authorization**: editing is **ADMIN + MANAGER**. This **loosens** the existing `PATCH :creatorId` guard, which is admin-only today (§4) — an intentional behavior change requested for 14a. For TALENT_MANAGER the form renders **read-only** (disabled inputs / value chips, no Save). Gate via `useStudioAccess(studioId)` role check (`role === ADMIN || role === MANAGER`).
- On successful save: stay on the page (toast + query invalidation refreshes the header/badge). No dialog close / navigation. This is the UX upgrade — the edit is a page, not a modal.

### 3.3 Compensation tab (`creators/$creatorId/compensations.tsx`)

- Keep the existing route, search schema (`date_from`/`date_to`), and `CreatorCompensationsView`.
- **De-chrome**: remove the view's own `PageLayout` title + "Creators" back button (now provided by the layout header). Keep `StudioRouteGuard routeKey="creatorCompensations"` so a direct deep-link by a TALENT_MANAGER is still denied at the route level (defense in depth beyond the hidden tab).
- The per-show `ShowCreatorCompensationDialog` inside the view **stays a Dialog** (out of scope, §2).

## 4. 14a pilot — backend `GET :creatorId`

A single-creator read is required so the detail page hydrates on deep-link / refresh (the compensation endpoint returns name + per-show breakdown but **not** the roster defaults / `version`).

- **Route**: `GET /studios/:studioId/creators/:creatorId` on `StudioCreatorController`.
- **Reuse**: the service already exposes `findRosterEntry(studioUid, creatorUid)` → `studioCreatorRepository.findByStudioUidAndCreatorUid`. The controller parses the result through the existing `studioCreatorRosterItemDto` (same transform the list uses), returning the same `StudioCreatorRosterItem` shape the FE already consumes. **No new api-types schema.**
- **404**: when `findRosterEntry` returns `null`, throw `HttpError.notFound` (creator not on this studio's roster).
- **Roles (read)**: `@StudioProtected(STUDIO_CREATOR_ACCESS_ROLES)` (ADMIN, MANAGER, TALENT_MANAGER) — matches the read scope of the roster list.
- **Roles (edit)**: change the existing `PATCH :creatorId` guard from `@StudioProtected([ADMIN])` to `@StudioProtected([ADMIN, MANAGER])` — managers can now edit creator roster defaults (intentional loosening for 14a). The companion FE row action and detail form gate on `ADMIN || MANAGER` accordingly.
- **Route ordering caveat**: register `@Get(':creatorId')` **after** the static `@Get('availability')`, `@Get('catalog')`, `@Get('onboarding-users')` handlers (place it at the end of the controller) so the `:creatorId` param route does not shadow those literal paths. (The existing `:creatorId/compensations` is safe — distinct 2-segment path.)
- **Verification point**: confirm `findByStudioUidAndCreatorUid` includes the `creator` relation (`uid`/`name`/`aliasName`) the DTO transform reads; if its `include` differs from the paginated finder, align it. Covered by the controller spec.

### 4.1 Frontend API layer

- Add `getStudioCreatorRosterEntry(studioId, creatorId)` + `useStudioCreatorRosterEntry(...)` to `features/studio-creator-roster/api/studio-creator-roster.ts`, with a `studioCreatorRosterKeys.detail(studioId, creatorId)` key. `useUpdateStudioCreatorRoster` already invalidates `listPrefix`; extend `invalidateStudioCreatorDependencies` (or the update hook) to also invalidate the new detail key so a save refreshes the header.

## 5. Entry points / wiring changes

- `studio-creator-actions-cell.tsx`: the row **Edit** action changes from "open `EditStudioCreatorDialog`" to **navigate** to `/studios/$studioId/creators/$creatorId` (the Profile tab). The "Review Compensation" item **stays** as a deep link, now pointing straight at the Compensation tab (`/creators/$creatorId/compensations`). Remove the local `editOpen` state and the `EditStudioCreatorDialog` mount.
- `edit-studio-creator-dialog.tsx`: the dialog wrapper is **removed** once no other caller exists; its form body is extracted into `CreatorProfileForm`. (Verify no other importers before deleting.)

## 6. Authorization matrix (14a)

| Capability                          | ADMIN | MANAGER | TALENT_MANAGER | Mechanism                                                        |
| ----------------------------------- | :---: | :-----: | :------------: | --------------------------------------------------------------- |
| Reach `/creators/:creatorId`        |  ✅   |   ✅    |       ✅       | `creators.tsx` `routeKey="creatorRoster"` layout guard          |
| `GET :creatorId` (read profile)     |  ✅   |   ✅    |       ✅       | `@StudioProtected(STUDIO_CREATOR_ACCESS_ROLES)`                 |
| Edit profile/default fields (Save)  |  ✅   |   ✅    |       ❌       | `PATCH :creatorId` guard `[ADMIN, MANAGER]` (loosened) + FE read-only form for TALENT_MANAGER |
| See / open Compensation tab         |  ✅   |   ✅    |       ❌       | Tab hidden + `StudioRouteGuard routeKey="creatorCompensations"` |

**Intentional change**: MANAGER gains edit access to creator profile/default fields (previously ADMIN-only). All other capabilities are unchanged from today's dialogs/links.

## 7. Reuse & cross-perspective consistency

- This route is **Perspective 2 (Studio Individual Overview)** per the Three-Perspective guide; it is *not* the erify_creators self-view (Perspective 3 = the whole app, sidebar-navigated). The local tab strip is the correct in-page navigator for P2 because the studio sidebar shows studio-level sections.
- `CreatorCompensationsView` currently lives in `erify_studios/src/features/`. The roadmap's "Mandated Reusable Widgets" note says compensation widgets should eventually be shared between P2 (this page) and P3 (erify_creators). **For the pilot we reuse it in place** and record "extract compensation view to `@eridu/ui` when erify_creators converges" as an explicit follow-up in `ENTITY_DETAIL_ROUTES.md` — we do **not** expand the pilot into a cross-app package extraction.
- The entity-detail layout pattern (nested layout route + Link tab strip + per-tab auth + single-entity GET + Profile first tab + task-setup-style in-content header) is documented in `ENTITY_DETAIL_ROUTES.md` as the template 14b–14d follow.

## 8. Testing

- **Backend** (`studio-creator.controller.spec.ts`): `GET :creatorId` returns the roster item for ADMIN/MANAGER/TALENT_MANAGER; 404 for an unknown creator; route ordering does not break `availability`/`catalog`/`onboarding-users`.
- **Frontend**: route renders header + tabs from the detail query; Profile form is editable for ADMIN and read-only for MANAGER; Compensation tab hidden for TALENT_MANAGER; 409 path surfaces the conflict toast and invalidates. Reuse existing `EditStudioCreatorForm` test coverage by retargeting it to `CreatorProfileForm`.

## 9. Docs & roadmap

- Create durable `apps/erify_studios/docs/ENTITY_DETAIL_ROUTES.md` (the §2 audit table + share-link contract + migration order + the layout pattern + the compensation-extraction follow-up).
- Update `STUDIO_CREATOR_ROSTER.md` if it references the edit dialog.
- `PHASE_4.md`: flip row 14 to 🚧 In progress with a pickup brief now; at merge flip to ✅ (or "14a shipped, 14b–14d pending") with the PR link, per the roadmap's wrap-up rule and the squash-merge convention.
- Run `knowledge-sync.md` after implementation; retire this spec via `doc-lifecycle.md` once 14a merges.

## 10. Verification gates

```
pnpm --filter erify_api    lint && pnpm --filter erify_api    typecheck && pnpm --filter erify_api    test && pnpm --filter erify_api    build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```
(TanStack `routeTree.gen.ts` regenerates on dev/build; ensure it is regenerated and committed.)

## 11. Risks / assumptions / follow-ups

- **Assumption**: `findByStudioUidAndCreatorUid` includes the `creator` relation the DTO needs — verified in §4 during implementation; controller spec covers it.
- **Assumption**: no importer of `EditStudioCreatorDialog` other than the actions cell — verify before deleting the wrapper.
- **Follow-up**: extract `CreatorCompensationsView` to `@eridu/ui` when erify_creators self-view (P3) converges (tracked in `ENTITY_DETAIL_ROUTES.md`, not this PR).
- **Follow-up**: 14b–14d are separate PRs; 14b waits on PR 8 (member string wire type).
- **Non-goal**: per-show drill-in beyond the existing compensation list + `ShowCreatorCompensationDialog`; richer creator detail (profile editing) is a Phase 5 deferral.
