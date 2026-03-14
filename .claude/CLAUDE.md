# Eridu Services Monorepo - Quick Reference

> **Last Updated**: 2026-03-14
> **Status**: Production codebase — major architectural debt resolved Feb 2026 (see Known Issues)

## Workflow Rules (MUST FOLLOW)

### Skill-First Development
Before implementing ANY feature, read the relevant skill from `.agent/skills/<skill-name>/SKILL.md`. **Common mappings:**
- Backend: `service-pattern-nestjs`, `repository-pattern-nestjs`, `backend-controller-pattern-nestjs`, `erify-authorization`, `database-patterns`, `data-validation`
- Multi-service workflows: `orchestration-service-nestjs`
- Backend testing: `backend-testing-patterns`
- Security: `secure-coding-practices`
- Frontend: `frontend-tech-stack`, `frontend-ui-components`, `frontend-api-layer`, `frontend-state-management`, `frontend-testing-patterns`, `pwa-best-practices`
- Full-stack: `admin-list-pattern`, `studio-list-pattern`
- Shift schedule: `shift-schedule-pattern`
- Domain cutover: `domain-refactor-cutover-strategy`, `data-compatibility-migration`

### Dependency Changes — Full Impact (CRITICAL)
The cloud build runs `pnpm install --frozen-lockfile`. **`pnpm-lock.yaml` is the authoritative install manifest** — `package.json` alone is not enough. A stale lockfile hard-fails the build before any code runs, which cascades: build fails → deployment blocked → pre-deploy migration never runs → all downstream issues compound.

**Every time any `package.json` is modified**, ALL three must move together in the SAME commit:

| Artifact | Command | Why |
|----------|---------|-----|
| `pnpm-lock.yaml` | `pnpm install` (from root) | Cloud installs from lockfile, not package.json |
| Type + build | `pnpm --filter <affected> typecheck && pnpm --filter <affected> build` | Upgraded packages may change type signatures; build uses stricter config than typecheck |
| Lint/sherif | `pnpm lint && pnpm sherif` | Catch version mismatches across workspace |

**Also consider**: does any other workspace package share this dep? If so, align versions and re-run for those packages too.

### Mandatory Code Verification
After every code change, run ALL of the following before marking work complete:
```bash
pnpm --filter <app_or_package> lint      # Fix ALL errors (never disable ESLint rules)
pnpm --filter <app_or_package> typecheck # Catches most TS errors early
pnpm --filter <app_or_package> build     # REQUIRED — stricter tsconfig than typecheck alone
pnpm --filter <app_or_package> test      # All tests must pass
```
Run for each affected app/package. **Never skip. Fix errors before marking work complete.**

**Why `build` is mandatory**: `typecheck` uses root `tsconfig.json --noEmit`. The actual build uses stricter/different configs (e.g. `tsconfig.server.json` for eridu_auth backend, vite for frontend). Errors like stale `@ts-expect-error`, `noUnusedLocals`, or ESLint type-aware rules only surface in `build`, not `typecheck`. Passing typecheck ≠ passing build.

### Knowledge Sync (Feature/Refactor Work)
After feature delivery, behavior changes, or refactors — run `.agent/workflows/knowledge-sync.md`.

## Project Stack

**Monorepo**: Turborepo + pnpm workspaces | Node >= 22 | TypeScript 5.9.3

### Apps
- `erify_api` - NestJS REST API (Prisma + PostgreSQL)
- `eridu_auth` - Better Auth SSO (Hono + Drizzle)
- `erify_creators` - React (TanStack Router/Query)
- `erify_studios` - React (+ DnD, forms, virtualization)

### Packages (@eridu/*)
- `api-types` - Zod schemas, API contracts (snake_case)
- `auth-sdk` - JWT verification, React hooks
- `ui` - Radix UI + Tailwind components
- `i18n` - Paraglide (compile-time translations)

## Core Patterns (CRITICAL)

### ID Strategy
- **Never expose internal IDs**: BigInt (DB) → UID string (API)
- **Format**: `{prefix}_{nanoid}` → `user_abc123`, `studio_xyz789`
- **Services**: Generate via `this.generateUid()` from `BaseModelService`

### Three-Tier Schema Architecture
```
┌─────────────────┐
│  API Layer      │ snake_case, Zod, @eridu/api-types
├─────────────────┤
│  Service Layer  │ camelCase, Payload types, business logic
├─────────────────┤
│  DB Layer       │ camelCase TS ↔ snake_case DB (@map)
└─────────────────┘
```

### Authentication Chain
```
eridu_auth (JWT 15min) → erify_api (JWKS verify) → React (Better Auth client)
```
**Guards**: Throttler → JwtAuth → Admin → Studio (role-based)

### Studio-Scoped Pattern
```typescript
// Route: /studios/:studioId/tasks
@StudioProtected([ADMIN, MANAGER])  // Auto-validates membership
method(@StudioParam() studioUid: string) {
  // studioUid already validated by guard
  // req.studioMembership attached
}
```

### Immutable Task Templates
- Template → Snapshots (versioned schemas)
- Task → references specific snapshot
- Template updates don't affect existing tasks

## Monorepo Package Rules (CRITICAL)

- **Export compiled JS only**: All packages export from `dist/`, **never** from `src/`
- **Exports format**: Both `types` and `default` fields required in `package.json` exports
- **Dependencies**: Use `workspace:*` for internal packages (never `file:` or version numbers)
- **tsconfig**: No path mappings to workspace sources in consuming apps — TS resolves via `package.json` exports
- **Vite**: `preserveSymlinks: false` (required for pnpm) + workspace packages in `optimizeDeps.include`
- **Package tsconfig**: Must include `declaration: true`, `declarationMap: true`, `sourceMap: true`, `outDir: "dist"`
- **Dev mode**: Package dev script: `tsc --watch --preserveWatchOutput`

> Full details + examples: [monorepo-package-rules.md](memory/monorepo-package-rules.md)

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Variables/Functions | camelCase | `createUser`, `userId` |
| Components/Classes | PascalCase | `UserCard`, `TaskService` |
| DB Columns | snake_case | `user_id`, `created_at` |
| API JSON | snake_case | `user_id`, `studio_id` |
| Constants | SCREAMING_SNAKE_CASE | `STUDIO_ROLE`, `TASK_STATUS` |
| Files (utils) | kebab-case | `api-client.ts`, `query-keys.ts` |
| Files (components) | PascalCase | `UserCard.tsx`, `TaskForm.tsx` |
| Type Suffixes | Dto, Schema, Payload | `CreateUserDto`, `userSchema` |

### Universal Patterns
- **Soft Delete**: `deletedAt: Date | null`
- **Timestamps**: `createdAt`, `updatedAt` (auto-managed)
- **Versioning**: `version: number` (optimistic locking)
- **Metadata**: `metadata: Json` (extensibility)

## Import Patterns

```typescript
// Path aliases
import { X } from '@/lib/utils';              // All apps
import { Y } from '@frontend/pages/auth';     // eridu_auth only

// Subpath exports (packages)
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { Button } from '@eridu/ui';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';
```

## File Structure

### Backend (NestJS)
```
/src/models/{domain}/
  ├── {domain}.module.ts       ← NestJS module
  ├── {domain}.controller.ts   ← REST endpoints
  ├── {domain}.service.ts      ← Business logic (NO Prisma types!)
  ├── {domain}.repository.ts   ← Data access (Prisma here)
  └── schemas/
      ├── {domain}.schema.ts   ← Zod schemas + Payload types
      └── index.ts
```

### Frontend (React)
```
/src/features/{domain}/
  ├── api/{domain}.ts          ← TanStack Query hooks
  ├── components/              ← Domain components
  ├── hooks/                   ← Domain hooks
  └── types.ts                 ← Local types (if needed)
```

## Quick Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | All apps (concurrency 20) |
| `pnpm dev:creators` | Creators + API + Auth |
| `pnpm dev:studios` | Studios + API + Auth |
| `pnpm build` | Build all apps/packages |
| `pnpm lint` | ESLint (runs on pre-commit) |
| `pnpm sherif` | Check dependency versions |
| `pnpm test` | Run all tests |

## Commit Convention

**Format**: `type(scope): subject`

**Valid types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

**Examples**:
- `feat(tasks): add bulk assignment endpoint`
- `fix(auth): resolve token refresh race condition`
- `refactor(user): migrate to payload pattern`

## NestJS API Patterns (CRITICAL)

### Error Handling — Use `HttpError`, never NestJS exceptions directly
```typescript
import { HttpError } from '@/lib/errors/http-error.util';

// Model services: return null for not-found
async findOne(uid: string): Promise<Task | null>

// Controller: call ensureResourceExists() for 404
const task = await this.taskService.findOne(uid);
this.ensureResourceExists(task);  // throws NotFoundException if null

// Orchestration services: throw HttpError for cross-domain constraints
throw HttpError.badRequest('Task already assigned');
throw HttpError.forbidden('Studio access denied');
```

### Transactions — Use `@Transactional()` decorator, never pass `tx` as param
```typescript
import { Transactional } from '@nestjs-cls/transactional';

@Transactional()
async bulkCreateTasks(payload: BulkCreateTasksPayload): Promise<Task[]> {
  // CLS manages the transaction automatically
}
```

### Controller Response Decorators
```typescript
// Admin controllers (import from 'admin/decorators')
@AdminResponse(taskApiResponseSchema, HttpStatus.OK)
@AdminPaginatedResponse(taskApiResponseSchema)

// Studio/Me controllers (import from '@/lib/decorators')
@ZodResponse(taskApiResponseSchema, HttpStatus.OK)
@ZodPaginatedResponse(taskApiResponseSchema)

// Path params: always use UidValidationPipe
@Get(':taskId')
findOne(@Param('taskId', UidValidationPipe) taskUid: string) { ... }
```

### Performance — Bulk ops & parallel reads
```typescript
// ✅ Parallel independent reads
const [tasks, total] = await Promise.all([
  this.repository.findMany(filters),
  this.repository.count(filters),
]);

// ✅ Bulk writes — never loop create()
await this.repository.createMany(items);
```

## Service Layer Rules (CRITICAL)

**Status**: Major violations resolved Feb 2026. See [known-issues.md](memory/known-issues.md) for models still needing verification.

### Quick Rules (FROM `.agent/skills/service-pattern-nestjs`)
```typescript
// CORRECT - Service imports payload type
import { Task } from '@prisma/client';  // Only entity type
import type { CreateTaskPayload } from './schemas';  // Payload defined in schema

async create(payload: CreateTaskPayload): Promise<Task>

// ALSO CORRECT - Pass-through to repository
async findOne(...args: Parameters<TaskRepository['findOne']>): Promise<Task | null>

// WRONG - Service exposes Prisma type
import { Prisma, Task } from '@prisma/client';
async create(data: Prisma.TaskCreateInput): Promise<Task>

// WRONG - Service builds Prisma query
const where: Prisma.TaskWhereInput = { ... };
```

**Note**: Schemas CAN import `Prisma` types to **define** payload types. Services MUST NOT.

### When Writing Code
| DO | DON'T |
|-------|----------|
| Define payload types in schemas | Expose `Prisma.*` in service signatures |
| Use repository for all DB access | Build Prisma queries in service |
| Follow task model pattern | Copy patterns from client/mc/platform models (unverified) |
| Reference [ideal-pattern.md](memory/ideal-pattern.md) | Assume existing code is correct |

### Reference Priority
1. **[ideal-pattern.md](memory/ideal-pattern.md)** ← Follow this for new code
2. **task.service.ts** ← Best model service example
3. **task-orchestration.service.ts** ← Best orchestration service example
4. **studio-membership schema** ← Best schema example

## Documentation Index

### Project Skills (Primary Authority - `.agent/skills/`)
| Skill | Purpose | Priority |
|-------|---------|----------|
| **service-pattern-nestjs** | Service layer patterns, payload types | HIGH |
| **orchestration-service-nestjs** | Multi-service coordination, bulk ops, idempotency | HIGH |
| **repository-pattern-nestjs** | Repository layer, BaseRepository | HIGH |
| **shared-api-types** | @eridu/api-types usage | HIGH |
| **erify-authorization** | Guards, roles, permissions | HIGH |
| **engineering-best-practices-enforcer** | Repo-aligned best practices audit & refactor | HIGH |
| **backend-controller-pattern-nestjs** | Controller patterns (admin/studio/me/backdoor) | MEDIUM |
| **solid-principles** | SOLID principles for backend & frontend | MEDIUM |
| **frontend-api-layer** | TanStack Query patterns | MEDIUM |
| **frontend-state-management** | React state patterns | MEDIUM |
| **jsonb-analytics-snapshot** | Analytics aggregation with JSONB snapshots | MEDIUM |
| **schedule-continuity-workflow** | Schedule update/validate/publish workflow | MEDIUM |
| **file-upload-presign** | Presigned R2 upload flow, use case limits, storage routing | MEDIUM |
| **shift-schedule-pattern** | Shift CRUD, blocks, calendar/alignment orchestration, duty-manager, task-readiness, FE shift UX | HIGH |
| **soft-delete-restore** | Restore workflow for soft-deleted records: repository, service, controller, version behavior, dependency checks | MEDIUM |
| **api-performance-optimization** | Lean select/include, N+1 audit, aggregation strategy, bulk write guards, pagination caps, query logging | MEDIUM |
| **backend-testing-patterns** | Jest-based NestJS tests: service, controller, guard, orchestration; project test helpers in `src/testing/` | HIGH |
| **observability-logging** | NestJS Logger usage, log levels, what to never log, structured message format, BullMQ processor logging | MEDIUM |
| **secure-coding-practices** | Per-feature security checklist: input validation, ID exposure, SQL injection, studio scoping, secrets, rate limiting | HIGH |
| **domain-refactor-cutover-strategy** | Multi-phase domain rename playbook: scope isolation, contract-first ordering, alias vs. direct cutover, stabilization | MEDIUM |
| **data-compatibility-migration** | Frontend dual-field fallback helpers for API contract migrations, centralized accessor pattern, lifecycle rules | MEDIUM |
| **pwa-best-practices** | PWA setup/migration, SW caching boundaries, app-shell update/recovery patterns | HIGH |

**Full skill list** (41 total): See `.agent/skills/` directory

### Memory Files (Supplementary - `.claude/memory/`)
| File | Purpose | When to Use |
|------|---------|-------------|
| **[quick-reference.md](memory/quick-reference.md)** | Templates & examples | Creating new code |
| **[code-review-checklist.md](memory/code-review-checklist.md)** | Pre-commit checks | Before committing |
| **[ideal-pattern.md](memory/ideal-pattern.md)** | Complete model template | Reference implementation |
| **[known-issues.md](memory/known-issues.md)** | Technical debt tracker | Models needing verification |
| **[tech-stack.md](memory/tech-stack.md)** | Stack details | Stack questions |
| **[auth-patterns.md](memory/auth-patterns.md)** | Auth/guards details | Auth deep-dive |
| **[schema-patterns.md](memory/schema-patterns.md)** | DTO transformations | Schema design |
| **[skills-integration.md](memory/skills-integration.md)** | Skills hierarchy & usage guide | Skills reference |
| **[monorepo-package-rules.md](memory/monorepo-package-rules.md)** | Package exports, tsconfig, Vite config | Working with `packages/*` |
