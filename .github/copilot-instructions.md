# Eridu Services - AI Coding Agent Instructions

**Monorepo:** Livestream production management platform built with pnpm workspaces and Turbo

## Architecture Overview

### Components
- **erify_api** - NestJS REST API (core business logic, data models, admin operations)
- **eridu_auth** - Better Auth SSO service (Hono backend + React frontend, JWT validation)
- **erify_creators** - React + TanStack Router UI for content creators (user-facing creation tools)
- **erify_studios** - React + TanStack Router UI for studio management (different users & workflows than creators)
- **packages/** - Shared code: `@eridu/api-types` (Zod schemas + UID constants), `@eridu/auth-sdk`, `@eridu/ui`, `@eridu/i18n`, ESLint/TypeScript configs

### Data Flow
1. **Auth**: eridu_auth issues JWT tokens → @eridu/auth-sdk validates in consumer apps
2. **API**: erify_api (Prisma/PostgreSQL) serves data via REST
3. **UI**: erify_creators/studios consume API, handle JWT via auth-sdk
4. **Types**: @eridu/api-types defines shared Zod schemas and TypeScript interfaces

## Critical Conventions

### ID Management (NEVER expose database IDs)
- **Internal**: `bigint` primary keys (database only)
- **External**: Branded UIDs with prefixes defined in `@eridu/api-types/src/constants.ts` (single source of truth)
- **API responses**: Always map `uid` → `id` field in DTOs
- **URLs**: `/admin/users/:uid` (never use database ID)
- **Future**: UID prefix constants will be expanded as features are added
- See [erify_api_guide.mdc](.cursor/rules/erify_api_guide.mdc) for details

### Monorepo Packages
- **Exports**: All packages compile TypeScript to `dist/` and expose via `package.json` exports
- **Consumption**: Import compiled code only (e.g., `@eridu/api-types`), never relative imports to src/
- **Build structure**: NO nested `src/` in dist output
- See [monorepo_packages_guide.mdc](.cursor/rules/monorepo_packages_guide.mdc) for structure

### NestJS API Layer (erify_api)
**Module Pattern**: `models/{entity}/` contains repository, service, module
```
models/user/
├── user.module.ts
├── user.repository.ts (extends BaseRepository)
├── user.service.ts
└── schemas/user.schema.ts (Zod)

admin/user/
├── admin-user.module.ts
├── admin-user.controller.ts
├── admin-user.service.ts
```
- **Repositories**: Extend `BaseRepository<T, C, U, W>`; soft-delete via `deletedAt`
- **Services**: Single-entity CRUD (`BaseModelService`) or multi-entity orchestration
- **Controllers**: Use `@ZodSerializerDto()`, proper HTTP status codes (201/204/404)
- **Transactions**: Use `prisma.$transaction()` or `prisma.executeTransaction()`

## Developer Workflows

### Setup
```bash
pnpm install                          # Install all workspaces
pnpm dev                              # Run all apps concurrently
pnpm dev:studios                      # Dev subset: studios + api + auth
pnpm build                            # Build all via Turbo
pnpm lint                             # ESLint all workspaces
pnpm test                             # Jest + Vitest all workspaces
```

### Database (erify_api & eridu_auth)
```bash
# erify_api (Prisma)
pnpm -F erify_api db:migrate:create   # Create migration
pnpm -F erify_api db:migrate:deploy   # Apply migrations
pnpm -F erify_api db:studio           # Prisma Studio UI
pnpm -F erify_api db:seed             # Run seed script

# eridu_auth (Drizzle)
pnpm -F eridu_auth db:generate        # Generate schema/migrations
pnpm -F eridu_auth db:migrate         # Apply migrations
pnpm -F eridu_auth studio             # Drizzle Studio UI
```

### Testing & Validation
- **Unit tests**: Jest (erify_api) and Vitest (erify_creators)
- **Type checking**: `pnpm typecheck` (includes all workspaces)
- **Linting**: ESLint with Sherif (dependency version alignment)
- **Git hooks**: Husky runs ESLint, Sherif, Commitlint pre-commit
- **Manual tests**: `pnpm -F erify_api manual:*` scripts (in `manual-test/`) verify complex workflows
  - **Pattern**: Tests should be resilient to feature updates (use generated data, don't hard-code expectations)
  - **Domains**: `schedule-planning/`, `backdoor/`, `auth/` - each orchestrates multiple steps
  - **Usage**: `pnpm -F erify_api manual:schedule:all` (or `manual:backdoor:all`, `manual:auth:all`)

### Commit Messages
Format: `<type>(<scope>): <subject>` (Conventional Commits)
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- Examples: `feat(auth): add SSO support`, `fix(api): resolve schedule validation`

## Key Patterns & Files

### Validation & Serialization
- **Zod schemas** (define once, reuse): `apps/erify_api/src/models/{entity}/schemas/`
- **Input DTOs**: Transform snake_case input → camelCase internal
- **Output DTOs**: Transform camelCase → snake_case API response
- **Decorators**: `@ZodSerializerDto()` for auto serialization

### Querying & Pagination
- **Private `buildWhereClause()`**: Encapsulates filters; always include `deletedAt: null` unless `include_deleted=true`
- **Pagination**: `PaginationQueryDto` + `createPaginatedResponseSchema()`
- **Parallel queries**: Use `Promise.all()` for data + count operations

### Authentication & Authorization
- **JWT**: 15-minute expiration (eridu_auth)
- **Validation**: `@eridu/auth-sdk` JWT validation decorators
- **Authorization**: StudioMembership model determines resource access in erify_api

### UI Patterns (erify_creators & erify_studios)
- **Routing**: TanStack Router with file-based route definitions
- **Data fetching**: TanStack React Query with persistence
- **State**: Query-driven (no Redux/Zustand); use query invalidation
- **i18n**: Paraglide JS (compile-time, project.inlang config)
- **Components**: shadcn/ui (Tailwind CSS)

## Important Directories

| Path | Purpose |
|------|---------|
| `apps/erify_api/src/lib/` | Base repository, utility classes, decorators |
| `apps/erify_api/src/models/` | Entity repositories & services (domain layer) |
| `apps/erify_api/src/admin/` | Admin controllers & admin-specific services |
| `apps/erify_api/prisma/` | Schema, migrations, seed |
| `apps/erify_api/docs/` | **Detailed architecture, business rules, roadmaps - refer when implementing features** |
| `apps/eridu_auth/src/db/` | Drizzle schema, migrations |
| `packages/api-types/src/` | Shared Zod schemas & TypeScript types |
| `packages/auth-sdk/src/` | JWT validation, JWKS management |
| `.cursor/rules/` | Detailed implementation guides |

## Cross-App Communication

**Current**: Apps connect directly (e.g., UI → API, UI → eridu_auth for JWT validation)

**Future**: Event-driven architecture (Kafka/RabbitMQ) when features like user onboarding require multi-app coordination. Plan to document event schemas in `@eridu/api-types` when implemented.

## Common Pitfalls

- ❌ Exposing database `id` in API responses → ✅ Use `uid` field
- ❌ Hard-coding UID prefixes → ✅ Import from `@eridu/api-types/src/constants.ts`
- ❌ Breaking monorepo package exports → ✅ Only import compiled code
- ❌ Mixing Prisma/Drizzle patterns → ✅ Keep API = Prisma, Auth = Drizzle
- ❌ Bypassing Turbo task dependencies → ✅ Run `pnpm build` (not direct tsc)
- ❌ Hard-coding snake_case API contracts → ✅ Use Zod schemas for transformation

## App-Specific Documentation

### When Working on erify_api
Detailed documentation available at `apps/erify_api/docs/`. Use as context when implementing features:

| Document | Use When |
|----------|----------|
| [PHASE_1.md](apps/erify_api/docs/roadmap/PHASE_1.md) | Understanding what's implemented vs pending, implementation scope, success criteria |
| [PHASE_2.md](apps/erify_api/docs/roadmap/PHASE_2.md) | Seeing what's coming next, understanding deferred features (bulk publish), chunked uploads |
| [ARCHITECTURE.md](apps/erify_api/docs/ARCHITECTURE.md) | Creating new modules/features, understanding module dependencies and layer patterns |
| [BUSINESS.md](apps/erify_api/docs/BUSINESS.md) | Understanding entity relationships, business rules, soft-delete patterns |
| [AUTHENTICATION_GUIDE.md](apps/erify_api/docs/AUTHENTICATION_GUIDE.md) | Implementing auth patterns, guard usage, JWT validation, admin authorization |
| [SERVER_TO_SERVER_AUTH.md](apps/erify_api/docs/AUTHENTICATION_GUIDE.md) | Adding service-to-service endpoints, API key authentication |
| [SCHEDULE_UPLOAD_API_DESIGN.md](apps/erify_api/docs/SCHEDULE_UPLOAD_API_DESIGN.md) | Working on schedule planning features, understanding data model, publish workflow |
| [Manual Tests](apps/erify_api/manual-test/README.md) | Verifying complex workflows, understanding realistic usage patterns |

**Quick Reference**:
- `pnpm -F erify_api manual:schedule:all` - Run schedule planning E2E workflow
- `pnpm -F erify_api manual:backdoor:all` - Run user/membership setup workflow
- `pnpm -F erify_api manual:auth:all` - Run authentication workflow

### General Documentation
- API reference: `GET /api-reference` (Scalar UI) when server running
- Detailed guides: `.cursor/rules/*.mdc` files
