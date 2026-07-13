---
name: pwa-best-practices
description: Build Vite and React PWAs with correct service workers, offline behavior, installability, and cache coordination.
---

# PWA Best Practices

Architectural guidelines for building and maintaining PWAs in the React ecosystem.

## Monorepo Rollout

- App-by-app rollout: `erify_studios` (first) and `erify_creators` (second)
- Reference: `docs/features/frontend-pwa-app-shell.md`, `apps/erify_studios/docs/PWA_SHELL_RUNBOOK.md`, and `apps/erify_creators/docs/PWA_SHELL_RUNBOOK.md`
- Reuse same conventions across FE apps

## Rollout Phases

1. **Foundation**: `vite-plugin-pwa`, manifest, icon assets (including maskable)
2. **Runtime Caching**: Static assets via Workbox. API traffic `NetworkOnly` (TanStack Query owns API caching)
3. **App Integration**: Register SW in `main.tsx`, implement update UX
4. **Offline Experience**: Connectivity status UI, "offline copy" indicators
5. **Hardening**: Installability verification, Lighthouse audits

## Core Architecture: Segregation

| Layer | Authority | Content | Strategy |
|---|---|---|---|
| App Shell (SW/Workbox) | Static files | HTML, JS, CSS, fonts | `StaleWhileRevalidate` / `CacheFirst` |
| Data State (TanStack Query) | API data | JSON responses | Memory cache + `idb-keyval` persistence |

## 🔴 "Double Caching" Anti-Pattern

Never cache the same API response in both SW and TanStack Query. Causes stale data loops, redundant storage, complex invalidation.

**Fix**: Set API routes to `NetworkOnly` in Workbox runtime caching. Add `navigateFallbackDenylist: [/^\/api/]`.

## iOS/iPadOS PWA Pitfalls

- `controllerchange → reload()` loops in standalone mode
- **Solution**: `registerType: 'prompt'`, bypass reload on iOS entirely, stash `updateSW` for manual user trigger
- Session guard: `sessionStorage` flag caps reload at once per tab session (non-iOS)
- Reference: `apps/erify_studios/src/lib/pwa/pwa-runtime.ts`

## Implementation Guardrails

- Keep route URL/search-param behavior unchanged during PWA migration
- Keep PWA bootstrap in app entry + config boundaries (not feature modules)
- No duplicate caches for same API payload
- Limit the production host's SPA fallback to client-route navigations, including the
  bare root path `/`. Missing asset-like paths such as `.css` and `.js` must return
  404, never `index.html`, so intermediary caches cannot poison immutable asset URLs.
  See § Static Hosting / SPA Fallback below — a fallback rule that only matches
  extensionless *nested* paths (`/:path([^.]+)`, one-or-more) silently excludes `/`
  itself and breaks the app shell at the root.
- Document PWA env/config for deterministic deployments

## Static Hosting / SPA Fallback (CDN Cache-Poisoning Prevention)

A blanket `serve -s ./dist` SPA fallback rewrites *any* unmatched path — including a
temporarily-missing hashed asset during a deployment overlap — to `index.html` with a
cacheable `200`. A CDN (Cloudflare) can then cache that HTML response under the exact
hashed `.css`/`.js` URL, so every later request for that asset serves unstyled HTML
(MIME mismatch) until the poisoned URL is purged. `erify_creators` fixes this
(`apps/erify_creators/serve.json`); `erify_studios` currently still runs the
unconstrained `serve -s` fallback and accepts this risk — see
`docs/tech-debt/erify-studios-unconstrained-spa-fallback.md` before re-attempting a fix
there.

Correct `serve.json` pattern — **both** rules are required:

```json
{
  "cleanUrls": false,
  "rewrites": [
    { "source": "/", "destination": "/index.html" },
    { "source": "/:path([^.]+)", "destination": "/index.html" }
  ]
}
```

- The second rule's `[^.]+` requires **one or more** non-dot characters, so it never
  matches the bare root path `/`. Without the first rule, `serve` falls through to its
  own directory-listing page at `/` instead of the app shell — a full outage, not a
  partial-styling bug, and easy to miss because a directory listing also returns
  `200 text/html` (check the response **body**, not just status/content-type).
- After deploying, the exact previously-poisoned asset URL still needs a manual CDN
  purge — a server-side fix only stops *new* poisoning, it cannot invalidate an
  already-cached CDN object.

### Verification gotcha: the browser can mask both the bug and the fix

DevTools **"Clear site data"** and unregistering the service worker clear Storage APIs
(cookies, localStorage, IndexedDB, Cache Storage) — neither touches the browser's plain
**HTTP disk cache**, which independently obeys `Cache-Control: max-age` on every
`fetch`/`<script>`/`<link>` response regardless of any service worker. A long
`max-age` on hashed assets means a browser can keep serving an old build's JS/CSS from
disk cache for hours after a redeploy, with no storage-level reset able to clear it.

When validating any static-hosting/SPA-fallback change:

- Verify with `curl -D -` (or a fresh, cookie-less `fetch`) against the live URL first —
  confirms server/CDN behavior independent of any client cache.
- Then verify in an **incognito/private window** or with DevTools Network → "Disable
  cache" + hard reload — never trust a plain reload in an already-open regular browser
  profile, since it can show a stale-broken page after a real fix ships, or (leftover
  from a previous bad deploy) a stale-styled page that looks fine but isn't testing the
  current build.
- If a JS console check is useful, `[...document.styleSheets].map(s => ({href: s.href,
  rules: s.cssRules?.length}))` reveals a stylesheet that loaded (200) but parsed to
  zero rules — a stronger signal than status code alone.

## Verification

```bash
pnpm --filter <app> lint && pnpm --filter <app> typecheck && pnpm --filter <app> test && pnpm --filter <app> build
```

Manual: install prompt, SW update behavior, offline app-shell loading, online→offline→online transition.

At the production HTTP boundary, also verify that `/` and a nested extensionless route
both return the app shell (not a directory listing), a real hashed asset returns its
correct MIME type, and a nonexistent `.css` or `.js` asset returns 404 — via `curl`
first, then a fresh/incognito browser session (see the verification gotcha above).
