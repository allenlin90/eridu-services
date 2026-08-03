---
name: pwa-best-practices
description: Build Vite and React PWAs with correct service workers, offline behavior, installability, and cache coordination.
---

# PWA Best Practices

Procedure for PWA work in `erify_studios` and `erify_creators`. Canonical architecture, anti-patterns, iOS pitfalls, and static-hosting rules live in [`knowledge/engineering/pwa-best-practices`](../../../knowledge/engineering/pwa-best-practices.md).

For a full app migration, follow [`.agents/workflows/pwa-migration.md`](../../workflows/pwa-migration.md) in addition to this skill.

## Procedure

1. Read the knowledge doc's § Core Architecture: Segregation before touching caching. The service worker owns static files; TanStack Query owns API data.
2. Never cache an API response in both layers — set API routes to `NetworkOnly` and add `navigateFallbackDenylist: [/^\/api/]`.
3. On iOS/iPadOS use `registerType: 'prompt'` and bypass the `controllerchange → reload()` path entirely (see § iOS/iPadOS PWA Pitfalls).
4. If the change touches production static hosting or SPA fallback, apply the two-rule `serve.json` pattern in § Static Hosting — a single `[^.]+` rewrite silently excludes the bare root `/`.
5. Keep route URL and search-param behavior unchanged across the migration.

## Verification

```bash
pnpm --filter <app> lint && pnpm --filter <app> typecheck && pnpm --filter <app> test && pnpm --filter <app> build
```

Manual: install prompt, SW update behavior, offline app-shell loading, online→offline→online transition.

At the production HTTP boundary, verify with `curl -D -` first (not a browser reload) that `/` and a nested extensionless route both return the app shell, a real hashed asset returns its correct MIME type, and a nonexistent `.css`/`.js` returns 404. See the knowledge doc's § Verification gotcha — a browser's HTTP disk cache can mask both the bug and the fix.

## Canonical Knowledge

- [`knowledge/engineering/pwa-best-practices`](../../../knowledge/engineering/pwa-best-practices.md) — segregation, double-caching anti-pattern, iOS pitfalls, CDN cache-poisoning prevention
- [`docs/features/frontend-pwa-app-shell.md`](../../../docs/features/frontend-pwa-app-shell.md)
