---
name: design-patterns
description: Provides comprehensive architectural and design patterns for building scalable, maintainable systems. Use when designing application architecture, organizing code into layers, implementing error handling, ensuring type safety, managing dependencies, or optimizing performance.
---

# Design Patterns Skill

Provides comprehensive architectural and design patterns for building scalable systems.

## Separation of Concerns

**Organize code into distinct layers with clear responsibilities**:

```
┌─────────────────────────────────┐
│       HTTP API Layer            │  Controllers, Route handlers
│   (Request/Response handling)   │  Input validation, HTTP status codes
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│     Business Logic Layer        │  Services, Orchestration
│  (Core domain operations)       │  Transactions, Validation, Error handling
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│     Data Access Layer           │  Repositories, Queries
│    (Database operations)        │  ORM mapping, Query building
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│      Database Layer             │  Tables, Relationships
│    (Data persistence)           │  Constraints, Migrations
└─────────────────────────────────┘
```

**Key Rules**:
- ✅ Controllers handle HTTP concerns only
- ✅ Services contain business logic
- ✅ Repositories hide database details
- ✅ Each layer uses appropriate abstractions
- ❌ Don't expose database IDs in HTTP responses
- ❌ Don't put business logic in controllers
- ❌ Don't query databases from HTTP layer

## Model Services vs Orchestration Services

**Model Services**: Single-entity CRUD operations

```
UserService:
  - createUser()
  - getUserById()
  - updateUser()
  - deleteUser()
  - findMany()

Purpose:
- Single entity focus
- Standard CRUD patterns
- Reusable across applications
- Easy to test

Dependencies:
- UserRepository
- UtilityService
- PrismaService (if needed)
```

**Orchestration Services**: Multi-entity coordination

```
ShowOrchestrationService:
  - createShowWithAssignments()
  - updateShowWithAssignments()
  - deleteShow()
  - removeMCsFromShow()
  - replacePlatformsForShow()

Purpose:
- Cross-entity operations
- Atomic transactions
- Prevent circular dependencies
- Coordinate multiple services

Dependencies:
  - ShowService
  - McService
  - PlatformService
  - ShowMcService
  - ShowPlatformService
  - PrismaService
```

**Decision Tree**:

```
Does operation involve ONE entity only?
├─ YES → Create Model Service
│   Example: UserService for user CRUD
└─ NO → Does it span multiple entities?
    ├─ YES → Create Orchestration Service
    │   Example: ShowOrchestrationService for show + MCs + platforms
    └─ NO → Operation doesn't need coordination
        Example: Pagination in a single entity
```

## Type Safety Patterns

**Use TypeScript generics and strict mode**:

```typescript
// ✅ CORRECT: Type-safe generic base class
export abstract class BaseRepository<
  T,  // Entity type (User, Show, Client)
  C,  // Create input type (Prisma.UserCreateInput)
  U,  // Update input type (Prisma.UserUpdateInput)
  W,  // Where clause type (Prisma.UserWhereInput)
> {
  abstract create(data: C): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract update(id: string, data: U): Promise<T>;
}

// ✅ CORRECT: Type-safe service with generics
export class BaseModelService<T, C, U, W> {
  constructor(private repository: BaseRepository<T, C, U, W>) {}

  async create(data: C): Promise<T> {
    return this.repository.create(data);
  }
}

// ❌ WRONG: Using any/unknown to bypass type checking
async getUser(id: any): Promise<any> {  // Loses type safety!
  return this.userService.getUserById(id);
}
```

**Benefits**:
- ✅ Compile-time error detection
- ✅ IDE autocomplete support
- ✅ Refactoring confidence
- ✅ Self-documenting code
- ✅ Catch bugs early

## Branded IDs (UIDs) Pattern

**Use tagged strings for different ID types**:

```typescript
// ✅ CORRECT: Use branded string types
type UserId = string & { readonly __brand: "UserId" };
type ShowId = string & { readonly __brand: "ShowId" };

function createUserId(id: string): UserId {
  return id as UserId;
}

async getUser(userId: UserId) {  // Type-safe!
  return await this.userService.getUser(userId);
}

// ❌ WRONG: Uses untyped string
async getUser(userId: string) {
  // Could accidentally pass a show ID instead of user ID
}

// Simplified approach (no branded types):
// Use constants for prefixes instead
const USER_PREFIX = "user";
const SHOW_PREFIX = "show";

// Validate format
function isValidUserId(id: string): boolean {
  return id.startsWith(`${USER_PREFIX}_`) && id.length > 10;
}
```

**Benefits**:
- ✅ Prevent mixing different ID types
- ✅ Compile-time checks
- ✅ Clear intent in function signatures
- ✅ IDE catches mistakes

## Error Handling Pattern

**Consistent error handling across layers**:

```
Controller:
  - Validate input (reject with 400)
  - Call service
  - Catch service exceptions
  - Return appropriate status code

Service:
  - Check preconditions (throw custom errors)
  - Perform operation
  - Throw domain-specific errors (not HTTP)
  - Let filters/interceptors convert to HTTP

Repository:
  - Execute queries
  - Let ORM handle validation
  - Throw low-level errors
  - Let service layer interpret

Example flow:
├─ Controller receives POST /users { email: "invalid" }
├─ Controller validates (400: invalid format)
├─ If valid, calls UserService.createUser()
├─ Service calls UserRepository.create()
├─ Repository throws "duplicate email" constraint error
├─ Service catches, throws HttpError.conflict("Email already exists")
├─ Global error filter catches, returns 409 JSON
└─ Controller returns response
```

**Error handling by layer**:

```typescript
// Repository: Let ORM handle validation
async create(data: Prisma.UserCreateInput) {
  try {
    return await this.model.create({ data });
  } catch (e) {
    // Let PrismaExceptionFilter handle it
    throw e;
  }
}

// Service: Throw domain errors
async createUser(data: CreateUserDto) {
  if (data.name.length < 1) {
    throw HttpError.badRequest("Name is required");
  }
  return this.userRepository.create(data);
}

// Controller: Handle HTTP concerns
try {
  const user = await this.userService.createUser(body);
  return res.status(201).json(user);
} catch (e) {
  // Global error filter handles it
  throw e;
}
```

## Dependency Injection Pattern

**Inject dependencies, don't create them**:

```typescript
// ✅ CORRECT: Dependencies injected
@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private utilityService: UtilityService,
  ) {}

  async createUser(data: CreateUserDto) {
    const uid = this.utilityService.generateBrandedId("user");
    return this.userRepository.create({ ...data, uid });
  }
}

// ❌ WRONG: Services create dependencies
export class UserService {
  private userRepository = new UserRepository();  // Hard to test!

  async createUser(data: CreateUserDto) {
    // Can't mock repository for testing
  }
}
```

**Benefits**:
- ✅ Easy to test (mock dependencies)
- ✅ Loose coupling
- ✅ Swap implementations
- ✅ Reuse across services

## Monorepo Package Organization

**Organize workspace packages by concern**:

```
packages/
├── api-types/              # Shared API contracts
│   ├── src/
│   │   ├── shows/         # Show API schemas
│   │   ├── users/         # User API schemas
│   │   ├── clients/       # Client API schemas
│   │   └── constants.ts   # UID prefixes, shared constants
│   └── dist/              # Compiled output
│
├── auth-sdk/              # JWT/JWKS utilities
│   ├── src/
│   │   ├── server/        # JwksService, framework-agnostic
│   │   ├── adapters/      # NestJS, Express adapters
│   │   └── types/         # TypeScript types
│   └── dist/
│
├── ui/                    # Shared UI components
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   └── styles/        # Shared styles
│   └── dist/
│
└── eslint-config/         # Shared ESLint rules
    └── src/
        └── nestjs.js      # NestJS-specific rules
```

**Key Rules**:
- ✅ Export compiled code from `dist/`
- ✅ Import packages by name (`@eridu/api-types`)
- ✅ Define exports in `package.json`
- ✅ Use `workspace:*` protocol for dependencies
- ❌ Don't import from `src/` in other packages
- ❌ Don't use path mappings for workspace packages

## Performance Optimization Pattern

**Identify and address bottlenecks**:

```
Layered Optimization:

1. Query Optimization
   ├─ Use indexes (fastest)
   ├─ Use includes instead of N+1 queries
   ├─ Use bulk operations instead of loops
   └─ Parallel queries with Promise.all()

2. Caching
   ├─ Response caching (HTTP)
   ├─ Service-level caching (static data)
   └─ Query result caching (expensive operations)

3. Pagination
   ├─ Limit results per page
   ├─ Offset or cursor-based
   └─ Total count query optimized

4. Async Processing
   ├─ Background jobs (non-critical operations)
   ├─ Event-driven architecture
   └─ Worker queues for expensive operations
```

**Common Bottlenecks**:

```
Problem: N+1 Query Problem
❌ BEFORE: 1 query + N queries per result
  const users = await prisma.user.findMany();
  for (const user of users) {
    const posts = await prisma.post.findMany({ where: { userId: user.id } });
  }
  // Result: 1 + 100 queries for 100 users

✅ AFTER: Single query with includes
  const users = await prisma.user.findMany({
    include: { posts: true },
  });
  // Result: 1 query for 100 users

Problem: Sequential Operations
❌ BEFORE: Await operations sequentially
  const user = await userService.getUser(id);
  const posts = await postService.getPosts(id);
  const comments = await commentService.getComments(id);
  // Time: T1 + T2 + T3

✅ AFTER: Parallel queries
  const [user, posts, comments] = await Promise.all([
    userService.getUser(id),
    postService.getPosts(id),
    commentService.getComments(id),
  ]);
  // Time: max(T1, T2, T3)

Problem: Loop-Based Inserts
❌ BEFORE: Create one at a time
  for (const show of shows) {
    await prisma.show.create({ data: show });
  }
  // Result: 100 queries for 100 shows

✅ AFTER: Bulk insert
  await prisma.show.createMany({
    data: shows,
  });
  // Result: 1 query for 100 shows
```

## Transaction Pattern

**Atomic multi-step operations**:

```
Requirements:
1. All steps must succeed or all must fail
2. No in-between states visible
3. Automatic rollback on error

Example: Publish Schedule
├─ Delete existing shows
├─ Create new shows
├─ Create MC relationships
├─ Create platform relationships
├─ Update schedule status
└─ Return result
```

```typescript
// ✅ CORRECT: Use transaction for atomicity
const result = await prisma.$transaction(async (tx) => {
  // Step 1: Delete old
  await tx.show.deleteMany({
    where: { scheduleId: schedule.id },
  });

  // Step 2: Create new
  const shows = await tx.show.createMany({
    data: planDocument.shows.map(show => ({
      /* ... */
    })),
  });

  // Step 3: Create relationships
  const showMCs = await tx.showMC.createMany({
    data: showMCRecords,
  });

  // Step 4: Update status
  await tx.schedule.update({
    where: { id: schedule.id },
    data: { status: "published" },
  });

  // All succeed or all rollback
  return { shows, showMCs };
});
```

**Benefits**:
- ✅ Data consistency
- ✅ No partial updates
- ✅ Automatic rollback
- ✅ Clear operation boundaries

## Circuit Breaker Pattern (Advanced)

**Prevent cascading failures**:

```typescript
// Monitor external service calls
// If failure rate exceeds threshold, fail fast

enum CircuitState {
  CLOSED = "closed",    // Normal operation
  OPEN = "open",        // Failing, reject calls
  HALF_OPEN = "half_open", // Testing recovery
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > 60000) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (e) {
      this.onFailure();
      throw e;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount > 5) {
      this.state = CircuitState.OPEN;
    }
  }
}
```

## Best Practices Checklist

- [ ] Organize code into clear layers (controller, service, repository)
- [ ] Use model services for single-entity CRUD
- [ ] Use orchestration services for multi-entity operations
- [ ] Enable TypeScript strict mode
- [ ] Use branded types or prefixes for different ID types
- [ ] Handle errors consistently across layers
- [ ] Use dependency injection (don't create dependencies)
- [ ] Avoid N+1 query problems
- [ ] Use bulk operations instead of loops
- [ ] Implement optimistic locking for concurrent updates
- [ ] Use transactions for multi-step operations
- [ ] Index frequently queried columns
- [ ] Use soft delete instead of hard delete
- [ ] Implement pagination for large datasets
- [ ] Write tests for services and repositories
- [ ] Document complex operations
- [ ] Monitor and optimize slow queries
- [ ] Use caching strategically
- [ ] Consider async processing for expensive operations
- [ ] Validate all external inputs

## Related Skills

- **backend-controller-pattern/SKILL.md** - HTTP layer patterns
- **service-pattern/SKILL.md** - Business logic patterns
- **repository-pattern/SKILL.md** - Data access patterns
- **database-patterns/SKILL.md** - Database optimization
