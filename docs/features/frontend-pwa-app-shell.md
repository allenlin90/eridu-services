# Feature: Frontend PWA App Shell

> **Status**: ✅ Implemented — `erify_studios` and `erify_creators`
> **Workstream**: Frontend platform
> **Canonical docs**: [`erify_studios` PWA runbook](../../apps/erify_studios/docs/PWA_SHELL_RUNBOOK.md), [`erify_creators` PWA runbook](../../apps/erify_creators/docs/PWA_SHELL_RUNBOOK.md), [`pwa-best-practices` skill](../../.agents/skills/pwa-best-practices/SKILL.md)
> **Active follow-up**: [Operational Notifications and PWA Push](../prd/notification-system.md)

## Problem

Studio operators and creators need their workspaces to behave like stable app shells: installable where supported, resilient across deploys, and recoverable when a browser keeps an outdated service worker or cache.

## Users

| Role | Need |
| --- | --- |
| Studio operator | Reopen the studios workspace quickly during day-to-day work |
| Studio admin / manager | Recover from stale app-shell state without engineering intervention |
| Creator | Reopen the creator workspace and recover stale shell or query state |
| Frontend engineer | Reuse one documented PWA pattern for future frontend apps |

## What Was Delivered

- `erify_studios` and `erify_creators` ship installable web app manifests and icon sets.
- The app registers a production-only service worker through a centralized PWA runtime module.
- Service worker updates use a prompt-based lifecycle with periodic update checks.
- Non-iOS browsers can auto-apply a waiting worker once per tab session.
- iOS browsers keep waiting workers pending for an explicit user-triggered update path.
- Settings exposes app-shell recovery actions for update checks, service-worker unregister, cache clearing, and reload; the creators app also clears its persisted query cache.
- Workbox serves the SPA fallback from `/` for hosts that canonicalize `index.html`, with `/` included in precaching through `templatedURLs`.
- The production static server maps `/` and extensionless client routes to the app shell; asset-like misses return 404 so a CDN cannot cache HTML under a CSS or JavaScript URL.
- API requests remain `NetworkOnly` in Workbox so TanStack Query owns API data caching.

## Key Product Decisions

- **App shell only**: this feature covers static shell install/update/recovery behavior, not offline mutation replay or push notifications.
- **Prompt-based update control**: the runtime uses `registerType: 'prompt'` so platform-specific update behavior can be handled safely.
- **iOS manual update path**: installed iOS PWA reload loops are avoided by skipping automatic `controllerchange` reloads on iOS.
- **One cache authority for API data**: service-worker API caching is avoided because TanStack Query persistence owns application data freshness.
- **Root fallback precaching**: when Workbox binds navigation fallback to `/`, `/` itself must be in the precache manifest.
- **Asset misses stay asset misses**: the host must return 404 for missing asset-like paths rather than applying the SPA fallback.

## Acceptance Record

- [x] Manifest metadata and PWA icons are configured for both frontend apps
- [x] Service worker registration is centralized in app runtime code
- [x] Update checks run on registration and periodically afterward
- [x] Non-iOS forced reload is capped to once per tab session
- [x] iOS update application is explicit rather than automatic
- [x] Settings provides update and recovery actions in both apps
- [x] Workbox navigation fallback excludes API routes
- [x] Workbox navigation fallback binds to a precached `/` shell URL
- [x] Production hosting serves the app shell at `/` and extensionless client routes while missing asset-like paths return 404
- [x] API traffic remains `NetworkOnly` in service-worker runtime caching

## Forward References

- [Operational notifications, inbox, delivery preferences, and PWA push](../prd/notification-system.md)
- Offline mutation queue or background sync workflows
