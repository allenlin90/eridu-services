# Eridu Services Monorepo - Quick Reference

> **Last Updated**: 2026-02-17
> **Status**: Production codebase with known architectural debt (see Known Issues)

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

## CRITICAL: Known Architectural Debt

**Status**: 14/18 models violate ideal patterns (previous agents had hallucinations)

### Quick Rules (FROM `.claude/skills/service-pattern-nestjs`)
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
| Follow task model pattern | Copy patterns from user/studio models |
| Reference [ideal-pattern.md](memory/ideal-pattern.md) | Assume existing code is correct |

### Reference Priority
1. **[ideal-pattern.md](memory/ideal-pattern.md)** ← Follow this for new code
2. **task.service.ts** ← Best existing example
3. **studio-membership schema** ← Best schema example
4. **user/studio/show services** ← DO NOT copy (need refactoring)

## Documentation Index

### Project Skills (Primary Authority - `.claude/skills/`)
| Skill | Purpose | Priority |
|-------|---------|----------|
| **service-pattern-nestjs** | Service layer patterns, payload types | HIGH |
| **repository-pattern-nestjs** | Repository layer, BaseRepository | HIGH |
| **shared-api-types** | @eridu/api-types usage | HIGH |
| **erify-authorization** | Guards, roles, permissions | HIGH |
| **backend-controller-pattern-nestjs** | Controller patterns | MEDIUM |
| **frontend-api-layer** | TanStack Query patterns | MEDIUM |
| **frontend-state-management** | React state patterns | MEDIUM |

**Full skill list** (23 total): See `.claude/skills/` directory

### Memory Files (Supplementary - `.claude/memory/`)
| File | Purpose | When to Use |
|------|---------|-------------|
| **[quick-reference.md](memory/quick-reference.md)** | Templates & examples | Creating new code |
| **[code-review-checklist.md](memory/code-review-checklist.md)** | Pre-commit checks | Before committing |
| **[ideal-pattern.md](memory/ideal-pattern.md)** | Complete model template | Reference implementation |
| **[known-issues.md](memory/known-issues.md)** | Technical debt tracker | Understanding violations |
| **[tech-stack.md](memory/tech-stack.md)** | Stack details | Stack questions |
| **[auth-patterns.md](memory/auth-patterns.md)** | Auth/guards details | Auth deep-dive |
| **[schema-patterns.md](memory/schema-patterns.md)** | DTO transformations | Schema design |
| **[skills-integration.md](memory/skills-integration.md)** | Skills integration notes | Skills reference |
| **[skills-review.md](memory/skills-review.md)** | Skills review notes | Skills audit |
| **[skills-linting-fixes.md](memory/skills-linting-fixes.md)** | Linting fix patterns | Fixing lint errors |
| **[skills-updates-2026-02-15.md](memory/skills-updates-2026-02-15.md)** | Recent skills updates | Change history |
