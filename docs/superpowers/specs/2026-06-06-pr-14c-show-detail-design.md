# PR 14c · Show detail route + PR 14 wrap-up — Design Spec

> **Status**: Draft (brainstorming) · **Date**: 2026-06-06 · **Roadmap row**: [PHASE_4 #14](../../roadmap/PHASE_4.md#pr-14--entity-edit-dialogs--dedicated-routes)
> **Scope of this branch**: the final 14c conversion (show detail route) **and** the PR 14 wrap-up (docs flip, skill update, retire the 14a spec).
> **Retirement**: per `doc-lifecycle.md` (Superpowers Spec Retirement), this spec retires once 14c merges; durable content lands in `apps/erify_studios/docs/ENTITY_DETAIL_ROUTES.md`.

## 1. Problem & goal

PR 14 converts per-entity **edit dialogs** in `erify_studios` into dedicated `/studios/:studioId/<entity>/:entityId` **routes** (dialogs lose URL state and constrain richer detail surfaces). 14a (creator), 14b (member), and 14d (shift) have shipped. **14c (show) is the last conversion** and closes the row.

**Goal**: convert the studio "Edit Show" dialog (the `StudioShowManagementForm` Dialog mounted in `routes/studios/$studioId/shows/index.tsx`) into a `/studios/:studioId/shows/:showId` detail route that reuses the established nested-layout + `<Link>` tab-strip pattern, and fold in show actuals and show-creator compensation per the roadmap note.

**Design principle (carried from 14a)**: *reuse UI and flow, keep UX consistent, with proper scope and authorization.* No new UI primitive, no new dependency, no broadened access surface.

> **Naming clarification**: the roadmap/audit call the source "`show-update-dialog`". The studio-scoped surface actually being converted is the **Edit Show dialog built on `StudioShowManagementForm`** in `shows/index.tsx`. The `ShowUpdateDialog` in `routes/system/shows/` is a separate `/system/*` admin surface and is **out of scope** for PR 14 (which is `erify_studios`-only).

## 2. Tab structure (Details | Actuals | Compensation)

Shows are **record entities**, not people. The first tab is **Details** (attributes), not "Profile". This is an intentional, documented deviation from the generic "Profile-first" rule the people-entity routes (14a/14b) follow; 14d (shift) is also a record entity but shipped as Profile|Compensation — the new guidance is recorded in the skill so future record entities use entity-appropriate tab names.

| Tab          | Purpose                | Source surface folded in                                        |
| ------------ | ---------------------- | --------------------------------------------------------------- |
| Details      | Show attributes (edit) | `StudioShowManagementForm` (extracted from the Edit Show Dialog) |
| Actuals      | Operational metrics    | `show-actuals-dialog` form body (actual start / end time)        |
| Compensation | Costs                  | `ShowCreatorList` (per-show creator assignment + compensation)   |

## 3. Route structure

Chosen pattern (same as 14a/b/d): **nested layout route + `<Link>` tab strip** — no `@radix-ui/react-tabs`, each tab a real shareable URL.

```
routes/studios/$studioId/shows/
├── shows.tsx                  (UNCHANGED — section guard routeKey="shows", ADMIN+MANAGER)
├── shows/index.tsx            (list — Edit row action now NAVIGATES to detail; edit dialog removed)
└── shows/$showId/
    ├── route.tsx       ← NEW  layout: useStudioShow → in-content header (icon back to shows,
    │                            show name + status/client/time metadata) + Link tab strip
    │                            (Details | Actuals | Compensation) + <Outlet/>
    ├── index.tsx       ← NEW  "Details" tab: StudioShowManagementForm (edit) in a bordered card
    ├── actuals.tsx     ← NEW  "Actuals" tab: extracted ShowActualsForm
    └── compensation.tsx← NEW  "Compensation" tab: reuse ShowCreatorList
```

### 3.1 Layout (`shows/$showId/route.tsx`)

- `createFileRoute('/studios/$studioId/shows/$showId')`.
- Fetches the show via the existing `useStudioShow({ studioId, showId })` query (`GET /studios/:studioId/shows/:showId` → `StudioShowDetail`; already includes `platforms`, `actual_start_time`, `actual_end_time`).
- Loading / not-found states stay in the same in-content layout with a short bordered status message (mirror `shifts/$shiftId/route.tsx`).
- In-content header: compact icon back `<Link>` to `/studios/$studioId/shows`, show name, subtitle (client • start–end), and a small metadata badge panel (status, client, planned window, actuals-pending). Follow `ShiftDetailHeader` / `task-setup/$showId/tasks` precedent — do **not** put the back action in `PageLayout.actions`.
- Tab strip: TanStack `<Link>`s with the existing `TAB_LINK_CLASS` / `activeProps` styling used by `shifts/$shiftId/route.tsx`. All three tabs visible to anyone who reaches the route (the `shows` guard already restricts to ADMIN+MANAGER).
- The subtree sits under `shows.tsx`'s `routeKey="shows"` guard, so no extra layout guard is needed.

### 3.2 Details tab (`shows/$showId/index.tsx`)

- `createFileRoute('/studios/$studioId/shows/$showId/')`.
- Reuses `StudioShowManagementForm` (edit mode: pass `show={detail}`) inside a bordered card. The form already renders its own Save/Cancel footer and owns all field logic + edit-mode Zod schema; **no extraction needed**.
- Submit: reuse the **exact** submit transform from the current Edit Show dialog (`schedule_id` empty-string→null unlink semantics; drop `external_id` on edit) and `useUpdateStudioShow`. On success, **stay on the page** — the mutation already `setQueryData`s the detail cache, invalidates the list, and toasts. Cancel resets the form (re-mount via `key` on `show.updated_at`).
- No `version` round-trip: shows do not carry an optimistic-lock `version` field (unlike creator roster). Behavior is unchanged from today's dialog.

### 3.3 Actuals tab (`shows/$showId/actuals.tsx`)

- `createFileRoute('/studios/$studioId/shows/$showId/actuals')`.
- Extract the inner `ShowActualsDialogForm` body from `show-actuals-dialog.tsx` into a reusable **`ShowActualsForm`** component (props: `studioId`, `show`, optional `onSaved`). Same `useUpdateStudioShow` mutation, same inverted-range guard, same Clear actions.
- `ShowActualsDialog` (used by `/task-setup`) is **refactored to consume `ShowActualsForm`** so the dialog quick-action and the tab share one implementation. The task-setup dialog **stays** — it is an operational quick-action, not part of the dialog→route conversion.
- The tab renders `ShowActualsForm` in a bordered card (no `DialogFooter` chrome difference is acceptable; keep the existing Save/Clear buttons).

### 3.4 Compensation tab (`shows/$showId/compensation.tsx`)

- `createFileRoute('/studios/$studioId/shows/$showId/compensation')`.
- Reuse `ShowCreatorList` directly (`studioId`, `showId`, `showStartTime=detail.start_time`, `showEndTime=detail.end_time`). It self-gates manage-compensation to ADMIN/MANAGER and embeds its own `AddCreatorDialog` + `ShowCreatorCompensationDialog` (both stay dialogs — sub-edits, out of PR 14 scope).
- This is the **same component** mounted at `/creator-mapping/:showId`. The two surfaces overlap intentionally for now; convergence (point the `/creator-mapping/:showId` entry points at `/shows/:showId/compensation` and retire the legacy route — no redirect shim) is **deferred to PR 21.7**, the "Route Revamp" PR that also retires `/task-setup/:showId/tasks`. See §6.

## 4. Backend & authorization

- **No backend change.** `GET` and `PATCH /studios/:studioId/shows/:showId` already exist and are studio-scoped. `GET` returns `StudioShowDetail` with `platforms` + actuals.
- **No authorization change.** The whole subtree inherits `shows.tsx`'s `routeKey="shows"` guard (ADMIN + MANAGER). `ShowCreatorList` self-gates compensation management. Unlike 14a, no guard is loosened.

## 5. Entry points / wiring changes

- `studio-show-management-columns.tsx`: the row **Edit** action (`onEdit`) changes from "open Edit Show dialog" to **navigate** to `/studios/$studioId/shows/$showId` (Details tab). Keep the existing "Open Tasks" extra action.
- `shows/index.tsx`: remove `editingShow` state, the Edit `<Dialog>` + `StudioShowManagementForm` mount, `editingShowQuery` (`useStudioShow`), and `useUpdateStudioShow`. The **Create** dialog and **Delete** confirm dialog stay (inline-create + destructive are out of scope).
- `show-update-dialog.tsx` / `show-update-form.tsx` (the `features/shows/` ones used only by `/system/shows`) are **not touched** — different surface.

## 6. PR 21.7 overlap (recorded, not implemented here)

PR 21.7 is the post-14c "Frontend Show Details Tabs & Route Revamp". It will:
- add **Performance** and **Submitted Tasks** tabs to `/shows/:showId`, and
- retire the legacy `/task-setup/:showId/tasks` view.

The same convergence applies to `/creator-mapping/:showId`. Per the internal-app
route-rename convention (clean rename over redirect shim), 21.7 should **rewire the
entry-point links/buttons** (creator-mapping list, task-setup deep links) to
`/shows/:showId/compensation` and **remove** the legacy `/creator-mapping/:showId`
route — not add a redirect. 14c records this in the 21.7 scope (roadmap row +
analytics PRD) so the creator-mapping convergence lands with the task-setup one
rather than widening 14c's blast radius.

## 7. Testing

- **Frontend** (new `shows/$showId` route tests + retargeted `show-actuals` test):
  - Route renders the header + the three tabs (Details / Actuals / Compensation) from the detail query; not-found state renders the bordered error.
  - Details tab: form is editable; Save calls `useUpdateStudioShow` with the unlink-aware transform and stays on the page.
  - Actuals tab: `ShowActualsForm` saves actual start/end; inverted-range guard blocks save.
  - Compensation tab: renders `ShowCreatorList` for the show.
  - Retarget `show-actuals-dialog.test.tsx` to assert the extracted `ShowActualsForm` behavior (the dialog test keeps passing since the dialog wraps the same form).
- **Backend**: none (no endpoint change).

## 8. Docs & roadmap (PR 14 wrap-up — same PR)

- `apps/erify_studios/docs/ENTITY_DETAIL_ROUTES.md`: flip 14c → ✅ Shipped; status line → all four shipped; add a **"14c — show detail (shipped)"** section with the Details/Actuals/Compensation tabs, the entity-appropriate naming note, the authorization table, and the finalized share-link contract (none). Add the 21.7 convergence follow-up.
- `docs/roadmap/PHASE_4.md`: row 14 → ✅ Shipped; add a **Landed (2026-06-06, PR #…)** note for 14c; update the header "Remaining" count and drop "🚧 In progress (14c)". Add the `/creator-mapping/:showId` link-rewire + retirement (no redirect) to PR 21.7's row/section scope.
- `docs/features/show-performance-analytics.md` PR 21.7 deliverables: add rewiring `/creator-mapping/:showId` entry points to `/shows/:showId/compensation` and retiring the legacy route (no redirect shim), alongside the task-setup retirement.
- **Skill**: `.agent/skills/frontend-ui-components/SKILL.md` — update the entity-detail-route pattern note: the first tab is **entity-appropriate** ("Profile" for people entities; "Details" for record entities like shows), and shows use **Details | Actuals | Compensation**.
- **Retire** `docs/superpowers/specs/2026-06-05-pr-14-entity-detail-routes-design.md` (the 14a draft spec) — the 14a–14d series is now closed and durable content lives in `ENTITY_DETAIL_ROUTES.md`.
- Run `knowledge-sync.md`; retire **this** spec via `doc-lifecycle.md` once 14c merges.

## 9. Verification gates

```
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```
(TanStack `routeTree.gen.ts` regenerates on dev/build; ensure it is regenerated and committed. No `erify_api` change, so its gate is informational only.)

## 10. Risks / assumptions / follow-ups

- **Assumption**: `StudioShowDetail` from `GET :showId` carries everything the three tabs need (it does: core fields + `platforms` + `actual_start_time`/`actual_end_time`; `ShowCreatorList` fetches its own creator rows via `useShowCreatorsQuery`). The list `StudioShow` (`ShowWithTaskSummaryDto`) is only used by the list page.
- **Assumption**: no importer of the Edit Show dialog other than `shows/index.tsx` (the dialog is inline, not a shared component) — verified during implementation.
- **Follow-up (21.7)**: converge `/creator-mapping/:showId` and `/task-setup/:showId/tasks` into `/shows/:showId` tabs with redirects.
- **Non-goal**: Performance / Submitted Tasks tabs (21.7), and any change to the `/system/shows` admin surface.
