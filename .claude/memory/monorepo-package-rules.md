# Monorepo Package Rules

> Source: `.cursor/rules/monorepo_packages_guide.mdc` + `.agents/rules/03-monorepo-packages.mdc`
> **Reference implementation**: `packages/auth-service` (follows all best practices)

## Build Output Structure

```
packages/package-name/
├── src/         ← source files
├── dist/        ← compiled output (mirrors src/ structure directly)
│   ├── hooks/
│   └── lib/
└── package.json
```

**❌ WRONG**: `dist/src/` subdirectory - output must mirror `src/` directly in `dist/`

## package.json Configuration

```json
{
  "name": "@eridu/package-name",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "description": "Clear description of package purpose",
  "sideEffects": ["**/providers/*.tsx", "**/contexts/*.ts"],
  "exports": {
    "./hooks/*": {
      "types": "./dist/hooks/*.d.ts",
      "default": "./dist/hooks/*.js"
    },
    "./lib/jwt-validation": {
      "types": "./dist/lib/jwt-validation.d.ts",
      "default": "./dist/lib/jwt-validation.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch --preserveWatchOutput",
    "lint": "eslint \"{src,test}/**/*.ts\" --fix"
  },
  "dependencies": {
    "@eridu/other-package": "workspace:*"
  }
}
```

**Anti-patterns:**
- ❌ `"./hooks/*": "./src/hooks/*.ts"` — never export source
- ❌ `"./hooks/*": "./dist/hooks/*.js"` — missing `types` field
- ❌ `"@eridu/pkg": "file:../../packages/pkg"` — use `workspace:*`
- ❌ `"@eridu/pkg": "^1.0.0"` — use `workspace:*` not versions

## tsconfig.json (Package)

```json
{
  "extends": "@eridu/typescript-config/react-library.json",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## tsconfig.json (Consuming App)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
      // ✅ No workspace package mappings - TS resolves through package.json exports
    }
  }
}
```

**❌ WRONG:**
```json
"paths": {
  "@eridu/auth-service/*": ["../../packages/auth-service/src/*"]  // Bypasses exports
}
```

## Vite Configuration (Consuming Apps)

```typescript
export default defineConfig(() => ({
  resolve: {
    preserveSymlinks: false, // Required for pnpm workspaces
    alias: { '@': path.resolve(__dirname, './src') },
  },
  optimizeDeps: {
    include: ['@eridu/auth-service/**', '@eridu/ui/**'],
  },
}));
```

## Turbo Configuration

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "dependsOn": ["^build"], "cache": false, "persistent": true }
  }
}
```

`dependsOn: ["^build"]` ensures packages build before consuming apps start.

## Creating a New Package — Checklist

1. Create `src/`, `package.json`, `tsconfig.json`
2. `package.json`: `@eridu/` prefix, `type: "module"`, `exports` → `dist/`, `workspace:*` deps
3. `tsconfig.json`: `outDir: "dist"`, `declaration: true`, `declarationMap: true`, `sourceMap: true`, `include: ["src"]`
4. `scripts.build: "tsc"`, `scripts.dev: "tsc --watch --preserveWatchOutput"`
5. Consuming apps: add `workspace:*` dep, add to Vite `optimizeDeps.include`
6. Verify: `pnpm build` succeeds, `dist/` has `.js` + `.d.ts`, imports work

## Import Pattern

```typescript
// ✅ CORRECT: Import through package name
import { useSession } from '@eridu/auth-service/hooks/use-session';
import { Button } from '@eridu/ui/components/button';

// ❌ WRONG: Direct path to source
import { useSession } from '../../packages/auth-service/src/hooks/use-session';
```
