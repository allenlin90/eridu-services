---
name: Eridu Services - Code Quality & Best Practices Skill
description: Provides guidance for maintaining code quality, testing patterns, and avoiding anti-patterns.
---

# Instructions

## Pre-Submission Quality Checklist

**Before marking code as complete, verify all items**:

### General Code Quality

- [ ] `pnpm lint` passes (no ESLint rule disables)
- [ ] `pnpm test` passes (new features have tests)
- [ ] `pnpm build` succeeds (no TypeScript errors, no `any`/`unknown`)
- [ ] No `any`/`unknown` types used
- [ ] Proper HTTP status codes (201/204/404)
- [ ] Clear error messages for all error cases

### Architecture-Specific Checklists

**For Eridu Services, refer to pattern-specific skills**:

- **eridu-service-pattern.md** - Service implementation checklist
- **eridu-repository-pattern.md** - Repository implementation checklist
- **eridu-controller-pattern.md** - Controller implementation checklist
- **eridu-database-patterns.md** - Database query patterns checklist
- **eridu-authentication-authorization.md** - Auth/security checklist
- **eridu-data-validation.md** - Validation & serialization checklist

## Linting

**Never disable ESLint rules**:

```typescript
// ❌ WRONG: Disables rule
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = request.body;

// ✅ CORRECT: Fix the underlying issue
const data: CreateUserDto = request.body;  // Proper type
```

**Common Rule Violations**:

- `@typescript-eslint/no-explicit-any` - Use proper types
- `@typescript-eslint/no-unused-vars` - Remove unused code
- `no-console` - Use logger instead
- `no-nested-ternary` - Simplify conditionals
- `prefer-const` - Use const instead of let

**Command**:

```bash
pnpm lint                              # Check all files
pnpm lint -- --fix                     # Auto-fix issues
pnpm lint apps/erify_api/src/**        # Specific path
```

## Testing

**All new features require tests**:

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: MockUserRepository;

  beforeEach(async () => {
    repository = {
      findByUid: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    service = new UserService(
      repository as unknown as UserRepository,
      utilityService,
    );
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = { uid: 'user_123', email: 'test@example.com' };
      repository.findByUid.mockResolvedValue(user);

      const result = await service.getUserById('user_123');

      expect(result).toEqual(user);
      expect(repository.findByUid).toHaveBeenCalledWith('user_123');
    });

    it('should throw NotFound when user not found', async () => {
      repository.findByUid.mockResolvedValue(null);

      await expect(service.getUserById('user_123')).rejects.toThrow(
        expect.objectContaining({ statusCode: 404 }),
      );
    });
  });
});
```

**Test Coverage Goals**:

- ✅ Happy path (operation succeeds)
- ✅ Not found (resource doesn't exist)
- ✅ Invalid input (validation fails)
- ✅ Permissions (unauthorized access)
- ✅ Conflict (version mismatch, duplicates)

**Commands**:

```bash
pnpm test                              # Run all tests
pnpm test -- --watch                   # Watch mode
pnpm test -- --coverage                # Coverage report
```

## TypeScript Type Safety

**Strict mode enforced - no `any` or `unknown`**:

```typescript
// ❌ WRONG: Uses any
const data: any = request.body;

// ❌ WRONG: Uses unknown
const value: unknown = data.field;

// ✅ CORRECT: Proper types
const data: CreateUserDto = request.body;
const value: string = data.email;
```

**Type-Safe Database Queries**:

```typescript
// ❌ WRONG: Loose types
const users = await prisma.user.findMany({
  include: { any: true } as any,
});

// ✅ CORRECT: Type-safe Prisma types
const users = await prisma.user.findMany({
  where: { deletedAt: null },
  include: {
    studioMemberships: true,
  },
});
```

**Build Verification**:

```bash
pnpm build                             # Verify compilation
pnpm build --filter erify_api          # Specific app
```

## Anti-Patterns to Avoid

### 1. Exposing Database IDs

**❌ WRONG**:

```typescript
// URL exposes database id
GET /admin/users/12345

// Response includes both id and uid
{
  "id": 12345,
  "uid": "user_abc123",
  "email": "test@example.com"
}
```

**✅ CORRECT**:

```typescript
// URL uses UID
GET /admin/users/user_abc123

// Response maps uid to id, hides database id
{
  "id": "user_abc123",
  "email": "test@example.com"
}
```

### 2. N+1 Query Problem

**❌ WRONG**:

```typescript
const shows = await showRepository.findMany({});
for (const show of shows) {
  const client = await clientRepository.findOne({ id: show.clientId });
  // 1 query for shows + N queries for clients = N+1 total
}
```

**✅ CORRECT**:

```typescript
const shows = await showRepository.findMany({
  where: { deletedAt: null },
  include: { client: true },  // Single query with include
});
```

### 3. Missing Soft Delete Filter

**❌ WRONG**:

```typescript
const users = await prisma.user.findMany();  // Includes deleted!
const count = await prisma.user.count();     // Counts deleted too!
```

**✅ CORRECT**:

```typescript
const users = await prisma.user.findMany({
  where: { deletedAt: null },  // Only active
});
const count = await prisma.user.count({
  where: { deletedAt: null },
});
```

### 4. Throwing NestJS Exceptions in Services

**❌ WRONG**:

```typescript
throw new BadRequestException('Invalid input');
throw new NotFoundException('User not found');
throw new ForbiddenException('Access denied');
```

**✅ CORRECT**:

```typescript
throw HttpError.badRequest('Invalid input provided');
throw HttpError.notFound('User', uid);
throw HttpError.forbidden('Access denied');
```

### 5. Sequential Database Queries

**❌ WRONG**:

```typescript
const users = await userRepository.findMany({});
const count = await userRepository.count();  // Waits for first query
```

**✅ CORRECT**:

```typescript
const [users, count] = await Promise.all([
  userRepository.findMany({}),
  userRepository.count(),
]);
```

### 6. Looping for Database Operations

**❌ WRONG**:

```typescript
for (const show of shows) {
  await showRepository.create(show);  // N database calls
}
```

**✅ CORRECT**:

```typescript
await prisma.show.createMany({
  data: shows,  // Single bulk operation
});
```

### 7. Admin Service Layer

**❌ WRONG**:

```
AdminController → AdminUserService → UserService → Repository
```

**✅ CORRECT**:

```
AdminController → UserService → Repository
```

### 8. Using `any` or `unknown` Types

**❌ WRONG**:

```typescript
const data: any = request.body;
const value: unknown = getValue();
```

**✅ CORRECT**:

```typescript
const data: CreateUserDto = request.body;
const value: string = getValue();
```

### 9. Exposing Admin Service Layer

**❌ WRONG**:

```typescript
// admin/user/admin-user.module.ts
@Module({
  providers: [AdminUserService],  // Separate admin service
})
export class AdminUserModule {}
```

**✅ CORRECT**:

```typescript
// admin/user/admin-user.module.ts
@Module({
  imports: [UserModule],
  controllers: [AdminUserController],
})
export class AdminUserModule {}
// Controller directly uses UserService from UserModule
```

### 10. Manual ID Resolution

**❌ WRONG**:

```typescript
// Manually resolve UID to ID
const user = await userRepository.findByUid(uid);
const studio = await prisma.studio.create({
  data: {
    userId: user.id,  // Resolving manually
  }
});
```

**✅ CORRECT**:

```typescript
// Let Prisma handle UID resolution
const studio = await prisma.studio.create({
  data: {
    user: { connect: { uid } },  // Prisma handles UID → ID
  }
});
```

## Performance Optimization Guidelines

### Decision Tree

```
1. Creating/updating multiple records?
   → Use bulk operations: createMany, updateMany, deleteMany

2. Need related data?
   → Use include in initial query

3. Multiple independent queries?
   → Use Promise.all()

4. Dependent query?
   → Use sequential queries (rare)
```

### Common Optimizations

| Problem | Solution |
|---------|----------|
| N+1 queries | Use `include` for relations |
| Sequential queries | Use `Promise.all()` |
| Loop creates | Use `createMany()` |
| Loop updates | Use `updateMany()` |
| Deleted records | Always filter `deletedAt: null` |
| Large lists | Implement pagination |

## Related Skills

- **eridu-repository-pattern.md** - Repository implementation
- **eridu-service-pattern.md** - Service layer patterns
- **eridu-controller-pattern.md** - Controller patterns
- **eridu-database-patterns.md** - Database operation patterns

## Summary Checklist

Before submission, verify:

**Code Quality** (General):

- ✅ No `any`/`unknown` types
- ✅ No ESLint rule disables
- ✅ Proper TypeScript types
- ✅ Clean, readable code
- ✅ Tests for new features

**Functionality**:

- ✅ `pnpm lint` passes
- ✅ `pnpm test` passes
- ✅ `pnpm build` succeeds
- ✅ All features tested
- ✅ Clear error messages

**Architecture-Specific** (Framework/Domain Dependent):

For Eridu Services architecture patterns, refer to:
- **eridu-service-pattern.md** - Service layer patterns
- **eridu-repository-pattern.md** - Repository patterns
- **eridu-controller-pattern.md** - Controller patterns
- **eridu-database-patterns.md** - Database operation patterns
- **eridu-authentication-authorization.md** - Auth/security patterns
- **eridu-data-validation.md** - Validation patterns
- **eridu-design-patterns.md** - Design pattern practices
