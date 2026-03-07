---
name: pwa-best-practices
description: Comprehensive patterns for building high-quality Progressive Web Apps (PWA) with Vite and React. Focuses on avoiding anti-patterns like "Double Caching", ensuring long-term maintainability, and synchronizing Service Worker caching with application-level data managers like TanStack Query.
---

# PWA Best Practices

This skill provides architectural guidelines and patterns for building and maintaining robust PWAs in a modern React ecosystem.

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

### 2. Assets and Icons
- **Maskable Icons:** Always provide `purpose: 'any maskable'` icons for Android compatibility.
- **Theme Color:** Sync the `theme_color` in `manifest.json` with the `<meta name="theme-color">` in `index.html` and the app's CSS variables.

### 3. Offline UX
- **Connectivity Status:** Implement a hook (e.g., `useOnlineStatus`) to show a non-intrusive banner when the app is offline.
- **Offline Data Indicators:** If TanStack Query serves stale/cached data while offline, show a "Viewing Offline Copy" indicator.

### 4. Background Sync (Advanced)
For mutations made while offline, use Workbox Background Sync or TanStack Query's mutation persistence to replay requests when the connection is restored.
