---
name: backend-testing-patterns
description: Testing patterns for erify_api NestJS backend. Use when writing service unit tests, controller tests, guard tests, or orchestration service tests. Covers NestJS TestingModule setup, project-specific test helpers, mocking strategies, and what to assert at each layer. The erify_api test runner is Jest (not Vitest).
---

# Backend Testing Patterns

**Test runner**: Jest (`jest.fn()`, `jest.mock()`, `jest.spyOn()`) — NOT Vitest.

**Test helpers live at**: `apps/erify_api/src/testing/`

Always check `src/testing/` before writing boilerplate test setup from scratch — the project ships helpers for every common test scenario.

---

## 1. Model Service Tests

Use `createModelServiceTestModule` from `@/testing/model-service-test.helper`.

```typescript
import { createMockRepository, createMockUtilityService, createModelServiceTestModule } from '@/testing/model-service-test.helper';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));  // Required if service calls generateUid

describe('TaskTemplateService', () => {
  let service: TaskTemplateService;

  beforeEach(async () => {
    const repositoryMock = createMockRepository<TaskTemplateRepository>();
    const utilityMock = createMockUtilityService('ttpl_test123');

    const module = await createModelServiceTestModule({
      serviceClass: TaskTemplateService,
      repositoryClass: TaskTemplateRepository,
      repositoryMock,
      utilityMock,
    });

    service = module.get<TaskTemplateService>(TaskTemplateService);
  });
});
```

**Rule**: Mock at the repository boundary — never pass a real Prisma client to service tests.

> See [`references/01-service-tests.md`](references/01-service-tests.md) for additional providers and mocking extra services.

---

## 2. Controller Tests

Use `Test.createTestingModule` directly with `jest.Mocked<ServiceClass>` for type-safe mock access.

```typescript
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

describe('StudioTaskTemplateController', () => {
  let controller: StudioTaskTemplateController;
  let taskTemplateService: jest.Mocked<TaskTemplateService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioTaskTemplateController],
      providers: [
        {
          provide: TaskTemplateService,
          useValue: {
            findOne: jest.fn(),
            getTaskTemplates: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: StudioService,
          useValue: {},  // Thin stub — only mock what the controller calls
        },
      ],
    }).compile();

    controller = module.get<StudioTaskTemplateController>(StudioTaskTemplateController);
    taskTemplateService = module.get(TaskTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
```

**What to assert in controller tests**:
- Correct service method was called with correct args
- Return value is passed through
- 404 path — when service throws, controller propagates

**What NOT to test in controller tests**:
- Business logic (belongs in service tests)
- Guard behavior (belongs in guard tests)

> See [`references/02-controller-tests.md`](references/02-controller-tests.md) for admin and studio controller variants.

---

## 3. Guard Tests

Guards require a mock `ExecutionContext`. Use `jest.fn()` to build a minimal context shape.

```typescript
const mockExecutionContext = {
  switchToHttp: jest.fn().mockReturnValue({
    getRequest: jest.fn(),
  }),
  getHandler: jest.fn(),
  getClass: jest.fn(),
} as unknown as ExecutionContext;
```

Set per-test request state:
```typescript
(mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue({
  user: { ext_id: 'user-123' },
  params: { studioId: 'studio_abc' },
});
```

**What to assert in guard tests**:
- Returns `true` when conditions are met
- Throws correct `HttpError` variant for each failure case
- Attaches expected properties to `request` (e.g. `req.studioMembership`)

> See `apps/erify_api/src/lib/guards/studio.guard.spec.ts` as the canonical example.

---

## 4. Orchestration Service Tests

Orchestration services depend on multiple model services. Mock all of them.

```typescript
describe('ShowOrchestrationService', () => {
  let service: ShowOrchestrationService;
  let showService: jest.Mocked<ShowService>;
  let taskService: jest.Mocked<TaskService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ShowOrchestrationService,
        { provide: ShowService, useValue: { findOne: jest.fn(), update: jest.fn() } },
        { provide: TaskService, useValue: { create: jest.fn(), findMany: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShowOrchestrationService);
    showService = module.get(ShowService);
    taskService = module.get(TaskService);
  });
});
```

**What to assert in orchestration tests**:
- Coordination sequence: service A called before service B when ordering matters
- Idempotency: second call with same input is a no-op
- Partial failure: error from one sub-service causes correct rollback/error
- Payload mapping: input is correctly transformed before being passed to each sub-service

---

## 5. Error Case Patterns

### Service throws HttpError
```typescript
it('should throw conflict when template name already exists', async () => {
  repositoryMock.findOne = jest.fn().mockResolvedValue({ uid: 'existing' });

  await expect(service.create(payload)).rejects.toThrow(ConflictException);
});
```

### Prisma RecordNotFound (P2025)
Use `@/testing/prisma-error.helper` to create typed Prisma errors:
```typescript
import { createPrismaNotFoundError } from '@/testing/prisma-error.helper';

repositoryMock.update = jest.fn().mockRejectedValue(createPrismaNotFoundError());

await expect(service.update('uid_123', payload)).rejects.toThrow(NotFoundException);
```

### VersionConflictError → HTTP 409
```typescript
import { VersionConflictError } from '@/lib/errors/version-conflict.error';

repositoryMock.updateWithVersionCheck = jest.fn().mockRejectedValue(
  new VersionConflictError('outdated', 1, 2),
);

await expect(service.update('uid', 1, payload)).rejects.toThrow(ConflictException);
```

---

## 6. Test Data Helpers

```typescript
import { createBaseMockEntity } from '@/testing/model-service-test.helper';

// Typed mock entity with all standard fields set
const mockTemplate = createBaseMockEntity({
  uid: 'ttpl_123',
  name: 'Test Template',
  isActive: true,
});
```

For domain-specific factories, check `@/testing/mock-data-factories.ts` before creating inline mock data.

---

## 7. What NOT to Test

| Skip | Why |
|---|---|
| NestJS DI wiring | Framework responsibility |
| Prisma query syntax | Repository responsibility |
| Input validation (Zod) | Schema unit test responsibility |
| Guard logic in controller tests | Guard has its own spec |

---

## Related Skills

- **[Service Pattern](../service-pattern-nestjs/SKILL.md)**: Service layer rules being tested.
- **[Repository Pattern](../repository-pattern-nestjs/SKILL.md)**: Repository interface being mocked.
- **[Database Patterns — Optimistic Locking](../database-patterns/SKILL.md#6-optimistic-locking-version-check)**: `VersionConflictError` handling.
- **[Frontend Testing Patterns](../frontend-testing-patterns/SKILL.md)**: Vitest-based patterns for React (contrast: frontend uses Vitest, backend uses Jest).
