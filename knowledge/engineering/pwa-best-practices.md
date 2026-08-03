# Progressive Web App (PWA) Standard

okf_version: "0.2"
type: engineering_standard
status: active
stale_after: "2027-01-01"

## Overview

Canonical PWA offline caching, Service Worker lifecycle, and manifest standards for `apps/erify_creators` and `apps/erify_studios`.

## PWA Rules

1. **Vite Plugin PWA Integration**: Configure `vite-plugin-pwa` in `vite.config.ts` with `registerType: 'autoUpdate'` or prompt UI.
2. **Workbox Navigation Fallback**: Set `navigateFallback: '/'` with `navigateFallbackDenylist: [/^\/api/]` so API calls never serve cached HTML shells.
3. **Offline State Persistence**: Persist client-side TanStack Query cache in IndexedDB via `idb-keyval` and `@tanstack/react-query-persist-client`.
4. **App Shell Assets**: Precache icons, manifest icons (`192x192`, `512x512`), and core bundle chunks.
