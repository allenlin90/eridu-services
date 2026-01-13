# Eridu Services - Service Pattern Skill

Provides guidance for implementing service layers in Eridu Services.

## Base Model Service Pattern

### Service Structure

```typescript
import { Injectable } from '@nestjs/common';
import { BaseModelService } from '@/common/services/base-model.service';

@Injectable()
export class UserService extends BaseModelService<User> {
  // UID_PREFIX has NO trailing underscore
  static readonly UID_PREFIX = 'user';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly utilityService: UtilityService,
  ) {
    super();
  }
}
```

**Key Rules**:

- ✅ Extend `BaseModelService<T>` for CRUD services
- ✅ Define `UID_PREFIX` as static readonly constant (no trailing underscore)
- ✅ Inject repository and `UtilityService`
- ❌ Never use trailing underscore in UID_PREFIX

## CRUD Operations Pattern

### Create

```typescript
async createUser(data: CreateUserDto): Promise<User> {
  const user = await this.userRepository.create({
    uid: this.utilityService.generateBrandedId(UserService.UID_PREFIX),
    email: data.email,
    name: data.name,
    // ... other fields
  });
  return user;
}
```

### Read

```typescript
async getUserById(uid: string): Promise<User> {
  const user = await this.userRepository.findByUid(uid);
  if (!user) {
    throw HttpError.notFound('User', uid);
  }
  return user;
}

async listUsers(params: { skip: number; take: number }): Promise<User[]> {
  return this.userRepository.findMany({
    where: { deletedAt: null },
    skip: params.skip,
    take: params.take,
  });
}
```

### Update

```typescript
async updateUser(uid: string, data: UpdateUserDto): Promise<User> {
  // Always verify resource exists
  await this.getUserById(uid);

  return this.userRepository.update(
    { uid, deletedAt: null },
    {
      email: data.email,
      name: data.name,
    },
  );
}
```

### Delete

```typescript
async deleteUser(uid: string): Promise<void> {
  // Verify resource exists
  await this.getUserById(uid);

  await this.userRepository.softDelete({
    uid,
    deletedAt: null,
  });
}
```

## Error Handling in Services

**Always use `HttpError` utility**:

```typescript
import { HttpError } from '@/common/errors/http-error.util';

// Not found
if (!resource) {
  throw HttpError.notFound('User', uid);
}

// Bad request
if (invalidInput) {
  throw HttpError.badRequest('Invalid email format');
}

// Bad request with details
if (!validationResult.isValid) {
  throw HttpError.badRequestWithDetails('Validation failed', {
    errors: validationResult.errors,
  });
}

// Conflict
if (versionMismatch) {
  throw HttpError.conflict('Version mismatch. Expected 5, got 3');
}

// Other status codes
throw HttpError.unauthorized('Authentication required');
throw HttpError.forbidden('Access denied');
throw HttpError.unprocessableEntity('Invalid data format');
```

**Available Methods**:

| Method | Status | Use Case |
|--------|--------|----------|
| `notFound(resource, identifier?)` | 404 | Resource not found |
| `badRequest(message)` | 400 | Invalid input |
| `badRequestWithDetails(message, details)` | 400 | Validation errors with details |
| `conflict(message)` | 409 | Version mismatch, duplicate records |
| `unauthorized(message)` | 401 | Authentication required |
| `forbidden(message)` | 403 | Access denied |
| `unprocessableEntity(message)` | 422 | Invalid data format |

**Key Rules**:

- ✅ Always use `HttpError` utility
- ✅ Include resource name and identifier in error messages
- ✅ Provide actionable error messages
- ❌ Never throw NestJS exceptions directly
- ❌ Never expose sensitive implementation details

## Common Patterns

### Verify Before Update/Delete

```typescript
async updateUser(uid: string, data: UpdateUserDto): Promise<User> {
  // Always check resource exists
  await this.getUserById(uid);

  // Then perform update
  return this.userRepository.update(
    { uid, deletedAt: null },
    data,
  );
}
```

### Count Records

```typescript
async countUsers(): Promise<number> {
  return this.userRepository.count({
    where: { deletedAt: null },
  });
}
```

### Query with Includes

```typescript
async getUserWithStudio(uid: string): Promise<User & { studio?: Studio }> {
  const user = await this.userRepository.findByUid(uid);
  if (!user) {
    throw HttpError.notFound('User', uid);
  }
  return user;
}
```

## Orchestration vs Model Services

**Model Service**: Single entity management

```typescript
// UserService - Only manages User entity
export class UserService {
  async createUser(data: CreateUserDto): Promise<User>;
  async getUserById(uid: string): Promise<User>;
  async updateUser(uid: string, data: UpdateUserDto): Promise<User>;
  async deleteUser(uid: string): Promise<void>;
}
```

**Orchestration Service**: Multiple entity coordination (see eridu-database-patterns.md for transactions example)

```typescript
// ShowOrchestrationService - Coordinates Show + MC + Platform
export class ShowOrchestrationService {
  async createShowWithAssignments(data: CreateShowDto): Promise<Show>;
}
```

**Key Rules**:

- ✅ Model services handle single entities
- ✅ Orchestration services handle cross-entity operations
- ✅ Use transactions in orchestration services
- ❌ Don't mix orchestration logic in model services

## Related Skills

- **eridu-repository-pattern.md** - Repository implementation
- **eridu-error-handling.md** - Error handling patterns
- **eridu-database-patterns.md** - Transactions and bulk operations
- **eridu-controller-pattern.md** - Service consumption in controllers

## Best Practices Checklist

- [ ] Extend `BaseModelService<T>`
- [ ] Define `UID_PREFIX` without trailing underscore
- [ ] Use `UtilityService.generateBrandedId()` for UID generation
- [ ] Always verify resource exists before update/delete
- [ ] Use `HttpError` utility for all errors
- [ ] Include resource name in error messages
- [ ] Never throw NestJS exceptions directly
- [ ] Keep model services focused on single entity
- [ ] Use orchestration services for multi-entity operations
