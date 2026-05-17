---
name: backend-testing-patterns
description: Testing patterns for erify_api NestJS backend. Use when writing service unit tests, controller tests, guard tests, or orchestration service tests. Covers NestJS TestingModule setup, project-specific test helpers, mocking strategies, and what to assert at each layer. The erify_api test runner is Jest (not Vitest).
---

# Backend Testing Patterns

**Test runner**: Jest (`jest.fn()`, `jest.mock()`, `jest.spyOn()`) — NOT Vitest.

**Test helpers**: `apps/erify_api/src/testing/` — always check before writing boilerplate.

> See [references/01-service-tests.md](references/01-service-tests.md) and [references/02-controller-tests.md](references/02-controller-tests.md) for detailed examples.

## 1. Model Service Tests

Use `createModelServiceTestModule` from `@/testing/model-service-test.helper`. Mock at the repository boundary — never use a real Prisma client.

## 2. Controller Tests

Use `Test.createTestingModule` with `jest.Mocked<ServiceClass>`. Assert: correct service method called with correct args, return value passed through, 404 path propagated. Do NOT test business logic or guard behavior.

## 3. Guard Tests

Build mock `ExecutionContext` with `jest.fn()`. Assert: returns `true` for valid conditions, throws correct `HttpError` for failures, attaches expected properties to request.

> Canonical: `apps/erify_api/src/lib/guards/studio.guard.spec.ts`

## 4. Orchestration Service Tests

Mock all injected Model Services. Assert: coordination sequence, idempotency, partial failure handling, payload mapping.

## 5. Error Cases

- `VersionConflictError` → HTTP 409: use `new VersionConflictError('outdated', 1, 2)`
- Prisma P2025: use `createPrismaNotFoundError()` from `@/testing/prisma-error.helper`
- `HttpError`: assert throws correct exception variant

## 6. Test Data

Use `createBaseMockEntity()` from `@/testing/model-service-test.helper`. Check `@/testing/mock-data-factories.ts` before creating inline mock data.

## 7. What NOT to Test

| Skip | Why |
|---|---|
| NestJS DI wiring | Framework |
| Prisma query syntax | Repository responsibility |
| Input validation (Zod) | Schema unit test |
| Guard logic in controller tests | Guard has own spec |

## Related Skills

- [Service Pattern](../service-pattern-nestjs/SKILL.md) — Service layer being tested
- [Repository Pattern](../repository-pattern-nestjs/SKILL.md) — Interface being mocked
- [Frontend Testing Patterns](../frontend-testing-patterns/SKILL.md) — Vitest (contrast)
