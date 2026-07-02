# Tech Debt: Duplicate `vite` versions cause a plugin-array type mismatch in Vite configs

## Current Issue

pnpm installs two versions of `vite` in this monorepo: the version each app pins directly (`^7.2.4`, used by `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-plugin-pwa`, `@tanstack/router-plugin`), and a newer version (`7.3.1`) pulled in transitively by `vitest@4.0.13` → `@vitest/mocker` (peer range `^6.0.0 || ^7.0.0-0`, satisfied by 7.3.1 rather than deduped against the app's own 7.2.4 install).

`vite.config.ts` files that use `defineConfig` from `vitest/config` (to get merged Vite + Vitest config typing) resolve the newer `vite@7.3.1`'s `Plugin`/`PluginOption` types, while the individual plugins (`react()`, `tailwindcss()`, `VitePWA()`, `tanstackRouter()`) resolve the app's pinned `vite@7.2.4` types. The two `Plugin` shapes differ slightly in internal dev-server hook signatures (e.g. `hotUpdate`), so passing the plugins array directly to `defineConfig`'s `plugins` option fails to type-check (`TS2769: No overload matches this call`), even though it's the exact same objects at runtime.

Confirmed present in both `apps/erify_creators` and `apps/erify_studios` (via `pnpm why vite --filter <app>` — both show the identical 7.2.4/7.3.1 split, both driven by the same `vitest` → `@vitest/mocker` dependency).

## Current Workaround

`apps/erify_creators/vite.config.ts` casts the `plugins` array to `ViteUserConfig['plugins']` (the type `vitest/config`'s `defineConfig` actually expects) with an explanatory comment. This is a type-level bridge only — it doesn't change what plugins run, just satisfies the type checker across the two structurally-almost-identical `Plugin` versions.

`apps/erify_studios` has not yet had its `typecheck` script fixed to real type-checking (see `erify-studios-typecheck-noop.md`), so this same error is currently masked there too, and will need the identical workaround (or the real fix below) when that script is fixed.

## Desired Direction

The workaround above resolves the immediate type error per-app, but the actual duplication remains in the dependency tree. The real fix is a root-level `pnpm.overrides` entry pinning `vite` to a single version workspace-wide (verify the pinned version satisfies `@vitest/mocker`'s `^6.0.0 || ^7.0.0-0` peer range), which would let every app drop its local cast. This is a shared dependency-resolution change per `AGENTS.md`'s Dependency Changes rules — requires a lockfile update and re-verification (`lint`, `typecheck`, `test`, `build`) across every workspace that uses `vitest` (effectively all apps and several packages), not just the two currently affected.

## Trigger To Fix

- When `erify_studios`'s typecheck script is fixed (per `erify-studios-typecheck-noop.md`) — either add the same local cast there, or do the root override fix at that point since both apps will need it simultaneously.
- Any time `vite` or `vitest` is upgraded and the versions might naturally converge (re-check with `pnpm why vite --filter <app>` before assuming the workaround is still needed).
- If a third app/package develops the same symptom, that's a signal the root override is worth doing instead of a third local cast.

## Acceptance Criteria

- `pnpm why vite` shows a single resolved version across the workspace.
- The local `ViteUserConfig['plugins']` casts (or equivalents) are removed from `apps/erify_creators/vite.config.ts` and any other app that added one.
