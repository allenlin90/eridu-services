---
name: pwa-best-practices
description: Comprehensive patterns for building high-quality Progressive Web Apps (PWA) with Vite and React. Focuses on avoiding anti-patterns like "Double Caching", ensuring long-term maintainability, and synchronizing Service Worker caching with application-level data managers like TanStack Query.
---

# PWA Best Practices

This skill provides architectural guidelines and patterns for building and maintaining robust PWAs in a modern React ecosystem.

## Monorepo Rollout Intent (Eridu)

Use this skill when introducing or refining PWA support in `apps/erify_studios` and `apps/erify_creators`.

- Prefer an app-by-app rollout with one canonical migration checklist.
- Start with `erify_studios` as the benchmark implementation.
- Reuse the same PWA conventions in other FE apps unless there is a documented product constraint.
- Keep changes incremental: infra/bootstrap first, then offline UX and advanced sync.

## Recommended Rollout Phases

1. **Foundation**
   - Add and configure `vite-plugin-pwa` in `vite.config.ts`.
   - Define manifest metadata (name, short_name, theme/background colors, display, icons).
   - Ensure icon assets exist (including `maskable` variants).
2. **Runtime Caching Contract**
   - Cache static assets via Workbox (`StaleWhileRevalidate`/`CacheFirst`).
   - Keep API traffic `NetworkOnly` when TanStack Query owns API data caching.
3. **App Integration**
   - Register SW entry in `src/main.tsx` via `virtual:pwa-register` (or equivalent helper module).
   - Implement update UX (prompt or auto-update strategy) aligned with product behavior.
4. **Offline Experience**
   - Add connectivity status UI.
   - Add “offline copy” indicators when cached query data is shown.
5. **Hardening**
   - Verify installability, update flow, and offline fallback behavior.
   - Run Lighthouse PWA audits and document deviations.

## Core Architecture: Segregation of Responsibilities

The most critical principle for long-term PWA health is separating **App Shell** (Assets) from **Data State** (API).

### 1. App Shell (Service Worker / Workbox)
The Service Worker should be the authority for static files.
- **Purpose:** Fast loading, offline UI availability.
- **Content:** HTML, JS bundles, CSS, fonts, local icons.
- **Strategy:** `StaleWhileRevalidate` (balancing speed and freshness) or `CacheFirst` (for immutable hashed assets).

### 2. Data State (TanStack Query / idb-keyval)
The application code should be the authority for API data.
- **Purpose:** Reactivity, fine-grained freshness (staleTime), mutations, and offline data access.
- **Content:** JSON responses from API endpoints.
- **Strategy:** TanStack Query memory cache + `idb-keyval` persistence layer.

## The "Double Caching" Anti-Pattern

**Definition:** Caching the same API response in both the Service Worker (Workbox) and the application layer (TanStack Query).

### Why it's bad:
1.  **Stale Data Loops:** If Workbox uses `StaleWhileRevalidate` for API calls, it might serve a stale response to TanStack Query. TanStack Query thinks it got fresh data and won't realize the SW has triggered a background update. This leads to the UI lagging behind the actual server state.
2.  **Redundancy:** Data is stored twice (once as raw JSON in SW cache, once as dehydrated state in IndexedDB), wasting user storage.
3.  **Complex Invalidation:** Inverting or clearing the cache requires touching two systems that don't talk to each other.

### How to avoid:
Explicitly tell the Service Worker to ignore API routes managed by TanStack Query.

```typescript
// vite.config.ts
VitePWA({
  workbox: {
    // 1. Prevent SW from handling navigation requests for API routes
    navigateFallbackDenylist: [/^\/api/],
    // 2. Set API routes to 'NetworkOnly' to bypass SW cache entirely
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/api'),
        handler: 'NetworkOnly', // SW intercepts but always goes to network
      },
    ],
  },
})
```

## Best Practices for Long-Term Development

### 1. Versioning and Updates
Use `registerType: 'prompt'` or `registerType: 'autoUpdate'`. 
- **Prompt:** Better for apps where a sudden reload might lose user work (e.g., editors, forms).
- **AutoUpdate:** Better for read-heavy apps where freshness is priority.
- **Platform-specific update policy:** If one platform needs manual update application but others can auto-apply, prefer `registerType: 'prompt'` and decide in runtime whether to call the returned update function.

### 2. Assets and Icons
- **Maskable Icons:** Always provide `purpose: 'any maskable'` icons for Android compatibility.
- **Theme Color:** Sync the `theme_color` in `manifest.json` with the `<meta name="theme-color">` in `index.html` and the app's CSS variables.
- **SPA Fallback URL:** If the production host canonicalizes `/index.html` to `/`, set Workbox `navigateFallback: '/'` instead of relying on the default `index.html`. Otherwise navigation requests can fail with browser errors about service-worker responses containing redirections.

### 3. Offline UX
- **Connectivity Status:** Implement a hook (e.g., `useOnlineStatus`) to show a non-intrusive banner when the app is offline.
- **Offline Data Indicators:** If TanStack Query serves stale/cached data while offline, show a "Viewing Offline Copy" indicator.

### 4. Background Sync (Advanced)
For mutations made while offline, use Workbox Background Sync or TanStack Query's mutation persistence to replay requests when the connection is restored.

## Implementation Guardrails (Eridu FE)

- Keep route URL/search-param behavior unchanged during PWA migration.
- Avoid coupling SW logic with feature modules; keep PWA bootstrap in app entry + config boundaries.
- Do not introduce duplicate caches for the same API payload.
- Keep PWA-specific env/config documented so deployments are deterministic.

## Verification Expectations

For each frontend app changed for PWA work:

1. `pnpm --filter <app> lint`
2. `pnpm --filter <app> typecheck`
3. `pnpm --filter <app> test`
4. `pnpm --filter <app> build`

Also manually verify:

- Browser install prompt / installability.
- SW update behavior (prompt vs auto) as configured.
- Offline app-shell loading.
- Online→offline→online transition for a representative data-heavy screen.
