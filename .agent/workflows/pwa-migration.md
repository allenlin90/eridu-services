---
description: Standard workflow for rolling out app-shell PWA support with reliable service worker updates and recovery
---

# PWA App-Shell Workflow

Use this workflow when enabling or hardening PWA shell behavior in frontend apps.

## Goals

1. Installable app manifest.
2. Stable service worker lifecycle.
3. Predictable update application.
4. Explicit recovery path for stuck service workers.

## Steps

1. Configure `vite-plugin-pwa` with explicit manifest metadata and icon set.
2. Keep service-worker API runtime caching `NetworkOnly` when TanStack Query owns API data caching.
3. Centralize service-worker registration in app runtime code.
4. Add periodic update checks and one-time controller-change reload guard.
5. Add a user-facing recovery path that unregisters SW + clears caches + reloads.
6. Document update and recovery behavior in app docs.

## Out of Scope (unless explicitly requested)

- Push notification delivery pipeline.
- Offline mutation queue/sync logic.
- Multi-channel notification orchestration.

## Verification

Run:

```bash
pnpm --filter <app> lint
pnpm --filter <app> typecheck
pnpm --filter <app> test
pnpm --filter <app> build
```

Manual checks:
- installability,
- update behavior after new deployment,
- cache cleanup,
- recovery action success.

