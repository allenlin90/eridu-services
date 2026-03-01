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

4. **Review results** — If any step fails, fix the errors before marking work complete. Re-run the failing step after fixing.

> **Note**: For changes spanning multiple apps or packages (e.g., `@eridu/api-types` + `erify_api`), run verification for each affected package.
