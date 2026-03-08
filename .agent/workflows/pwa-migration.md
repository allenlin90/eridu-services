---
description: Standard workflow to migrate Eridu frontend apps to Progressive Web Apps (PWA) with consistent architecture and verification
---

# PWA Migration Workflow

Use this workflow when enabling or improving PWA support in any frontend app (`apps/erify_studios`, `apps/erify_creators`, future FE apps).

## Trigger Conditions

Run this workflow when:

1. A frontend app is being migrated to PWA.
2. Existing PWA config/manifest/service worker behavior is changed.
3. Offline UX or install/update behavior is introduced/refactored.

## Workflow Steps

1. **Scope & baseline**
   - Identify target app and business constraints (offline read-only vs offline mutations).
   - Review `.agent/skills/pwa-best-practices/SKILL.md` and `frontend-tech-stack`.
   - Inspect current `vite.config.ts`, `src/main.tsx`, `index.html`, and asset folder state.

2. **PWA bootstrap**
   - Add `vite-plugin-pwa` with an explicit `manifest` and `workbox` config.
   - Ensure `theme_color` and app shell metadata are consistent across `manifest` and HTML.
   - Add installable icon set, including maskable icons.

3. **Caching contract**
   - Static assets: Workbox-managed cache (`StaleWhileRevalidate` or `CacheFirst`).
   - API data: keep `NetworkOnly` in SW when TanStack Query manages data cache/persistence.
   - Confirm no double-caching of API JSON payloads.

4. **Runtime integration**
   - Register SW in `src/main.tsx` (or dedicated bootstrap module).
   - Implement update UX (`prompt` or `autoUpdate`) and align with product behavior.
   - Add non-intrusive connectivity/offline indicators where applicable.

5. **Validation**
   - Run:
     - `pnpm --filter <app> lint`
     - `pnpm --filter <app> typecheck`
     - `pnpm --filter <app> test`
     - `pnpm --filter <app> build`
   - Manual checks:
     - installability on Chromium,
     - offline app-shell loading,
     - update flow,
     - representative data route in offline mode.

6. **Knowledge sync**
   - Update docs/skills if a reusable pattern emerged.
   - If this introduced a mandatory process, update `.agent/rules/*.md` and `AGENTS.md`.

## erify_studios-first Rollout Plan

Use this order unless product constraints require otherwise:

1. `apps/erify_studios`: establish canonical implementation.
2. `apps/erify_creators`: apply the same pattern with minimal divergence.

## Completion Checklist

- [ ] PWA plugin, manifest, and icon assets are configured.
- [ ] API requests are not double-cached by SW + TanStack Query.
- [ ] SW register/update UX is implemented.
- [ ] Lint, typecheck, test, build passed for impacted app(s).
- [ ] Knowledge sync completed for reusable guidance.
