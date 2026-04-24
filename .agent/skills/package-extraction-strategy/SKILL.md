---
name: package-extraction-strategy
description: Guidance for deciding when to extract shared monorepo packages and how to structure code for future extraction. Use when evaluating whether logic should move to a shared package or when designing new features that may have multiple consumers.
---

# Package Extraction Strategy

**Core principle**: Don't extract until a second consumer exists. But always structure for extraction.

## Decision Gate

Before extracting code to a shared package, all four conditions must be met:

1. **Second consumer exists** — another app or service needs this exact logic today, not hypothetically.
2. **Interface is stable** — the API surface has been proven through real usage in the first consumer.
3. **Zero framework coupling** — the code to extract has no imports from NestJS, Prisma, React, TanStack, or any app-specific module.
4. **Clear ownership** — someone will maintain the package, handle version bumps, and review PRs.

If any condition fails, **do not extract**. Instead, use the extraction-readiness pattern below.

## Extraction-Readiness Pattern

Structure feature code so that future extraction is a file move, not a rewrite.

### The `lib/` Convention

Every feature directory (BE or FE) should isolate pure, framework-free logic into a `lib/` subdirectory:

```
src/models/{feature}/
  ├── {feature}.module.ts              # NestJS wiring (framework-coupled)
  ├── {feature}.controller.ts          # HTTP transport (framework-coupled)
  ├── {feature}.service.ts             # Business logic (framework-coupled)
  ├── {feature}.repository.ts          # Data access (Prisma-coupled)
  ├── schemas/                         # Zod + payload types
  └── lib/                             # PORTABLE: pure functions only
      ├── compute-something.ts         # Pure computation
      ├── transform-data.ts            # Data transformation
      └── validate-rules.ts            # Business rule validation
```

Frontend equivalent:

```
src/features/{feature}/
  ├── api/                             # TanStack Query hooks (React-coupled)
  ├── components/                      # UI components (React-coupled)
  ├── hooks/                           # React hooks (React-coupled)
  └── lib/                             # PORTABLE: pure functions only
      ├── compute-something.ts         # Pure computation
      ├── serialize-output.ts          # Data serialization
      └── merge-data.ts               # Data transformation
```

### `lib/` Rules

1. **No framework imports** — files in `lib/` must not import NestJS, Prisma, React, TanStack, or any app-specific module.
2. **Plain inputs, plain outputs** — functions take plain objects/arrays/primitives as input and return the same.
3. **No side effects** — no DB calls, no HTTP requests, no file system access.
4. **Independently testable** — unit tests for `lib/` functions need no mocking framework, no test containers, no render utilities.
5. **Self-contained** — `lib/` files may import from each other but never from sibling directories (`../service`, `../repository`, etc.).

### Portable vs Framework-Coupled Checklist

| Characteristic | Portable (`lib/`) | Framework-Coupled |
|---|---|---|
| Imports NestJS decorators/DI | No | Yes |
| Imports Prisma client/types | No | Yes |
| Imports React/hooks | No | Yes |
| Imports TanStack Query/Router | No | Yes |
| Takes plain objects as input | Yes | May take framework types |
| Returns plain objects | Yes | May return framework types |
| Needs mocking to test | No | Yes |
| Can move to `@eridu/*` package | File move | Requires rewrite |

## Extraction Procedure (When Conditions Are Met)

1. **Create the package** under `packages/` following monorepo conventions (see `monorepo-package-rules` in CLAUDE.md).
2. **Move `lib/` files** from the first consumer to the new package's `src/`.
3. **Add package exports** in the new package's `package.json`.
4. **Replace imports** in the first consumer to use the package.
5. **Add the package** as a dependency in the second consumer.
6. **Run full verification** (`lint`, `typecheck`, `build`, `test`) for both consumers and the new package.

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Extract on first use | No proven interface; premature abstraction | Use `lib/` isolation; extract when second consumer arrives |
| Extract with framework deps | Package becomes coupled to a specific framework | Refactor to pure functions first, then extract |
| Copy-paste between apps | Creates drift; no single source of truth | If copying, it's time to evaluate extraction |
| Extract "just in case" | Maintenance overhead with no consumer | Keep in `lib/`; extraction is cheap when needed |
| Package with one consumer | All the overhead, none of the benefit | Revert to `lib/` in the consuming app |

## Review Checklist

When reviewing code that might be a candidate for extraction:

- [ ] Is there currently a second consumer? If no → keep in `lib/`, do not extract.
- [ ] Are all `lib/` files free of framework imports?
- [ ] Do `lib/` functions take and return plain objects?
- [ ] Can `lib/` files be tested without mocking?
- [ ] If extraction is proposed: does it meet all four decision gate conditions?

## Related Skills

- **[Monorepo Package Rules](../../../.claude/memory/monorepo-package-rules.md)**: Export conventions, tsconfig, and Vite config for shared packages.
- **[Service Pattern](../service-pattern-nestjs/SKILL.md)**: How services consume `lib/` logic.
