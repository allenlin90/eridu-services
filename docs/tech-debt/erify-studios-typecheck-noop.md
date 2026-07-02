# Tech Debt: `erify_studios` `pnpm typecheck` is a no-op

## Current Issue

`apps/erify_studios/package.json`'s `typecheck` script is `tsc --noEmit`, run with no project flag against the app's root `tsconfig.json`. That root config is a TS "solution" file — `files: []` plus only `references` to `tsconfig.app.json` / `tsconfig.test.json` / `tsconfig.node.json` — so a plain `tsc --noEmit` invocation type-checks **zero files** and exits 0 unconditionally, regardless of how many real type errors exist in the app.

`vite build` doesn't fill the gap either: esbuild/Rollup strip types without checking them, so the build script also can't catch this class of error.

Confirmed by running the correct invocation (`tsc -b tsconfig.app.json --noEmit`) against the current `implement-20-3-account-manager-ops` branch: **192 real type errors** across the app, including a genuine regression (`StudioRouteGuard` missing its required `studioId` prop in two route files, silently denying access to everyone — caught only by a Codex PR review comment, not by CI).

## Why It Matters

- CI's `pnpm --filter erify_studios typecheck` step has been passing unconditionally for an unknown period, giving false confidence on every PR in this app.
- Real regressions (missing required props, narrowing to `never`, stale generated route-search types) ship to `master` undetected until a human or a review bot happens to notice at runtime or in a manual read.
- The fix for the *script* is one line, but flipping it on immediately surfaces ~192 pre-existing errors unrelated to any single PR — too large to fix as a drive-by in the PR that discovers it.

## Desired Direction

- Point `typecheck` at the actual app project: `tsc -b tsconfig.app.json --noEmit` (or `tsc -b --noEmit` if root references should all be checked, test config included).
- Triage the ~192 errors surfaced once the script is fixed; many cluster around stale/missing `validateSearch` schemas on routes whose `<Link search>` types don't match (likely fixable in bulk), with a smaller set of genuine narrowing/typing bugs.
- Land the script fix in a dedicated PR so the error backlog is visible and triaged deliberately, not silently introduced as a side effect of an unrelated feature PR.

## `erify_creators` and `eridu_auth`: Fixed

The same root-cause pattern also existed in `apps/erify_creators` and `apps/eridu_auth`. Both are now fixed — `typecheck` is `tsc -b --noEmit` in each, checking the whole project solution for real. `eridu_auth` had zero real errors (no `vitest` dependency, so it never hit the vite-duplication issue either). `erify_creators`'s ~41 real errors were triaged and fixed: a genuine production bug (`show-list.tsx` reading `.showTypeName`/`.startTime` instead of the real `Show` type's `.show_type_name`/`.start_time` — silently rendering nothing, since the component was unreferenced by any route), a malformed route path (`/shows/` vs. the registered `/shows`), a missing `vite-env.d.ts` (causing `virtual:pwa-register` type errors), dead code (`test-utils.tsx`'s `renderWithProviders`/`TestWrapper`, which relied on `<RouterProvider>` accepting `children` — an API it has never actually supported), and a batch of stale test fixtures using camelCase field names against a snake_case API type. A `vite.config.ts` plugin-array type mismatch (pnpm installing two `vite` versions) needed a local cast at first, but a later dependency-security PR bumped `vite` to `^7.3.6` workspace-wide, which collapsed the duplication and removed the need for the cast — that tech-debt doc has been deleted.

`erify_studios` still has the original issue open — same desired direction below applies to its `tsconfig.app.json`. It won't need any vite-duplication workaround once its script is fixed, since the duplication no longer exists workspace-wide.

## Trigger To Fix

Fix this before or during any PR that:

- touches `apps/erify_studios/package.json`'s `typecheck`/build tooling, or
- is doing a broader frontend code-quality/hardening pass (see `codebase-hardening-program` skill), or
- next time a review bot or manual read catches a type-level bug that CI should have caught.

## Acceptance Criteria

- `pnpm --filter erify_studios typecheck` actually checks `src/**` and fails on real type errors.
- The pre-existing error backlog it surfaces is triaged: fixed, or each remaining one has a tracked follow-up.
- CI's typecheck step for `erify_studios` is verified to fail on a deliberately introduced type error (smoke-test the gate itself).
