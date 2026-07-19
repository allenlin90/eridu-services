---
description: Run lint, typecheck, and tests to verify code changes before marking work as complete
---

# Verification Workflow

Run this workflow after making code changes to ensure quality before marking work complete.

> This workflow covers the refactor-parity checks (step 4). For the base lint/typecheck/test/build commands and when `build` is mandatory, see AGENTS.md § [Verification Checklist](../../AGENTS.md#verification-checklist-mandatory).
>
> For feature/refactor work, run **Knowledge Sync Workflow** (`.agents/workflows/knowledge-sync.md`) after verification so docs/skills/rules/memory stay current.

## Steps

Determine which app(s) were modified (e.g., `erify_api`, `erify_studios`, `erify_creators`).

1. **Lint check**
```bash
pnpm --filter <app> lint
```

2. **Type check**
```bash
pnpm --filter <app> typecheck
```

3. **Run tests**
```bash
pnpm --filter <app> test
```

If a workspace does not define a `test` script, run the available verification commands and explicitly note that the workspace currently has no automated test command (for example `eridu_docs`).

Also run `pnpm --filter <app> build` when any of the mandatory-build triggers in AGENTS.md apply (package/build wiring changed, dependencies changed, the workspace has stricter build-time checks than `typecheck`, or you would not be comfortable handing off without a build result).

4. **Refactor parity checks (for feature/refactor work)**
   - Confirm loading/empty/data UI states still match expected behavior.
   - Confirm route/search-param behaviors still match expected URL contract.
   - Confirm pagination/date/filter transitions behave correctly after extraction/decomposition.
   - For touched filterable UIs, confirm one semantic date interval is one range control; two or more secondary filters share one responsive filter surface; active count/reset work; and resetting filters preserves page size, refresh, export, and other independent view controls.
   - For standard paginated frontend views, confirm the route still uses the shared pagination stack:
     - `useTableUrlState` owns URL pagination state
     - query uses `placeholderData: keepPreviousData`
     - `setPageCount` is driven by real API metadata
     - footer reuses `DataTablePagination`
     - no fallback clamp such as `totalPages ?? 1` can reset a valid page during loading
   - Confirm route-layout DRY parity for touched route sets:
     - parent route owns shared container/guard via `<Outlet />`
     - leaf pages use the route-set shared page wrapper (for example `AdminLayout` or `PageLayout`) instead of repeated manual header markup.

5. **Review results** — If any step fails, fix the errors before marking work complete. Re-run the failing step after fixing.

> **Note**: For changes spanning multiple apps or packages (e.g., `@eridu/api-types` + `erify_api`), run verification for each affected package.
