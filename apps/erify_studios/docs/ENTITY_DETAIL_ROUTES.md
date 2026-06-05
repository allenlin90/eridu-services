# Entity Detail Routes (PR 14)

Audit + migration plan for converting per-entity **edit dialogs** into dedicated
`/studios/:studioId/<entity>/:entityId` **routes**. Dialogs lose URL state — you
can't share a link to one entity's edit surface or step through edits with
back/forward — and they constrain richer detail views. Each conversion ships as
its own scoped PR. `task-templates/$templateId.tsx` is the original precedent.

> Status: **all conversions shipped** — 14a (creator), 14b (member), 14c (show), 14d (shift). PR 14 closed. See [PHASE_4 #14](../../../docs/roadmap/PHASE_4.md#pr-14--entity-edit-dialogs--dedicated-routes).

## Route map

| #   | Today (dialog)                                              | Target route                                  | Share-link contract (surviving search params)                  | Status   |
| --- | ---------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------- | -------- |
| 14a | `edit-studio-creator-dialog` + creator compensation view   | `/studios/:studioId/creators/:creatorId`      | Compensation tab: `date_from`, `date_to`. Profile tab: none.   | ✅ Shipped |
| 14b | `edit-member-dialog`                                        | `/studios/:studioId/members/:memberId`        | Compensation tab: `date_from`, `date_to` (mirror creator).     | ✅ Shipped |
| 14c | studio Edit Show dialog (on `StudioShowManagementForm`)     | `/studios/:studioId/shows/:showId`            | None. Details / Actuals / Compensation are direct share links. | ✅ Shipped |
| 14d | `studio-shift-form-dialog` + `shift-compensation-dialog`    | `/studios/:studioId/shifts/:shiftId`          | None. Profile and Compensation tabs are direct share links.    | ✅ Shipped |

**Migration order**: 14a → 14b → 14c → 14d. No row depends on a later row.

## Out of scope (stay as `Dialog`)

- Confirmation / destructive: `delete-*`, `remove-*`.
- Inline add-to-list: `add-studio-creator`, `add-member`, `add-creator`.
- Bulk: `bulk-task-generation`, `bulk-creator-assignment`.
- Task-scoped sub-forms: `system-task-details`, `task-due-date`, `compensation-line-item-form`.
- Sub-edits opened *inside* a detail surface, e.g. `show-creator-compensation-dialog`
  (per-show assignment edit launched from the creator compensation tab) — it edits one
  show assignment, not a top-level entity.

## The entity-detail layout pattern (established by 14a)

Each entity detail route is a **nested layout route + `<Link>` tab strip** — no
`@radix-ui/react-tabs` dependency, and each tab is a real, shareable URL.

```
routes/studios/$studioId/<entity>/
├── <entity>.tsx                 section layout/guard (e.g. routeKey)
├── <entity>/index.tsx           list page (unchanged)
└── <entity>/$entityId/
    ├── route.tsx     layout: single-entity GET → in-content header (icon back,
    │                  title, metadata panel) + Link tab strip (per-tab auth) + <Outlet/>
    ├── index.tsx      first tab (Profile edit)
    └── <tab>.tsx      additional tabs (e.g. compensations) — reuse existing routes
```

Rules every conversion follows:

1. **Single-entity GET** hydrates the page on deep-link / refresh — don't pass the
   row object via router state. 14a added `GET /studios/:studioId/creators/:creatorId`
   (reusing the existing `findRosterEntry` service method + `studioCreatorRosterItemDto`).
2. **Studio scoping** stays enforced by the section layout guard; the detail layout
   inherits it.
3. **Per-tab authorization**: hide a tab the viewer can't access *and* keep the
   tab route's own `StudioRouteGuard` (defense in depth).
4. **Optimistic concurrency**: round-trip `version`; surface 409 with a conflict
   toast + query invalidation (don't silently overwrite).
5. **Reuse payload builders**: e.g. `buildUpdateStudioCreatorRosterPayload`; never
   submit raw form state.
6. Each tab is its own route so back/forward and share-links work natively.
7. The first tab is named for the entity kind: **Profile** for identity/people
   entities (creator, member), **Details** for record entities (show). It may edit
   operational defaults, but the user-facing route is a profile/detail page — not
   "Defaults". Shows additionally split operational metrics into an **Actuals** tab
   and costs into a **Compensation** tab (see 14c).
8. Use an in-content header like
   `task-setup/$showId/tasks` (`ShowHeaderSection`): compact icon back link, title /
   subtitle, and a small responsive metadata panel. Avoid putting the back action in
   `PageLayout.actions` for entity detail routes; it is less clear on mobile.

## 14a — creator detail (shipped)

- **Route**: `/studios/:studioId/creators/:creatorId`
  - `route.tsx` — layout: fetches the creator, renders header + tab strip.
  - `index.tsx` — **Profile** tab: `CreatorProfileForm` (extracted from the retired
    `edit-studio-creator-dialog`).
  - `compensations.tsx` — **Compensation** tab: existing `CreatorCompensationsView`,
    de-chromed (header now provided by the layout). Search params `date_from` /
    `date_to` preserved.
- **Backend**: `GET /studios/:studioId/creators/:creatorId` (read: ADMIN / MANAGER /
  TALENT_MANAGER). The `PATCH :creatorId` guard was **loosened** from ADMIN-only to
  **ADMIN + MANAGER** — managers can now edit creator roster defaults.
- **Entry points**: the roster row **Edit** action navigates to the Profile tab;
  **Review Compensation** deep-links to the Compensation tab. The edit dialog is removed.

### Authorization

| Capability                       | ADMIN | MANAGER | TALENT_MANAGER |
| -------------------------------- | :---: | :-----: | :------------: |
| Reach `/creators/:creatorId`     |  ✅   |   ✅    |       ✅       |
| `GET :creatorId` (read profile) |  ✅   |   ✅    |       ✅       |
| Edit profile (Save)             |  ✅   |   ✅    |       ❌ (read-only) |
| See / open Compensation tab      |  ✅   |   ✅    |       ❌       |

## Follow-ups

- **Compensation widget sharing**: `CreatorCompensationsView` lives in
  `erify_studios/src/features/`. Per the roadmap's "Mandated Reusable Widgets", the
  compensation view should eventually be extracted to a shared package
  (`@eridu/ui` or a domain-shared package) so the studio P2 detail page and the
  `erify_creators` P3 self-view consume one widget. Deferred until that convergence —
  intentionally **not** part of the 14a pilot.
- **14c** continued the same route pattern for shows (Details / Actuals / Compensation) — shipped.
- **Show route convergence (PR 21.7)**: the 14c Compensation tab embeds `ShowCreatorList`,
  the same surface still mounted at `/creator-mapping/:showId`. PR 21.7 (post-14c "Route
  Revamp") converges them: rewire the `/creator-mapping/:showId` entry points (creator-mapping
  list, task-setup deep links) to `/shows/:showId/compensation` and **remove** the legacy route
  — a clean rename, **no redirect shim** — alongside the same treatment for `/task-setup/:showId/tasks`.

## 14b — member detail (shipped)

- **Route**: `/studios/:studioId/members/:memberId`
  - `route.tsx` — layout: fetches the member, renders header + tab strip.
  - `index.tsx` — **Profile** tab: `MemberProfileForm` (extracted from the retired
    `edit-member-dialog`).
  - `compensations.tsx` — **Compensation** tab: existing `MemberCompensationsView`,
    de-chromed when hosted under the detail layout. Search params `date_from` /
    `date_to` are preserved.
- **Backend**: `GET /studios/:studioId/members/:memberId` (read: ADMIN / MANAGER).
  `PATCH :membershipId` remains ADMIN-only; managers can view the Profile tab but
  cannot save roster changes.
- **Entry points**: the member roster row **Edit** action navigates to the Profile
  tab; **View Compensations** deep-links to the Compensation tab. The edit dialog is
  removed.

### Authorization

| Capability                     | ADMIN | MANAGER |
| ------------------------------ | :---: | :-----: |
| Reach `/members/:memberId`     |  ✅   |   ✅    |
| `GET :memberId` (read profile) |  ✅   |   ✅    |
| Edit profile (Save)            |  ✅   |   ❌ (read-only) |
| See / open Compensation tab    |  ✅   |   ✅    |

## 14d — shift detail (shipped)

- **Route**: `/studios/:studioId/shifts/:shiftId`
  - `route.tsx` — layout: fetches the shift, renders header + tab strip.
  - `index.tsx` — **Profile** tab: edits member, date, blocks, status, and duty-manager flag.
  - `compensation.tsx` — **Compensation** tab: shift hourly-rate override, planned/actual
    cost summary, shift-level adjustments, block actuals, and block-level adjustments.
- **Backend**: `GET /studios/:studioId/shifts/:shiftId` already exists and is scoped by
  studio. Mutations continue through the existing shift and block update endpoints.
- **Entry points**: the shift table row **Edit Shift** action navigates to the Profile
  tab; **Manage Compensation** deep-links to the Compensation tab. Create shift and
  delete confirmation remain dialogs.

### Authorization

| Capability                         | ADMIN | MANAGER |
| ---------------------------------- | :---: | :-----: |
| Reach `/shifts/:shiftId`           |  ✅   |   ✅    |
| `GET :shiftId` (read profile)      |  ✅   |   ✅    |
| Edit profile (Save)                |  ✅   |   ✅    |
| See / open Compensation tab        |  ✅   |   ✅    |
| Edit compensation / actuals fields |  ✅   |   ✅    |

## 14c — show detail (shipped)

Shows are **record entities**, not people, so the first tab is **Details** (not "Profile").
Operational metrics and costs split into their own tabs, per a product decision: **Details**
(attributes) · **Actuals** (operational metrics) · **Compensation** (costs).

- **Route**: `/studios/:studioId/shows/:showId`
  - `route.tsx` — layout: fetches the show via `useStudioShow` (`GET :showId`), renders the
    `ShowDetailHeader` (icon back to shows + name + status/client/schedule/actuals badges) and
    a `<Link>` tab strip (Details | Actuals | Compensation).
  - `index.tsx` — **Details** tab: `StudioShowManagementForm` (edit mode) in a card. Reuses the
    list dialog's submit transform (`external_id` create-only; `schedule_id` empty→unlink). Save
    stays on the page (the `useUpdateStudioShow` mutation updates the detail cache + toasts);
    Cancel resets via remount.
  - `actuals.tsx` — **Actuals** tab: `ShowActualsForm` (actual start/end). The form body was
    **extracted** from `show-actuals-dialog.tsx`; the task-setup `ShowActualsDialog` quick-action
    now consumes the same `ShowActualsForm`, so there is one implementation, two shells.
  - `compensation.tsx` — **Compensation** tab: reuses `ShowCreatorList` (per-show creator
    assignment + per-creator compensation). The inner `ShowCreatorCompensationDialog` and
    `AddCreatorDialog` stay dialogs (sub-edits, out of scope).
- **Backend**: none. `GET` / `PATCH /studios/:studioId/shows/:showId` already exist and are
  studio-scoped; `GET` returns `StudioShowDetail` (core fields + `platforms` + actuals).
- **Entry points**: the show roster row **Edit** action navigates to the Details tab (mirrors the
  14d shift table). Create and delete remain dialogs (inline-create + destructive, out of scope).
- **Out of scope / deferred to PR 21.7**: Performance + Submitted Tasks tabs, and converging
  `/creator-mapping/:showId` into `/shows/:showId/compensation` (see Follow-ups — clean rename, no
  redirect shim).

### Authorization

No change from today's dialogs — the whole subtree inherits `shows.tsx`'s `routeKey="shows"` guard.

| Capability                         | ADMIN | MANAGER |
| ---------------------------------- | :---: | :-----: |
| Reach `/shows/:showId`             |  ✅   |   ✅    |
| `GET :showId` (read detail)        |  ✅   |   ✅    |
| Edit Details (Save)                |  ✅   |   ✅    |
| Edit Actuals (Save)                |  ✅   |   ✅    |
| Manage Compensation / creators     |  ✅   |   ✅    |
