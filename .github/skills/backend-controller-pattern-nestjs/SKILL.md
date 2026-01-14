---
name: backend-controller-pattern-nestjs
description: Provides NestJS-specific controller implementation patterns for erify_api. Use when building REST endpoints with NestJS decorators, guards, pipes, and serializers. Includes examples for admin protection, pagination, error handling, and service-to-service authentication.
---

# Backend Controller Pattern - NestJS Implementation

NestJS-specific implementation patterns for controllers. For general principles, see **backend-controller-pattern/SKILL.md**.

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

## NestJS Decorators

### Authorization Decorators

**Admin Protection** (all endpoints in controller):

```typescript
@Controller('admin/users')
@AdminProtected() // All endpoints require admin
export class AdminUserController { ... }
```

**Admin Protection** (specific route):

```typescript
@Post()
@AdminProtected()
async createUser(@Body() body: CreateUserDto) { ... }
```

### Response Serialization

**Single response**:

```typescript
@Get(':id')
@ZodSerializerDto(UserDto) // Transform response via Zod schema
async getUser(@Param('id') id: string) { ... }
```

**Paginated response**:

```typescript
@Get()
@ZodSerializerDto(createPaginatedResponseSchema(UserDto))
async listUsers(@Query() query: PaginationQueryDto) { ... }
```

### HTTP Status Codes

**Use NestJS HttpStatus enum**:

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)  // 201
async create() { ... }

@Get()
@HttpCode(HttpStatus.OK)       // 200
async list() { ... }

@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT) // 204
async delete() { ... }
```

## Pipes and Validation

### UidValidationPipe

**Always use for `:id` path parameters**:

```typescript
@Get(':id')
async getUser(
  @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
  id: string,
) {
  return this.userService.getUserById(id);
}

@Patch(':id')
async updateUser(
  @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
  id: string,
  @Body() body: UpdateUserDto,
) {
  return this.userService.updateUser(id, body);
}
```

**Rules**:
- ✅ Use for all `:id` path parameters
- ✅ Pass service's `UID_PREFIX` constant
- ✅ Pass human-readable model name
- ❌ Never skip validation on path parameters

**Error Example**:

```json
{
  "statusCode": 400,
  "message": "Invalid User ID",
  "error": "BadRequest"
}
```

## Authenticated User Access

**User-scoped endpoints** (JWT authentication automatic):

```typescript
import { CurrentUser } from '@/lib/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/lib/types/authenticated-user.type';

@Controller('me/shows')
export class ShowsController {
  @Get()
  async getShows(@CurrentUser() user: AuthenticatedUser) {
    // user contains: ext_id, id, name, email, image, payload
    return this.showsService.getShowsByMcUser(user.ext_id);
  }

  @Get(':show_id')
  async getShow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('show_id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    showId: string,
  ) {
    return this.showsService.getShowForMcUser(user.ext_id, showId);
  }
}
```

**Key Points**:
- ✅ JWT authentication is automatic (global guard)
- ✅ Use `@CurrentUser()` to access user data
- ✅ Use `user.ext_id` for database lookups
- ✅ No `@AdminProtected()` decorator needed
- ❌ Never use `@AdminProtected()` on `/me` endpoints

## Pagination Implementation

**Complete pagination example**:

```typescript
@Get()
@HttpCode(HttpStatus.OK)
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

**Query Parameter DTO**:

```typescript
export class PaginationQueryDto {
  @Type(() => Number)
  page?: number = 1;

  @Type(() => Number)
  limit?: number = 10;
}
```

**Key Rules**:
- ✅ Use `Promise.all()` for data + count queries
- ✅ Provide default page (1) and limit (10)
- ✅ Calculate skip: `(page - 1) * limit`
- ✅ Return metadata with total count
- ❌ Never query count separately after data

## Error Handling

**Global exception filters handle errors** - services throw, filters respond:

```typescript
// Service layer throws
throw HttpError.notFound('User', uid);

// Global filter converts to HTTP response
{
  "statusCode": 404,
  "message": "User not found: uid",
  "error": "Not Found"
}
```

**Never throw NestJS exceptions directly in services**:

```typescript
// ❌ WRONG: Direct NestJS exception
throw new BadRequestException('Invalid input');
throw new NotFoundException('User not found');

// ✅ CORRECT: Use HttpError utility
throw HttpError.badRequest('Invalid input provided');
throw HttpError.notFound('User', uid);
```

## Service-to-Service Endpoints

**Google Sheets integration**:

```typescript
import { GoogleSheets } from '@/lib/decorators/google-sheets.decorator';

@Controller('google-sheets/schedules')
@GoogleSheets() // API key authentication
export class GoogleSheetsScheduleController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(ScheduleDto)
  async createSchedule(@Request() req, @Body() data: CreateScheduleDto) {
    // req.service.serviceName === 'google-sheets'
    return this.scheduleService.createSchedule(data);
  }
}
```

**Backdoor endpoints**:

```typescript
import { Backdoor } from '@/lib/decorators/backdoor.decorator';
import { BaseBackdoorController } from '@/backdoor/base-backdoor.controller';

@Controller('backdoor/users')
@Backdoor() // API key authentication
export class BackdoorUserController extends BaseBackdoorController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(UserDto)
  async createUser(@Body() body: CreateUserDto) {
    // req.service.serviceName === 'backdoor'
    return this.userService.createUser(body);
  }
}
```

**Rules**:
- ✅ Use `@GoogleSheets()` or `@Backdoor()` decorator
- ✅ Skip `@AdminProtected()` (decorator replaces auth)
- ✅ Extend base controller if available
- ❌ Never mix decorators (choose one auth mechanism)

## NestJS DTOs and Schemas

**Create DTO** (input validation):

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  is_banned: z.boolean().optional(),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
```

**Response DTO** (output serialization):

```typescript
export const userSchema = z.object({
  id: z.string(),        // uid mapped to id
  email: z.string(),
  name: z.string(),
  is_banned: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
});

export class UserDto extends createZodDto(userSchema) {}
```

**Pagination schema**:

```typescript
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
) {
  return z.object({
    data: z.array(itemSchema),
    meta: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
    }),
  });
}
```

## Module Registration

**Controller in module**:

```typescript
import { Module } from '@nestjs/common';
import { AdminUserController } from './admin-user.controller';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [AdminUserController],
})
export class AdminUserModule {}
```

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
- [ ] Use `HttpError` utility in services
- [ ] All errors handled by global filters
- [ ] Never expose database IDs in API

## Related Skills

- **backend-controller-pattern/SKILL.md** - General controller principles
- **service-pattern/SKILL.md** - Service layer design
- **data-validation/SKILL.md** - DTO and Zod patterns
- **authentication-authorization-backend/SKILL.md** - Auth implementation
