---
name: pwa-best-practices
description: Apply PWA offline caching, Service Worker lifecycle, Workbox fallbacks, and manifest standards.
---

# PWA Implementation Procedure

Thin procedural skill for PWA configuration. Canonical PWA rules live in [`knowledge/engineering/pwa-best-practices.md`](../../../knowledge/engineering/pwa-best-practices.md).

## Task Workflow

1. **Vite Plugin PWA**: Verify `vite-plugin-pwa` configuration in target app `vite.config.ts`.
2. **Navigation Fallback**: Ensure `navigateFallback: '/'` excludes `/api` paths.
3. **Offline Persistence**: Verify TanStack Query cache persistence with `idb-keyval`.
4. **Verification**: Run `pnpm --filter erify_creators build` or `pnpm --filter erify_studios build`.

## Canonical Knowledge Reference

- [`knowledge/engineering/pwa-best-practices.md`](../../../knowledge/engineering/pwa-best-practices.md)
