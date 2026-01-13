# Eridu Services - Controller Pattern Skill

Provides guidance for implementing controller layers in Eridu Services.

## Admin Controller Structure

**Pattern**: Direct domain service usage (no admin service layer)

```typescript
import { Controller, Post, Get, Patch, Delete, HttpCode, HttpStatus, Body, Param, Query } from '@nestjs/common';
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

## HTTP Status Codes

**Standard REST conventions**:

| Operation | Method | Status | Example |
|-----------|--------|--------|---------|
| Create    | POST   | 201    | @HttpCode(HttpStatus.CREATED) |
| Read      | GET    | 200    | @HttpCode(HttpStatus.OK) |
| Update    | PATCH  | 200    | @HttpCode(HttpStatus.OK) |
| Delete    | DELETE | 204    | @HttpCode(HttpStatus.NO_CONTENT) |
| Not Found | ANY    | 404    | Handled by service layer |
| Bad Request | ANY  | 400    | Handled by service layer |

## Decorators & Validation

### Authorization Decorators

**Admin Protection** (all endpoints):

```typescript
@Controller('admin/users')
@AdminProtected() // All endpoints require admin
export class AdminUserController { ... }
```

**Admin Protection** (individual routes):

```typescript
@Post()
@AdminProtected()
async createUser(@Body() body: CreateUserDto) { ... }
```

### Validation Decorators

**Response Serialization**:

```typescript
@Get(':id')
@ZodSerializerDto(UserDto) // Transform response via Zod schema
async getUser(@Param('id') id: string) { ... }
```

**Pagination Response**:

```typescript
@Get()
@ZodSerializerDto(createPaginatedResponseSchema(UserDto))
async listUsers(@Query() query: PaginationQueryDto) { ... }
```

### Path Parameter Validation

**Always use `UidValidationPipe`**:

```typescript
@Get(':id')
async getUser(
  @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
  id: string,
) {
  return this.userService.getUserById(id);
}
```

**Usage Rules**:

- ✅ Use `UidValidationPipe` for all `:id` path parameters
- ✅ Pass service's `UID_PREFIX` constant
- ✅ Pass human-readable model name (for error messages)
- ❌ Never skip validation on path parameters

## Authenticated User Access

```typescript
@Controller('me/shows')
export class ShowsController {
  @Get()
  async getShows(@CurrentUser() user: AuthenticatedUser) {
    // user contains: ext_id, id, name, email, image, payload
    return this.showsService.getShowsByMcUser(user.ext_id);
  }
}
```

**Key Points**:

- ✅ JWT authentication is automatic (global guard)
- ✅ Use `@CurrentUser()` to access user data
- ✅ Use `user.ext_id` for database lookups

## Pagination

**Always implement pagination for list endpoints**:

```typescript
@Get()
@ZodSerializerDto(createPaginatedResponseSchema(UserDto))
async listUsers(@Query() query: PaginationQueryDto) {
  const { page = 1, limit = 10 } = query;

  // Use Promise.all for parallel queries
  const [data, count] = await Promise.all([
    this.userService.listUsers({
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.userService.countUsers(),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total: count,
    },
  };
}
```

**Key Rules**:

- ✅ Use `Promise.all()` for data + count queries
- ✅ Provide default page (1) and limit (10)
- ✅ Calculate skip: `(page - 1) * limit`
- ✅ Return metadata with total count

## Error Response Handling

**Errors are handled by global exception filters** - services throw, filters handle:

```typescript
// Service throws
throw HttpError.notFound('User', uid);

// Global filter converts to HTTP response
{
  "statusCode": 404,
  "message": "User not found: uid",
  "error": "Not Found"
}
```

## User-Scoped Endpoint Pattern

```typescript
@Controller('me')
export class ProfileController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(UserDto)
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    // Return authenticated user's data
    return this.userService.getUserById(user.ext_id);
  }
}
```

**Key Rules**:

- ✅ No `@AdminProtected()` decorator (JWT auth is automatic)
- ✅ Use `@CurrentUser()` to get authenticated user
- ✅ Validate user can only access their own data
- ❌ Never use `@AdminProtected()` on user-scoped endpoints

## Service-to-Service Endpoints

```typescript
import { GoogleSheets } from '@/lib/decorators/google-sheets.decorator';

@Controller('google-sheets/schedules')
@GoogleSheets() // API key authentication
export class GoogleSheetsScheduleController {
  @Post()
  async createSchedule(@Request() req, @Body() data: CreateScheduleDto) {
    // req.service.serviceName === 'google-sheets'
    return this.scheduleService.createSchedule(data);
  }
}
```

**Key Rules**:

- ✅ Use `@GoogleSheets()` or `@Backdoor()` decorator
- ✅ Skip `@AdminProtected()` (decorator replaces auth)
- ✅ Extend appropriate base controller if available

## Related Skills

- **eridu-service-pattern.md** - Services called by controllers
- **eridu-data-validation.md** - DTOs and Zod schemas
- **eridu-authentication-authorization.md** - Guards and decorators
- **eridu-database-patterns.md** - Querying patterns

## Best Practices Checklist

- [ ] Use appropriate HTTP status codes (201/204/404)
- [ ] Use `@ZodSerializerDto()` on all endpoints
- [ ] Use `UidValidationPipe` on `:id` parameters
- [ ] Use `@AdminProtected()` on write operations
- [ ] Use `Promise.all()` for parallel queries (data + count)
- [ ] Implement pagination with proper defaults
- [ ] Use `@CurrentUser()` for authenticated users
- [ ] No separate admin service layer
- [ ] Controllers directly call domain services
- [ ] All errors handled by global filters
