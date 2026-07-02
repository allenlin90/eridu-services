---
name: security-audit-baseline
description: Durable facts from the 2026-07-02 workspace-wide dependency+vuln audit (React on 19.2 now, vite dup collapse trick, which criticals are dev-only, deferred majors)
metadata:
  type: project
---

# Security Audit Baseline (2026-07-02)

Snapshot of `pnpm audit` + `pnpm outdated -r`. Vuln counts decay — re-run before acting.

## Corrections to older memory
- React is now on **19.2.0** across eridu_auth, erify_creators, erify_studios, @eridu/ui. Prior notes about "React 18 hooks model" / Radix React-18 pins are STALE — the whole frontend already runs React 19. Radix / TanStack / lucide React-19 compat concerns are moot for the current major; only *major* bumps of React-dependent libs (lucide 1.x, react-day-picker 10) need a 19-compat check.
- zod is on ^4.3.x now (not 4.1.13); still one aligned version everywhere, sherif-enforced.
- better-auth already on 1.5.0 with @better-auth/api-key present (the plugin split migration is DONE).

## Vuln posture (as of audit)
- 250 vulns: 3 critical / 101 high / 126 moderate / 20 low. Most are deep dev/build transitives.
- **All 3 criticals are dev/test-only**, not prod-runtime: handlebars (via erify_api ts-jest), shell-quote (via eridu_auth concurrently), vitest 4.0.13 (<4.1.0).
- **Prod-runtime-reachable HIGHs** (real Security priority): axios (frontends), hono (eridu_auth), @hono/node-server (eridu_auth), drizzle-orm (eridu_auth), multer (erify_api via @nestjs/platform-express).

## Fix-path facts (verified)
- **@hono/node-server**: patched >=1.19.10; latest 1.x is 1.19.14 (< v2 major). `^1.19.x` bump fixes vuln without the v2 major. Latest overall 2.0.8 is a separate major.
- **multer**: @nestjs/platform-express@11.1.27 pins multer 2.1.1 (currently 2.0.2). That fixes 2 of 3 multer advisories; the `<2.2.0` advisory still needs a `pnpm.overrides` multer>=2.2.0 to fully clear.
- **drizzle-orm**: 0.45.1→0.45.2 is a trivial patch that clears its HIGH advisory.
- **samlify + node-forge** HIGHs come only via `@better-auth/sso` (SSO is currently disabled/commented in auth.ts) — lower real exposure; a better-auth 1.6.x bump likely pulls patched samlify.

## Vite duplication collapse trick
- Two vite installs: 7.2.4 (app-pinned ^7.2.4) and 7.3.1 (pulled by vitest@4.0.13 → @vitest/mocker). Tracked in docs/tech-debt/vite-plugin-type-version-mismatch.md.
- Vite HIGH advisory patched at >=7.3.5. Bumping app pins to `^7.3.5` makes app vite AND mocker's vite both resolve to the same latest 7.x → **collapses the dup AND fixes the vite HIGH in one move**, while staying on the v7 major (vite 8.1.3 is a separate deferred major).

## Framework-critical / major bumps to DEFER (need dedicated compat effort)
- typescript 5.9.3 → **6.0.3** (major, workspace-wide, 10 workspaces)
- eslint 9 → 10 (already deferred; blocked by @antfu/eslint-config — note @antfu/eslint-config itself now shows 3.12.1 → 9.x)
- vite 7 → 8, @vitejs/plugin-react 5 → 6
- @types/node 24 → 26
- astro 6 → 7 (+ @astrojs/mdx, @astrojs/node major) — eridu_docs
- lucide-react 0.554 → 1.x, react-day-picker 9 → 10, zod-openapi 5 → 6, temporal-polyfill 0.3 → 1.0
- @hono/node-server 1 → 2, concurrently 9 → 10, cross-env 7 → 10, @babel/core+preset-env 7 → 8, jest 29 → 30
