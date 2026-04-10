---
description: Run lint, typecheck, and tests to verify code changes before marking work as complete
---

# Verification Workflow

Run this workflow after making code changes to ensure quality before marking work complete.

> For feature/refactor work, run **Knowledge Sync Workflow** (`.agent/workflows/knowledge-sync.md`) after verification so docs/skills/rules/memory stay current.

## Steps

Determine which app(s) were modified (e.g., `erify_api`, `erify_studios`, `erify_creators`).

// turbo-all

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

4. **Refactor parity checks (for feature/refactor work)**
   - Confirm loading/empty/data UI states still match expected behavior.
   - Confirm route/search-param behaviors still match expected URL contract.
   - Confirm pagination/date/filter transitions behave correctly after extraction/decomposition.
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
