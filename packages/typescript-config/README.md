# @eridu/typescript-config

> **TLDR**: Shared TypeScript base configurations for the monorepo. Apps and packages extend these configs instead of duplicating `tsconfig.json` settings.

## Configs

| Config | Purpose | Used By |
|--------|---------|---------|
| `base.json` | Common compiler options (strict, ESNext, module resolution) | All packages |
| `nestjs.json` | NestJS-specific settings (decorators, emit) | `erify_api` |
| `react-library.json` | React library builds (JSX, DOM types) | `@eridu/ui` |
| `vite.json` | Vite app settings (bundler module resolution) | `erify_creators`, `erify_studios` |

## Usage

In your app's `tsconfig.json`:

```json
{
  "extends": "@eridu/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

## Key Settings

- **Strict mode**: Enabled across all configs
- **Module**: ESNext with bundler resolution
- **Target**: ES2022
- **Path aliases**: Configured per-app (e.g., `@/*` → `src/*`)
