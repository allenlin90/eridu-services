# Eridu Services - Design Patterns Skill

This skill provides comprehensive guidance for generating code that follows Eridu Services' established design patterns. Use this when creating new features, modules, or APIs.

## Core Principles

1. **Separation of Concerns**: Repository → Service → Controller layers with clear boundaries
2. **Simplified Admin Layer**: No separate admin services; admin controllers directly use domain services
3. **Type Safety**: Strict TypeScript, Zod for validation, no `any`/`unknown` types
4. **Branded UIDs**: Never expose database IDs; use prefixed UIDs (e.g., `user_abc123`)
5. **Monorepo Packaging**: Compile to `dist/`, expose via `package.json` exports, never relative imports to src/
6. **Data Consistency**: Prisma transactions for multi-entity operations, optimistic locking for concurrent updates
7. **Error Handling**: Always use `HttpError` utility in services; let Prisma handle repository errors
8. **Performance**: Bulk operations, Promise.all for parallel queries, includes for relations, never N+1 queries

## NestJS API Architecture

### Module Structure

**Pattern**: Feature-based modules with clear exports

```typescript
// entity/entity.module.ts
import { Module } from '@nestjs/common';
import { EntityService } from './entity.service';
import { EntityRepository } from './entity.repository';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [EntityService, EntityRepository],
  exports: [EntityService], // Export service for other modules
})
export class EntityModule {}

// admin/entity/admin-entity.module.ts
@Module({
  imports: [EntityModule],
  controllers: [AdminEntityController],
})
export class AdminEntityModule {}
```

### Repository Layer Pattern

**Extend `BaseRepository<T, C, U, W>`** where:
- `T` = Entity type (Prisma model)
- `C` = Create input type
- `U` = Update input type
- `W` = Where clause type

```typescript
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';

@Injectable()
export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new UserModelWrapper(prisma));
  }

  async findByUid(uid: string): Promise<User | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
    });
  }

  async findByExtId(extId: string): Promise<User | null> {
    return this.model.findFirst({
      where: { extId, deletedAt: null },
    });
  }
}

// Use findFirstOrThrow or findUniqueOrThrow in repositories
// Prisma throws P2025 automatically, converted to 404 by PrismaExceptionFilter
```

**Key Points**:

- ✅ Use `findFirstOrThrow()` and `findUniqueOrThrow()` for not-found errors
- ✅ Include `deletedAt: null` in all queries (soft delete pattern)
- ✅ Create specialized `findBy*` methods for common queries
- ❌ Never throw HTTP exceptions in repositories; let Prisma handle errors
- ❌ Never manually resolve UIDs to IDs; use Prisma's `connect: { uid }`

### Service Layer Pattern

**Base Model Services** extend `BaseModelService`:

```typescript
import { Injectable } from '@nestjs/common';
import { BaseModelService } from '@/common/services/base-model.service';
import { HttpError } from '@/common/errors/http-error.util';

@Injectable()
export class UserService extends BaseModelService<User> {
  static readonly UID_PREFIX = 'user'; // No trailing underscore

  constructor(
    private readonly userRepository: UserRepository,
    private readonly utilityService: UtilityService,
  ) {
    super();
  }

  async getUserById(uid: string): Promise<User> {
    const user = await this.userRepository.findByUid(uid);
    if (!user) {
      throw HttpError.notFound('User', uid);
    }
    return user;
  }

  async createUser(data: CreateUserDto): Promise<User> {
    // Use UtilityService to generate branded UID
    const user = await this.userRepository.create({
      uid: this.utilityService.generateBrandedId(UserService.UID_PREFIX),
      email: data.email,
      name: data.name,
      // ... other fields
    });
    return user;
  }

  async updateUser(uid: string, data: UpdateUserDto): Promise<User> {
    // Always verify resource exists
    const user = await this.getUserById(uid);
    if (!user) {
      throw HttpError.notFound('User', uid);
    }

    // Update and return
    return this.userRepository.update(
      { uid, deletedAt: null },
      { email: data.email, name: data.name },
    );
  }

  async deleteUser(uid: string): Promise<void> {
    const user = await this.getUserById(uid);
    await this.userRepository.softDelete({ uid, deletedAt: null });
  }
}
```

**Key Points**:

- ✅ Extend `BaseModelService` for common CRUD patterns
- ✅ Use `UtilityService.generateBrandedId(prefix)` for UID generation
- ✅ Always use `HttpError` utility for all error cases
- ✅ Verify resources exist before operations
- ✅ Use `softDelete()` method for deletes (preserves data)
- ✅ Leverage repository for all database operations
- ❌ Never throw NestJS exceptions directly
- ❌ Never expose database IDs

### Error Handling Pattern

**Always use `HttpError` utility in services**:

```typescript
import { HttpError } from '@/common/errors/http-error.util';

// Not found errors
if (!resource) {
  throw HttpError.notFound('Resource', identifier);
}

// Bad request errors
if (invalidInput) {
  throw HttpError.badRequest('Invalid input provided');
}

// Bad request with details (for validation errors)
if (!validationResult.isValid) {
  throw HttpError.badRequestWithDetails('Validation failed', {
    errors: validationResult.errors,
  });
}

// Conflict errors (optimistic locking, duplicates)
if (versionMismatch) {
  throw HttpError.conflict('Version mismatch. Expected X, but got Y');
}

// Other status codes
throw HttpError.unauthorized('Authentication required');
throw HttpError.forbidden('Access denied');
throw HttpError.unprocessableEntity('Invalid data format');
```

**Available Methods**:

- `HttpError.notFound(resource, identifier?)` → 404
- `HttpError.badRequest(message)` → 400
- `HttpError.badRequestWithDetails(message, details)` → 400 with details
- `HttpError.conflict(message)` → 409
- `HttpError.unauthorized(message)` → 401
- `HttpError.forbidden(message)` → 403
- `HttpError.unprocessableEntity(message)` → 422

### Controller Layer Pattern

**Admin Controllers** directly use domain services (no admin service layer):

```typescript
import { Controller, Post, Get, Patch, Delete, HttpCode, HttpStatus, Body, Param } from '@nestjs/common';
import { ZodSerializerDto } from '@/common/decorators/zod-serializer-dto.decorator';
import { AdminProtected } from '@/lib/decorators/admin-protected.decorator';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import { UserService } from '../../user/user.service';
import { UserDto, CreateUserDto, UpdateUserDto } from './dtos/user.dtos';

@Controller('admin/users')
@AdminProtected() // All endpoints require admin authorization
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(UserDto)
  async createUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(UserDto))
  async listUsers(@Query() query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const [data, count] = await Promise.all([
      this.userService.listUsers({ skip: (page - 1) * limit, take: limit }),
      this.userService.countUsers(),
    ]);
    return { data, meta: { page, limit, total: count } };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(UserDto)
  async getUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
  ) {
    return this.userService.getUserById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(UserDto)
  async updateUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
  ) {
    await this.userService.deleteUser(id);
  }
}
```

**Key Points**:

- ✅ Use `@ZodSerializerDto(Dto)` for response serialization
- ✅ Use proper HTTP status codes (201 for create, 204 for delete, 404 for not found)
- ✅ Use `UidValidationPipe` for path parameter ID validation
- ✅ Use `@AdminProtected()` decorator for write operations
- ✅ Use `@CurrentUser()` for authenticated user data
- ✅ Use `Promise.all()` for parallel queries (data + count)
- ✅ Implement pagination with `page`, `limit`, `offset`
- ❌ Never expose database IDs in URLs
- ❌ Never expose error details for sensitive operations

## Data Validation & Serialization

### Zod Schema Pattern

**Internal Schema** (matches Prisma model):

```typescript
export const userSchema = z.object({
  id: z.bigint(), // Internal only
  uid: z.string().startsWith('user_'),
  email: z.string().email(),
  name: z.string(),
  isSystemAdmin: z.boolean().default(false),
  isBanned: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
```

**Input Schema** (snake_case → camelCase transformation):

```typescript
export const createUserSchema = z.object({
  email: z.string().email().min(1),
  name: z.string().min(1),
}).transform((data) => ({
  email: data.email,
  name: data.name,
}));
```

**Output DTO Schema** (camelCase → snake_case, uid → id):

```typescript
// ✅ CORRECT: Maps uid to external id, hides database id
export const userDto = userSchema.transform((obj) => ({
  id: obj.uid, // Map UID to external 'id'
  email: obj.email,
  name: obj.name,
  is_system_admin: obj.isSystemAdmin,
  is_banned: obj.isBanned,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
  deleted_at: obj.deletedAt,
  // Database id NOT included
}));

export class UserDto extends createZodDto(userDto) {}
```

**Key Points**:

- ✅ Map `uid` to `id` in response DTOs
- ✅ Hide database `id` field completely
- ✅ Transform input: snake_case → camelCase
- ✅ Transform output: camelCase → snake_case
- ❌ Never expose database `id` field in DTOs
- ❌ Never use generic ID names without transformation

## ID Management Pattern

**External API Contract** (what clients see):

```typescript
// URL
GET /admin/users/:id  // id = uid (e.g., user_abc123)

// Response
{
  "id": "user_abc123",    // UID mapped as id
  "email": "user@example.com",
  "name": "John Doe",
  // No "uid" field exposed
  // No database "id" field exposed
}
```

**Internal Implementation**:

```typescript
// Database
{
  id: 12345,              // bigint primary key (never exposed)
  uid: "user_abc123",     // Branded UID for external communication
  email: "user@example.com",
  // ...
}

// Prisma operations use uid
await prisma.user.findUnique({ where: { uid: "user_abc123" } });

// Connect via uid
await prisma.studio.create({
  data: {
    user: { connect: { uid: "user_abc123" } }, // Not id!
  }
});
```

## Authentication & Authorization Pattern

### JWT Authentication

**Global Guard** (via `@eridu/auth-sdk`):

```typescript
@Controller('me/shows')
export class ShowsController {
  @Get()
  async getShows(@CurrentUser() user: AuthenticatedUser) {
    // JWT authentication is automatic (global guard)
    // user contains: ext_id, id, name, email, image, payload
    return this.showsService.getShowsByMcUser(user.ext_id);
  }
}
```

### Admin Authorization

**Global Opt-in** via `@AdminProtected()` decorator:

```typescript
@Controller('admin/users')
@AdminProtected() // All endpoints require admin access
export class AdminUserController {
  // Each endpoint automatically checks admin role
}

// Or on individual routes
@Post()
@AdminProtected()
async createUser(@Body() body: CreateUserDto) {
  // Only admin users can create
}
```

### Service-to-Service API Keys

**Decorator-based** for Google Sheets and Backdoor endpoints:

```typescript
import { GoogleSheets } from '@/lib/decorators/google-sheets.decorator';

@Controller('google-sheets/schedules')
@GoogleSheets() // API key authentication
export class GoogleSheetsScheduleController {
  @Post()
  async createSchedule(@Request() req, @Body() data: unknown) {
    // req.service.serviceName === 'google-sheets'
  }
}
```

## Prisma & Database Pattern

### Soft Delete Pattern

**Always include `deletedAt: null` in queries**:

```typescript
// Correct: Only active records
const users = await prisma.user.findMany({
  where: { deletedAt: null },
});

// Correct: Soft delete
await prisma.user.update({
  where: { uid },
  data: { deletedAt: new Date() },
});

// Correct: Include deleted if needed
const users = await prisma.user.findMany({
  where: { deletedAt: { not: null } },
});
```

### Transaction Pattern

**For multi-entity operations**:

```typescript
const result = await this.prisma.$transaction(async (tx) => {
  // Create user
  const user = await tx.user.create({
    data: { uid: 'user_123', email: 'test@example.com', name: 'Test' },
  });

  // Create membership
  const membership = await tx.studioMembership.create({
    data: {
      uid: 'smb_456',
      userId: user.id,
      studioId: studioId,
      role: 'admin',
    },
  });

  return { user, membership };
});
// Automatic rollback if any operation fails
```

### Include Pattern (Prevent N+1 Queries)

**Always load relations efficiently**:

```typescript
// ❌ WRONG: N+1 queries
const shows = await this.showRepository.findMany({});
for (const show of shows) {
  const client = await this.clientRepository.findOne({ id: show.clientId });
}

// ✅ CORRECT: Single query with include
const shows = await this.showRepository.findMany({
  where: { deletedAt: null },
  include: {
    client: true,
    studioRoom: true,
    showMCs: { include: { mc: true } },
    showPlatforms: { include: { platform: true } },
  },
});
```

### Bulk Operations Pattern

**Never loop for creates/updates**:

```typescript
// ❌ WRONG: Multiple database calls
for (const show of shows) {
  await this.showRepository.create(show);
}

// ✅ CORRECT: Bulk operation
await this.prisma.show.createMany({
  data: shows,
  skipDuplicates: true,
});
```

### Promise.all Pattern

**Parallel independent queries**:

```typescript
// ❌ WRONG: Sequential queries
const users = await this.userRepository.findMany({});
const count = await this.userRepository.count();

// ✅ CORRECT: Parallel queries
const [users, count] = await Promise.all([
  this.userRepository.findMany({}),
  this.userRepository.count(),
]);
```

## Performance Guidelines

### Decision Rules

1. **Bulk operations** → Use `createMany`/`updateMany`/`deleteMany`
2. **Related data** → Use `include` in initial query
3. **Independent queries** → Use `Promise.all()`
4. **Sequential dependencies** → Loop (rare)
5. **Count + data** → Use `Promise.all([findMany, count])`

### Query Optimization Checklist

- ✅ Use `include` for all needed relations
- ✅ Use `Promise.all()` for parallel independent queries
- ✅ Use bulk operations instead of loops
- ✅ Use pagination for large datasets
- ✅ Use proper indexing in database schema
- ✅ Add `deletedAt: null` to all queries
- ❌ Never fetch all data then filter in application
- ❌ Never loop for database operations
- ❌ Never make N separate queries when 1 with include works

## Testing Pattern

### Unit Test Template

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

## Code Quality Checklist

Before marking code as complete:

- [ ] `pnpm lint` passes (no ESLint rule disables)
- [ ] `pnpm test` passes (new features have tests)
- [ ] `pnpm build` succeeds (no TypeScript errors, no `any`/`unknown`)
- [ ] No database IDs exposed in APIs
- [ ] All services use `HttpError` utility
- [ ] All repositories include `deletedAt: null`
- [ ] All lists use pagination
- [ ] All dependent queries use `Promise.all()`
- [ ] Proper HTTP status codes (201/204/404)
- [ ] `@AdminProtected()` on write operations
- [ ] `UidValidationPipe` on path parameters
- [ ] `@ZodSerializerDto()` on endpoints

## Anti-Patterns to Avoid

### ❌ Expose Database IDs

```typescript
// WRONG
GET /admin/users/:id  // id = 12345 (database id)
{ "id": 12345, "uid": "user_abc123" }

// CORRECT
GET /admin/users/:id  // id = user_abc123 (uid)
{ "id": "user_abc123", "email": "test@example.com" }
```

### ❌ N+1 Queries

```typescript
// WRONG
const shows = await showRepository.findMany({});
for (const show of shows) {
  const client = await clientRepository.findOne({ id: show.clientId });
}

// CORRECT
const shows = await showRepository.findMany({
  include: { client: true },
});
```

### ❌ Missing Soft Delete Filter

```typescript
// WRONG
const users = await prisma.user.findMany();  // Includes deleted users

// CORRECT
const users = await prisma.user.findMany({
  where: { deletedAt: null },
});
```

### ❌ Throw NestJS Exceptions in Services

```typescript
// WRONG
throw new BadRequestException('Invalid input');

// CORRECT
throw HttpError.badRequest('Invalid input provided');
```

### ❌ Expose Admin Service Layer

```typescript
// WRONG
AdminController → AdminUserService → UserService → Repository

// CORRECT
AdminController → UserService → Repository
```

### ❌ Using `any` or `unknown` Types

```typescript
// WRONG
const data: any = request.body;

// CORRECT
const data: CreateUserDto = request.body; // Zod validates
```

## Orchestration Pattern (Complex Operations)

**For cross-module coordination**:

```typescript
// Use orchestration service that depends on multiple domain services
@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly mcService: McService,
    private readonly platformService: PlatformService,
    private readonly showMcService: ShowMcService,
    private readonly showPlatformService: ShowPlatformService,
    private readonly prisma: PrismaService,
  ) {}

  async createShowWithAssignments(
    data: CreateShowWithAssignmentsDto,
  ): Promise<ShowWithRelations> {
    // Use Prisma nested creates for atomicity
    const show = await this.prisma.show.create({
      data: {
        uid: this.utilityService.generateBrandedId('show'),
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        client: { connect: { uid: data.clientUid } },
        showType: { connect: { uid: data.showTypeUid } },
        showStatus: { connect: { uid: data.showStatusUid } },
        showStandard: { connect: { uid: data.showStandardUid } },
        showMCs: {
          create: data.mcUids.map((mcUid) => ({
            uid: this.utilityService.generateBrandedId('show_mc'),
            mc: { connect: { uid: mcUid } },
          })),
        },
        showPlatforms: {
          create: data.platformUids.map((platformUid) => ({
            uid: this.utilityService.generateBrandedId('show_plt'),
            platform: { connect: { uid: platformUid } },
          })),
        },
      },
      include: { /* all relations */ },
    });

    return show;
  }
}
```

## References

- **Architecture**: See [ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- **Authentication**: See [AUTHENTICATION_GUIDE.md](../docs/AUTHENTICATION_GUIDE.md)
- **Server-to-Server Auth**: See [SERVER_TO_SERVER_AUTH.md](../docs/SERVER_TO_SERVER_AUTH.md)
- **Business Domain**: See [BUSINESS.md](../docs/BUSINESS.md)
- **Implementation Phases**: See [PHASE_1.md](../docs/roadmap/PHASE_1.md)
- **API Types Package**: `@eridu/api-types` for shared schemas and constants
