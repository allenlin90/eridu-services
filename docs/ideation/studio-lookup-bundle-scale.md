# Ideation: Studio Lookup Bundle Scalability

> **Status**: Active ideation
> **Origin**: Phase 4 show management PR review, April 2026
> **Related**: [studio-lookup.controller.ts](../../apps/erify_api/src/studios/studio-lookup/studio-lookup.controller.ts), [studio-show-management-form.tsx](../../apps/erify_studios/src/features/studio-shows/components/studio-show-management-form.tsx)

## What

The `GET /studios/:studioId/lookups` bundle endpoint fetches all lookup entity types (clients, platforms, show types, show standards, show statuses, studio rooms) in a single request using a hard cap of `DEFAULT_LOOKUP_LIMIT = 200` records per type. There is no search filtering on clients or platforms — the cap silently truncates when any type has more than 200 records.

The `DataTableToolbar` filter controls for `client_id` and `platform_name` on the show management page consume this bundle directly, making the truncation user-visible for any studio with more than 200 clients or platforms.

## Why It Was Considered

The Phase 4 show management PR introduced new toolbar filter dropdowns for `client_id` and `platform_name`. These dropdowns depend on the static lookup bundle. Studios with more than 200 clients or platforms will silently receive a truncated list, making it impossible to filter by records that fall outside the cap.

The per-field async lookup hooks (`useStudioShowClientOptions`, `useStudioShowPlatformOptions`) in the create/edit form do support live search, but the toolbar filter uses the static bundle, creating an inconsistency: form controls are correct, toolbar controls are not.

## Why It Was Deferred

1. Current studios have far fewer than 200 clients or platforms — the truncation is not yet user-visible.
2. Per-type searchable lookup endpoints already exist for form controls (e.g. `GET /studios/:studioId/lookups/clients`) and can be extended to the toolbar when the need arises.
3. Reworking the toolbar to use per-type async selects requires a separate UX pass with clear interaction design for the filter panel (async dropdowns in toolbars have different UX requirements than form fields).
4. The bundle endpoint is a convenience for initial page load; per-field async endpoints are the right long-term pattern.

## Decision Gates (Promote When Any Are True)

1. Any studio reaches **150+ clients or platforms** — the 200-record buffer is then within range and operator impact is likely.
2. Operators report **missing filter options** in the show management toolbar (a direct truncation symptom).
3. A **UX polish phase** is planned that includes the filter panel — rework the toolbar filter controls to use per-type async selects at that time.
4. A studio is **onboarded with more than 200 of any lookup type** as part of a planned migration or import.

## Implementation Notes (Preserved Context)

### Short-term mitigation

The `DEFAULT_LOOKUP_LIMIT` constant is in `studio-lookup.controller.ts:35`. If the count for a specific type is approaching the limit, it can be raised per-type before a full redesign is warranted.

### Long-term fix

Replace static bundle consumption in `DataTableToolbar` with per-type async combobox controls that call the existing per-type endpoints (e.g. `GET /studios/:studioId/lookups/clients?search=...`). These endpoints already support search and pagination — the work is on the frontend filter panel only.

### Form field local-filter pattern (onSearch for show-statuses)

`useStudioShowStatusOptions` (use-studio-show-form-lookup-options.ts:164–186) uses client-side filtering via `filterOptions()` because the `/show-statuses` endpoint does not accept a `name` filter parameter. This is correct for a finite, system-level list today. Revisit this design when:

1. Show statuses grow beyond **~20 entries** — client-side filtering over a larger set degrades UX noticeably.
2. The `/show-statuses` endpoint gains a `name` search parameter — the local fallback can be removed and replaced with API-side filtering, consistent with all other form lookup fields.

Until then, `filterOptions()` is the correct approach. The comment in the hook documents the intentional deviation.

### Per-type endpoints available

- `GET /studios/:studioId/lookups/clients`
- `GET /studios/:studioId/lookups/platforms`
- `GET /studios/:studioId/lookups/studio-rooms`

All support `search` and `limit` query parameters. The bundle endpoint should remain for types without scale risk (show types, standards, statuses — these are system-level and bounded).
