# Scene QC

Scene QC is the persisted, Show-level scene review workflow at `/studios/:studioId/scene-review`. It replaced the read-only Scene Review workspace (PR #319, Phase 5 item 22): the route and nav label are retained, but the capability now records a durable outcome per Show instead of only exposing screenshot evidence.

See [Feature: Scene Quality Control](../../../docs/features/scene-qc.md) for product rules, role model, and acceptance record. This document covers shipped frontend behavior only.

## Access and routes

- `/studios/:studioId/scene-review` — Daily Review, Records, and Reports (tab-addressable).
- `/studios/:studioId/scene-review/profiles` — Client Scene Profile manager, reached from the workspace's **Manage Scene Profiles** page action.
- `STUDIO_ROUTE_ACCESS.sceneReview` = `[DESIGNER, MANAGER, ADMIN]`. The route guard, sidebar visibility, and API guard all read this one policy source (`src/lib/constants/studio-route-access.ts`).
- The nav label stays "Scene Review" even though the capability and every other doc call it Scene QC — a deliberate, recorded terminology choice to avoid retraining cost on a live surface.

## Tabs and URL state

- `tab=daily` (default), `tab=records`, and `tab=reports` are handled by one composed `sceneQcSearchSchema`. Records and Reports share the URL-backed `date_from` / `date_to` range; Records adds `result` and `record_id`.
- Switching tabs resets `page` to `1` and clears the OTHER tab's exclusive selection param (`record_id` when entering Daily, `show_id` when entering Records); `client_id` and `platform_id` survive the switch.
- Daily fields: `date` (operational date; `undefined` means "current operational day" and is resolved via `getCurrentOperationalDate()`, then written into the URL on first navigation so back/forward stays stable), `client_id`, `platform_id`, `review_state` (`all` / `unreviewed` / `reviewed` / `blocked`), `search`, `show_id`, `page`, `limit`.

## Daily Review

- The workspace uses one responsive master-detail flow: queue/progress on the left and a large Live/Expected comparison plus structured result form on the right. Mobile opens the selected Show in a full-height drawer. There are no swipe gestures or duplicated Overview/Review modes.
- A Show with no designated evidence is blocked and shows the no-evidence panel; it cannot receive an outcome.
- A missing Client Scene Profile shows a warning panel but does not block review.
- A blank, corrupted, or non-viewable image has an unusable-image Fail shortcut.
- Minor and Fail reveal the scene-type-gated element/issue picker and require at least one structured issue. The free-text note stays visible but optional.
- **Manage options** opens the responsive organization-wide taxonomy manager. Designer, Manager, and Admin can add shared elements/issue types and retire custom entries; protected built-ins remain available.
- Saving advances to the next unreviewed Show ("Save & next").
- An optimistic-conflict (409) response surfaces inline rather than silently overwriting; the draft form resets only on `show_id` change, never on evidence/expected-reference re-resolution, using the same "latest ref" guard pattern as `use-scene-profile-editor.ts` so a slow in-flight save cannot clobber a newer Show selection.

## Confirmation states

`SceneQcConfirmationCard` renders four states, driven purely by the daily summary response:

1. **Loading** — skeleton while the summary is unresolved.
2. **UNCONFIRMED** — confirm action, disabled until every eligible Show has an outcome.
3. **CURRENT** — confirmed banner with revision number, confirming operator, and confirmation time; opens the current report.
4. **STALE** — amber banner naming what changed (added/removed/changed counts) since the last revision, a Reconfirm action, and a note that the prior revision's report remains available and attributable from Records (its "Open current report" action is disabled — the stale day has no current report).

## Records and manager report

- Records is a server-paginated table, independent of the Daily Review queue, filterable by date range, Client, platform, and result.
- Selecting a record opens its full context (evidence, expected reference, original and effective findings, confirmation status) in a lazy-loaded detail Sheet (desktop) or Drawer (mobile).
- Confirmed records expose an append-only entry form. A comment adds context; a correction adds a replacement result and findings. The original review and all prior entries remain immutable.
- The manager report is available only for a confirmed day, in-app and as a CSV download. Report identity, Client/platform breakdowns, and Show detail are pinned at confirmation time.

## Period Reports

- Reports is a separate tab rather than a mode inside Daily Review.
- Week, month, quarter, and custom range controls query confirmed historical scope only.
- Summary cards, pass-rate trend, result mix, Client comparison, and issue ranking all use the backend's centralized effective-result/finding aggregation.
- **Print / Save PDF** uses a print-specific A4 layout and the browser print dialog; no client-side PDF library or duplicate reporting calculation is introduced.

## Scene Profile manager

- A shared asynchronous Client combobox selects the Client to manage.
- Each Client has at most one active Scene Profile: one reference image plus a required scene type (`GRAPHIC_BG` or `REAL_BACKDROP`).
- Replace and retire are supported; there is no profile revision history — a review's snapshotted expected image is independent of later profile edits.

## Operational day

- The durable operational-day window is resolved **server-side** from a date-only `operational_date`, using the shared `SCENE_QC_OPERATIONAL_TIMEZONE` constant — never from client-submitted bounds.
- The browser clock supplies only the first-load default date (`getCurrentOperationalDate()` in `features/scene-qc/lib/scene-qc-operational-date.ts`, which correctly converts via `Intl.DateTimeFormat` on the shared `SCENE_QC_OPERATIONAL_TIMEZONE` constant — a device set to a different timezone still resolves the right calendar date). It is deliberately separate from the browser-local `lib/operational-day-range.ts` used by read-only review surfaces. The residual risk (a skewed system clock briefly picking the wrong default day on first load, never the durable server scope) is [accepted tech debt](../../../docs/tech-debt/scene-qc-default-operational-date-browser-clock.md).

## Canonical implementation

- Routes: `src/routes/studios/$studioId/scene-review.tsx` (layout/guard), `scene-review/index.tsx` (Daily Review + Records), `scene-review/profiles.tsx` (Scene Profile manager)
- Workspace: `src/features/scene-qc/components/scene-qc-workspace.tsx`, `scene-qc-tabs.tsx`, `scene-qc-daily-workspace.tsx`
- URL state: `src/features/scene-qc/config/scene-qc-search-schema.ts`, `scene-qc-daily-search-schema.ts`, `scene-profile-search-schema.ts`
- API integration: `src/features/scene-qc/api/`
- Shared API types: `packages/api-types/src/scene-qc/`
- Backend capability: `apps/erify_api/src/capabilities/scene-qc/` — see [apps/erify_api/docs/SCENE_QC.md](../../erify_api/docs/SCENE_QC.md)
