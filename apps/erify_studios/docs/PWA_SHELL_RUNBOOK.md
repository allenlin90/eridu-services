# PWA Shell Runbook

## Scope

This runbook covers app-shell PWA behavior for `erify_studios`:
- web app manifest,
- service worker lifecycle and updates,
- service worker/cache recovery.

Feature-level context lives in [Frontend PWA App Shell](../../../docs/features/frontend-pwa-app-shell.md).

Push notification delivery is tracked in the [Operational Notifications and PWA Push PRD](../../../docs/prd/notification-system.md). Advanced offline mutation workflows remain deferred.

## Static Hosting Policy

- The production server explicitly rewrites `/` and extensionless client routes to `index.html`.
- Asset-like requests, including `.css`, `.js`, images, and the web manifest, must never use the SPA fallback. A missing asset must return 404 instead of HTML.
- This boundary prevents a CDN from caching `index.html` under a hashed asset URL during a deployment overlap, which would make the app appear unstyled or fail with MIME-type errors.
- If an asset URL was already poisoned, purge that exact URL from the external CDN after deploying the corrected server configuration.
- See [`pwa-best-practices` skill § Static Hosting / SPA Fallback](../../../.agents/skills/pwa-best-practices/SKILL.md) for the pattern and the browser-cache verification gotcha before changing this again.

## Update Policy

- Update strategy: `prompt` via `vite-plugin-pwa`, with runtime auto-apply on non-iOS and manual apply on iOS.
- Runtime behavior:
  - service worker registers in production only,
  - initial + periodic update checks run automatically,
  - non-iOS browsers auto-apply the waiting worker once per tab session,
  - iOS browsers keep the waiting worker pending and require an explicit apply path to avoid standalone reload loops.
- Navigation fallback is bound to `/` rather than `index.html` so hosts that canonicalize `index.html` do not return redirected document responses through the service worker. `/` is also registered as a Workbox templated precache URL backed by `index.html`; otherwise `createHandlerBoundToURL('/')` fails with `non-precached-url`.
- API responses remain `NetworkOnly` in service worker runtime caching to avoid double-caching with TanStack Query persistence.

## Recovery Entry Point

Navigate to **Settings** (`/settings`) when app shell updates appear stuck after deployment.

Available actions:
1. **Check for updates**: trigger immediate service worker update check, or apply a waiting update when one is already ready.
2. **Reset app shell**: unregister service workers, clear caches, and reload.

## Manual Verification Checklist

1. Open the app in Chromium and install as PWA.
2. Deploy a new build with changed static assets.
3. Confirm the app updates to latest shell and reloads cleanly.
4. Confirm outdated caches are removed.
5. Use the **Reset App Shell** action in Settings and verify app reloads in a clean state.
6. Request `/` and a nested extensionless route; confirm both return the app's `index.html`, not a directory listing.
7. Request a nonexistent `.css` or `.js` asset and confirm it returns 404 rather than `index.html`.
8. Verify with `curl` first (server/CDN behavior, no client cache involved), then in an incognito/private window or with DevTools "Disable cache" + hard reload. A plain reload in an already-open regular browser tab can show a stale result in either direction — DevTools "Clear site data" and unregistering the service worker do not clear the browser's HTTP disk cache, which independently honors `Cache-Control: max-age` on hashed assets.
