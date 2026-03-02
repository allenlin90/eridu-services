# Dependency Upgrade Strategist - Agent Memory

## Package Dependency Graph (Auth Chain)
- `eridu_auth` depends directly on: `better-auth`, `@better-auth/sso`, `drizzle-orm`, `drizzle-zod`, `drizzle-kit`
- `@eridu/auth-sdk` depends directly on: `better-auth` (for types + client plugins)
- `erify_api`, `erify_creators`, `erify_studios` do NOT import better-auth directly -- they consume `@eridu/auth-sdk`
- Blast radius for better-auth upgrade: `eridu_auth` + `@eridu/auth-sdk` (then consumers via re-exported types)
- Blast radius for drizzle upgrade: `eridu_auth` only (no other app uses drizzle)

## Better Auth Upgrade Notes (1.4.17 -> 1.5.0)
- **BREAKING**: `apiKey()` plugin moved from `better-auth/plugins` to `@better-auth/api-key` (separate package)
- **BREAKING**: `apikey` table schema change: `userId` -> `referenceId`, new `configId` field
- **BREAKING**: `InferUser<O>` and `InferSession<O>` removed (not used in codebase)
- **BREAKING**: `getMigrations` moved to `better-auth/db/migration` subpath (not used directly)
- SSO plugin (`@better-auth/sso`) is currently commented out / disabled in auth.ts
- Auth schema is auto-generated via `@better-auth/cli generate` (see `auth:schema` script)
- After better-auth upgrade, MUST re-run `pnpm --filter eridu_auth auth:schema` to regenerate schema
- After schema regen, MUST run `pnpm --filter eridu_auth db:generate` for drizzle migration

## Drizzle Upgrade Notes (0.41.0 -> 0.45.1)
- No significant breaking changes between 0.41 and 0.45
- 0.43: `.array()` no longer chainable (use `.array('[][]')` for multidimensional) -- NOT used in eridu_auth
- 0.44: New `DrizzleQueryError` wraps driver errors (non-breaking, additive)
- drizzle-kit 0.31.x has NO drizzle-orm peerDependency (it bundles its own version internally)
- drizzle-zod 0.8.3 requires `drizzle-orm >= 0.36.0` and `zod ^3.25.0 || ^4.0.0`
- drizzle-zod is NOT currently used in eridu_auth (0 imports found)

## Zod Version Context
- ALL apps + packages use `zod ^4.1.13` (7 locations, sherif-enforced)
- zod 4.3 breaking change: `.pick()`/`.omit()` on refined schemas throws -- verified NOT affected in erify_api (only used on plain z.object schemas in show-orchestration)
- drizzle-zod 0.8.3 compatible with `zod ^3.25.0 || ^4.0.0`

## Prisma Context (erify_api)
- Already on Prisma 7.0.0 (client + adapter-pg + CLI)
- `prisma.config.ts` already exists at app root (Prisma 7 config migration done)
- After ANY Prisma upgrade: MUST run `pnpm --filter erify_api db:generate`
- @prisma/client, @prisma/adapter-pg, and prisma CLI MUST always match versions

## ESLint Context (WORKSPACE-WIDE)
- `@eridu/eslint-config` depends on `@antfu/eslint-config ^3.12.1`
- ESLint 9 -> 10 is DEFERRED: config lookup behavior changes (file-based vs CWD-based), need @antfu/eslint-config ESLint 10 support confirmation
- eslint `^9.39.1` declared in all 8 workspace locations
- `globals` v17 removes some globals -- cannot upgrade independently of ESLint 10

## NestJS Context (erify_api)
- All @nestjs/* packages at 11.x -- must upgrade in lockstep
- Uses: @nestjs-cls/transactional, nestjs-pino, nestjs-zod, @scalar/nestjs-api-reference
- erify_api build: `pnpm db:generate && nest build` (Prisma generate + NestJS compiler)

## Deferred Upgrades (as of 2026-03-02)
- ESLint 9 -> 10: blocked by @antfu/eslint-config compatibility
- Jest 29 -> 30: breaking changes (testPathPatterns, JSDOM v26, snapshot format)
- dotenv 16 -> 17: runtime log noise, comment parsing behavior change
- cross-env 7 -> 10: ESM-only rewrite
- @types/node 24 -> 25: potential type incompatibilities
- pino-http 10 -> 11: needs investigation (PR #383)

## Key Files
- Auth config: `apps/eridu_auth/src/lib/auth.ts`
- Auth schema: `apps/eridu_auth/src/db/schema/auth-schema.ts`
- Auth types: `apps/eridu_auth/src/lib/types.ts`
- Auth-SDK client: `packages/auth-sdk/src/client/react.ts`
- erify_api package.json: `apps/erify_api/package.json`
- Shared ESLint config: `packages/eslint-config/package.json`
