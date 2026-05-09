# Feature: Frontend PWA App Shell

> **Status**: ✅ Implemented — `erify_studios`
> **Workstream**: Frontend platform
> **Canonical docs**: [`PWA_SHELL_RUNBOOK.md`](../../apps/erify_studios/docs/PWA_SHELL_RUNBOOK.md), [`pwa-best-practices` skill](../../.agent/skills/pwa-best-practices/SKILL.md)
> **Related ideation**: [Creator PWA parity and push notifications](../ideation/pwa-push-notifications.md)

## Problem

Studio operators need the studios workspace to behave like a stable app shell: installable where supported, resilient across deploys, and recoverable when a browser keeps an outdated service worker or cache.

## Users

| Role | Need |
| --- | --- |
| Studio operator | Reopen the studios workspace quickly during day-to-day work |
| Studio admin / manager | Recover from stale app-shell state without engineering intervention |
| Frontend engineer | Reuse one documented PWA pattern for future frontend apps |

## What Was Delivered

- `erify_studios` ships an installable web app manifest and icon set.
- The app registers a production-only service worker through a centralized PWA runtime module.
- Service worker updates use a prompt-based lifecycle with periodic update checks.
- Non-iOS browsers can auto-apply a waiting worker once per tab session.
- iOS browsers keep waiting workers pending for an explicit user-triggered update path.
- Settings exposes app-shell recovery actions for update checks, service-worker unregister, cache clearing, and reload.
- Workbox serves the SPA fallback from `/` for hosts that canonicalize `index.html`, with `/` included in precaching through `templatedURLs`.
- API requests remain `NetworkOnly` in Workbox so TanStack Query owns API data caching.

## Key Product Decisions

- **App shell only**: this feature covers static shell install/update/recovery behavior, not offline mutation replay or push notifications.
- **Prompt-based update control**: the runtime uses `registerType: 'prompt'` so platform-specific update behavior can be handled safely.
- **iOS manual update path**: installed iOS PWA reload loops are avoided by skipping automatic `controllerchange` reloads on iOS.
- **One cache authority for API data**: service-worker API caching is avoided because TanStack Query persistence owns application data freshness.
- **Root fallback precaching**: when Workbox binds navigation fallback to `/`, `/` itself must be in the precache manifest.

## Acceptance Record

- [x] Manifest metadata and PWA icons are configured for `erify_studios`
- [x] Service worker registration is centralized in app runtime code
- [x] Update checks run on registration and periodically afterward
- [x] Non-iOS forced reload is capped to once per tab session
- [x] iOS update application is explicit rather than automatic
- [x] Settings provides update and recovery actions
- [x] Workbox navigation fallback excludes API routes
- [x] Workbox navigation fallback binds to a precached `/` shell URL
- [x] API traffic remains `NetworkOnly` in service-worker runtime caching

## Forward References

- `erify_creators` PWA parity
- Push subscription lifecycle and server-side push delivery
- In-app notification inbox and delivery preferences
- Offline mutation queue or background sync workflows
