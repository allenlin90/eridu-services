# Testing Utilities

This directory contains shared utilities and helpers for testing the API application. All testing utilities are centralized here for easy discovery and maintenance.

## Directory Structure

- `jwt-auth-test.helper.ts` - JWT authentication mocking utilities
- `jwt-controller-test.helper.ts` - JWT-protected controller testing helpers
- `admin-controller-test.helper.ts` - Admin controller testing helpers
- `backdoor-controller-test.helper.ts` - API key authenticated controller testing helpers
- `guard-test.helper.ts` - Guard testing utilities and mock factories
- `mock-data-factories.ts` - Common mock data factories for entities
- `model-service-test.helper.ts` - Model service testing utilities (moved from common)
- `prisma-error.helper.ts` - Prisma error mocking utilities (moved from common)

## When to Use Each Helper

### Controller Testing

- **`jwt-controller-test.helper.ts`** - For controllers using JWT authentication (`me/*` endpoints)
- **`admin-controller-test.helper.ts`** - For admin controllers (typically no JWT auth)
- **`backdoor-controller-test.helper.ts`** - For backdoor controllers using API key auth

### Service Testing

- **`model-service-test.helper.ts`** - For model/repository services with standard CRUD operations

### Guard Testing

- **`guard-test.helper.ts`** - For testing custom guards with mock ExecutionContext

### Data & Errors

- **`mock-data-factories.ts`** - For creating consistent mock data across tests
- **`prisma-error.helper.ts`** - For mocking Prisma-specific errors

## jwt-auth-test.helper.ts

Provides reusable JWT authentication mocking utilities for controller tests that use the `JwtAuthGuard`.

### Setup

```typescript
import {
  createAuthenticatedUser,
  createJwtAuthProviders,
  setupJwtAuthMocks,
} from '@/testing/jwt-auth-test.helper';

// Setup mocks globally (call once at the top of your test file)
setupJwtAuthMocks();

describe('MyController', () => {
  let controller: MyController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MyController],
      providers: [
        MyService,
        ...createJwtAuthProviders(), // Includes AuthService and JwtAuthGuard mocks
      ],
    }).compile();

    controller = module.get<MyController>(MyController);
  });

  it('should work with authenticated user', () => {
    const user = createAuthenticatedUser({
      ext_id: 'custom_user_id',
      email: 'custom@example.com',
    });

    // Use the user in your test
    expect(controller.doSomething(user)).toBeDefined();
  });
});
```

### Available Functions

- `setupJwtAuthMocks()`: Sets up all JWT-related mocks globally
- `createJwtAuthProviders()`: Returns NestJS providers for AuthService and JwtAuthGuard mocks
- `createAuthenticatedUser(overrides?)`: Creates an AuthenticatedUser object for testing
- `createMockAuthService()`: Creates a mock AuthService
- `createMockJwtAuthGuard(canActivate?)`: Creates a mock JwtAuthGuard

### Common Mock Objects

- `mockAuthenticatedUser`: Default authenticated user object
- `mockJwtPayload`: Default JWT payload object

## model-service-test.helper.ts

Provides utilities for testing model services with standardized repository and utility service mocking.

See the file for detailed usage examples.
