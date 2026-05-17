---
name: package-extraction-strategy
description: Guidance for deciding when to extract shared monorepo packages and how to structure code for future extraction. Use when evaluating whether logic should move to a shared package or when designing new features that may have multiple consumers.
---

# Package Extraction Strategy

**Core principle**: Don't extract until a second consumer exists. But always structure for extraction.

## Decision Gate

All four conditions must be met before extracting:
1. **Second consumer exists** — another app needs this logic today, not hypothetically
2. **Interface is stable** — proven through real usage in first consumer
3. **Zero framework coupling** — no NestJS, Prisma, React, TanStack imports
4. **Clear ownership** — someone maintains, bumps versions, reviews PRs

If any fails → use `lib/` extraction-readiness pattern instead.

## `lib/` Convention

Isolate pure, framework-free logic into `lib/` subdirectory:

```
src/models/{feature}/
  ├── {feature}.service.ts     # Framework-coupled
  ├── {feature}.repository.ts  # Prisma-coupled
  └── lib/                     # PORTABLE: pure functions only
      ├── compute-something.ts
      └── validate-rules.ts
```

### `lib/` Rules

1. No framework imports (NestJS, Prisma, React, TanStack)
2. Plain inputs, plain outputs (objects/arrays/primitives)
3. No side effects (no DB, HTTP, filesystem)
4. Independently testable (no mocking needed)
5. Self-contained (import from `lib/` siblings only, never `../service`)

## Extraction Procedure

1. Create package under `packages/`
2. Move `lib/` files to new package's `src/`
3. Add package exports in `package.json`
4. Replace imports in first consumer
5. Add as dependency in second consumer
6. Full verification: `lint`, `typecheck`, `build`, `test` for both + package

## Anti-Patterns

| Anti-Pattern | What to Do Instead |
|---|---|
| Extract on first use | Use `lib/`; extract when second consumer arrives |
| Extract with framework deps | Refactor to pure functions first |
| Copy-paste between apps | Evaluate extraction |
| Package with one consumer | Revert to `lib/` |

## Checklist

- [ ] Second consumer exists? If no → keep in `lib/`
- [ ] `lib/` files free of framework imports?
- [ ] Functions take/return plain objects?
- [ ] Testable without mocking?
- [ ] Extraction meets all four decision gate conditions?
