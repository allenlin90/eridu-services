---
name: pwa-best-practices
description: Comprehensive patterns for building high-quality Progressive Web Apps (PWA) with Vite and React. Focuses on avoiding anti-patterns like "Double Caching", ensuring long-term maintainability, and synchronizing Service Worker caching with application-level data managers like TanStack Query. Use when building or hardening PWA support, configuring service workers, or debugging caching issues.
---

# PWA Best Practices

Architectural guidelines for building and maintaining PWAs in the React ecosystem.

## Monorepo Rollout

- App-by-app rollout, `erify_studios` first
- Reference: `docs/features/frontend-pwa-app-shell.md`, `apps/erify_studios/docs/PWA_SHELL_RUNBOOK.md`
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
- Document PWA env/config for deterministic deployments

## Verification

```bash
pnpm --filter <app> lint && pnpm --filter <app> typecheck && pnpm --filter <app> test && pnpm --filter <app> build
```

Manual: install prompt, SW update behavior, offline app-shell loading, online→offline→online transition.
