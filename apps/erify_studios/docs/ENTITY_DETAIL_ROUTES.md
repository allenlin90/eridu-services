# Entity Detail Routes (PR 14)

Audit + migration plan for converting per-entity **edit dialogs** into dedicated
`/studios/:studioId/<entity>/:entityId` **routes**. Dialogs lose URL state — you
can't share a link to one entity's edit surface or step through edits with
back/forward — and they constrain richer detail views. Each conversion ships as
its own scoped PR. `task-templates/$templateId.tsx` is the original precedent.

> Status: **14a (creator) shipped**; **14b (member) in progress**; 14c–14d planned. See [PHASE_4 #14](../../../docs/roadmap/PHASE_4.md#pr-14--entity-edit-dialogs--dedicated-routes).

## Route map

| #   | Today (dialog)                                              | Target route                                  | Share-link contract (surviving search params)                  | Status   |
| --- | ---------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------- | -------- |
| 14a | `edit-studio-creator-dialog` + creator compensation view   | `/studios/:studioId/creators/:creatorId`      | Compensation tab: `date_from`, `date_to`. Defaults tab: none.  | ✅ Shipped |
| 14b | `edit-member-dialog`                                        | `/studios/:studioId/members/:memberId`        | Compensation tab: `date_from`, `date_to` (mirror creator).     | 🚧 In progress |
| 14c | `show-update-dialog`                                        | `/studios/:studioId/shows/:showId`            | None expected (no range filter); finalize when scoped.         | 🔲 Planned |
| 14d | `studio-shift-form-dialog` + `shift-compensation-dialog`    | `/studios/:studioId/shifts/:shiftId`          | None expected (no range filter); finalize when scoped.         | 🔲 Planned |

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
    ├── route.tsx     layout: single-entity GET → header (name, status badge,
    │                  back link) + Link tab strip (per-tab auth) + <Outlet/>
    ├── index.tsx      first tab (e.g. Defaults edit)
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

## 14a — creator detail (shipped)

- **Route**: `/studios/:studioId/creators/:creatorId`
  - `route.tsx` — layout: fetches the creator, renders header + tab strip.
  - `index.tsx` — **Defaults** tab: `CreatorDefaultsForm` (extracted from the retired
    `edit-studio-creator-dialog`).
  - `compensations.tsx` — **Compensation** tab: existing `CreatorCompensationsView`,
    de-chromed (header now provided by the layout). Search params `date_from` /
    `date_to` preserved.
- **Backend**: `GET /studios/:studioId/creators/:creatorId` (read: ADMIN / MANAGER /
  TALENT_MANAGER). The `PATCH :creatorId` guard was **loosened** from ADMIN-only to
  **ADMIN + MANAGER** — managers can now edit creator roster defaults.
- **Entry points**: the roster row **Edit** action navigates to the Defaults tab;
  **Review Compensation** deep-links to the Compensation tab. The edit dialog is removed.

### Authorization

| Capability                       | ADMIN | MANAGER | TALENT_MANAGER |
| -------------------------------- | :---: | :-----: | :------------: |
| Reach `/creators/:creatorId`     |  ✅   |   ✅    |       ✅       |
| `GET :creatorId` (read defaults) |  ✅   |   ✅    |       ✅       |
| Edit defaults (Save)             |  ✅   |   ✅    |       ❌ (read-only) |
| See / open Compensation tab      |  ✅   |   ✅    |       ❌       |

## Follow-ups

- **Compensation widget sharing**: `CreatorCompensationsView` lives in
  `erify_studios/src/features/`. Per the roadmap's "Mandated Reusable Widgets", the
  compensation view should eventually be extracted to a shared package
  (`@eridu/ui` or a domain-shared package) so the studio P2 detail page and the
  `erify_creators` P3 self-view consume one widget. Deferred until that convergence —
  intentionally **not** part of the 14a pilot.
- **14c–14d** continue the same route pattern for shows and shifts.

## 14b — member detail (in progress)

- **Route**: `/studios/:studioId/members/:memberId`
  - `route.tsx` — layout: fetches the member, renders header + tab strip.
  - `index.tsx` — **Defaults** tab: `MemberDefaultsForm` (extracted from the retired
    `edit-member-dialog`).
  - `compensations.tsx` — **Compensation** tab: existing `MemberCompensationsView`,
    de-chromed when hosted under the detail layout. Search params `date_from` /
    `date_to` are preserved.
- **Backend**: `GET /studios/:studioId/members/:memberId` (read: ADMIN / MANAGER).
  `PATCH :membershipId` remains ADMIN-only; managers can view the Defaults tab but
  cannot save roster changes.
- **Entry points**: the member roster row **Edit** action navigates to the Defaults
  tab; **View Compensations** deep-links to the Compensation tab. The edit dialog is
  removed.

### Authorization

| Capability                     | ADMIN | MANAGER |
| ------------------------------ | :---: | :-----: |
| Reach `/members/:memberId`     |  ✅   |   ✅    |
| `GET :memberId` (read defaults) |  ✅   |   ✅    |
| Edit defaults (Save)           |  ✅   |   ❌ (read-only) |
| See / open Compensation tab    |  ✅   |   ✅    |
