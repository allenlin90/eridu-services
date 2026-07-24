---
name: backend-testing-patterns
description: Test erify_api services, controllers, guards, and orchestration with Jest, TestingModule, repo helpers, and mocks.
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

## 5. Real-Database Integration Tests

Unit tests mock the repository boundary. Use the isolated real-PostgreSQL harness
when the invariant depends on Prisma, PostgreSQL, Nest module wiring, or CLS
transaction behavior and therefore cannot be proven by a mock.

- Run it only with `ERIFY_API_TEST_DATABASE_URL`; never fall back to the normal
  `DATABASE_URL`.
- Require a dedicated local database whose name ends in `_test`.
- Apply checked-in migrations before the suite and keep the Jest run serial.
- Characterize observable behavior: rollback, read-your-own-writes, active-row
  filtering, UID-only boundaries, and representative runtime module boot.
- Do not treat a mocked repository test as evidence of transaction participation.

See [`apps/erify_api/test/README.md`](../../../apps/erify_api/test/README.md) for
the guarded runner and local database commands.

## 6. Error Cases

- `VersionConflictError` → HTTP 409: use `new VersionConflictError('outdated', 1, 2)`
- Prisma P2025: use `createPrismaNotFoundError()` from `@/testing/prisma-error.helper`
- `HttpError`: assert throws correct exception variant

## 7. Test Data

Use `createBaseMockEntity()` from `@/testing/model-service-test.helper`. Check `@/testing/mock-data-factories.ts` before creating inline mock data.

## 8. What NOT to Test

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
