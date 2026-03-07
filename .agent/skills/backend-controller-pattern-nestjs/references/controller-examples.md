# NestJS Controller Pattern Examples

This file contains detailed code examples for all controller types. Refer to the main SKILL.md for rules and best practices.

## Admin Controller Example

**File**: [admin-client.controller.ts](../../../../apps/erify_api/src/admin/clients/admin-client.controller.ts)

```typescript
import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { BaseAdminController } from '@/admin/base-admin.controller';
import { AdminResponse, AdminPaginatedResponse } from '@/admin/decorators/admin-response.decorator';
import { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';

@Controller('admin/users')
export class AdminUserController extends BaseAdminController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get()
  @AdminPaginatedResponse(UserDto, 'List users with pagination')
  async listUsers(@Query() query: PaginationQueryDto) {
    const [data, total] = await Promise.all([
      this.userService.listUsers(query),
      this.userService.countUsers(),
    ]);
    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(UserDto, HttpStatus.OK, 'Get user details')
  async getUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
  ) {
    const user = await this.userService.getUserById(id);
    this.ensureResourceExists(user, 'User', id);
    return user;
  }

  @Post()
  @AdminResponse(UserDto, HttpStatus.CREATED, 'Create user')
  async createUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT, 'Delete user')
  async deleteUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
  ) {
    await this.userService.deleteUser(id);
  }
}
```

---

## Studio Controller Example

**File**: [studio-task-template.controller.ts](../../../../apps/erify_api/src/studios/studio-task-template/studio-task-template.controller.ts)

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import {
  CreateStudioTaskTemplateDto,
  ListTaskTemplatesQueryDto,
  taskTemplateDto,
  UpdateStudioTaskTemplateDto,
} from '@/models/task-template/schemas/task-template.schema';
import { TaskTemplateService } from '@/models/task-template/task-template.service';

@StudioProtected([STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/task-templates')
export class StudioTaskTemplateController extends BaseStudioController {
  constructor(private readonly taskTemplateService: TaskTemplateService) {
    super();
  }

  @Get()
  @ZodPaginatedResponse(taskTemplateDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListTaskTemplatesQueryDto,
  ) {
    const { data, total } = await this.taskTemplateService.getTaskTemplates({
      skip: query.skip,
      take: query.take,
      name: query.name,
      uid: query.uid,
      includeDeleted: query.includeDeleted,
      studioUid: studioId,
      orderBy: query.sort ?? 'desc',
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @ZodResponse(taskTemplateDto)
  async show(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'TaskTemplate')) id: string,
  ) {
    const taskTemplate = await this.taskTemplateService.findOne({
      uid: id,
      studio: { uid: studioId },
      deletedAt: null,
    });

    if (!taskTemplate) {
      throw HttpError.notFound('Task template not found');
    }

    return taskTemplate;
  }

  @Post()
  @ZodResponse(taskTemplateDto, HttpStatus.CREATED)
  async create(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() createStudioTaskTemplateDto: CreateStudioTaskTemplateDto,
  ) {
    const { name, description, schema } = createStudioTaskTemplateDto;

    return this.taskTemplateService.createTemplateWithSnapshot({
      name,
      description,
      currentSchema: schema,
      studio: { connect: { uid: studioId } },
    });
  }

  @Patch(':id')
  @ZodResponse(taskTemplateDto)
  async update(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'TaskTemplate')) id: string,
    @Body() updateStudioTaskTemplateDto: UpdateStudioTaskTemplateDto,
  ) {
    const { name, description, schema, version } = updateStudioTaskTemplateDto;

    return this.taskTemplateService.updateTemplateWithSnapshot(
      { uid: id, version, studio: { uid: studioId } },
      {
        name,
        description,
        currentSchema: schema,
        version,
      },
    );
  }

  @Delete(':id')
  @ZodResponse(undefined, HttpStatus.NO_CONTENT)
  async delete(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskTemplateService.UID_PREFIX, 'TaskTemplate')) id: string,
  ) {
    await this.taskTemplateService.softDelete({ uid: id, studio: { uid: studioId }, deletedAt: null });
  }
}
```

---

## User (Me) Controller Example

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';
import { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';

@Controller('me/profile')
export class ProfileController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ZodResponse(ProfileResponseDto)
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    // Validate user context
    return this.userService.getUserById(user.id);
  }

  @Post()
  @ZodResponse(ProfileResponseDto)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateProfileDto
  ) {
    // ✅ ALWAYS use user.id from token, never from body/params for 'me' routes
    return this.userService.updateUser(user.id, body);
  }
}
```

---

## Backdoor Controller Example

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BaseBackdoorController } from '@/backdoor/base-backdoor.controller';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';

@Controller('backdoor/users')
export class BackdoorUserController extends BaseBackdoorController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get(':ext_id')
  @ZodResponse(UserDto)
  async getUserByExtId(@Param('ext_id') extId: string) {
    return this.userService.getUserByExtId(extId);
  }
}
```

---

## Integration Controller Example (Google Sheets)

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { BaseGoogleSheetsController } from '../base-google-sheets.controller';
import { ApiZodResponse } from '@/lib/openapi/decorators';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('google-sheets/schedules')
export class GoogleSheetsScheduleController extends BaseGoogleSheetsController {
  
  // Note: Google Sheets often uses explicit @ApiZodResponse + @ZodSerializerDto 
  // instead of a wrapper if specific description tuning is needed.
  @Get()
  @ApiZodResponse(createPaginatedResponseSchema(scheduleDto))
  @ZodSerializerDto(createPaginatedResponseSchema(scheduleDto))
  async getSchedules(@Query() query: ListSchedulesQueryDto) {
    const { schedules, total } = await this.scheduleService.getPaginatedSchedules(query);
    return this.createPaginatedResponse(schedules, total, query);
  }
}
```

---

## Common Mistakes

### ❌ Mistake 1: Passing DTOs directly to services

**Problem:**
```typescript
@Post()
async create(@Body() dto: CreateUserDto) {
  // ❌ Wrong: Passing DTO directly
  return this.userService.create(dto);
}
```

**✅ Correct:**
```typescript
@Post()
async create(@Body() dto: CreateUserDto, @Param('orgId') orgId: string) {
  // ✅ Right: Extract and translate
  const { name, email } = dto;
  return this.userService.create({
    name,
    email,
    org: { connect: { uid: orgId } }
  });
}
```

### ❌ Mistake 2: Not extending the correct base controller

**Problem:**
```typescript
// ❌ Wrong: Admin controller not extending BaseAdminController
@Controller('admin/users')
export class AdminUserController {
  // Missing @AdminProtected() and helper methods
}
```

**✅ Correct:**
```typescript
// ✅ Right: Extend the appropriate base
@Controller('admin/users')
export class AdminUserController extends BaseAdminController {
  constructor(private readonly userService: UserService) {
    super();
  }
}
```

### ❌ Mistake 3: Trusting user ID from request body in "me" endpoints

**Problem:**
```typescript
@Post('me/profile')
async updateProfile(@Body() body: { userId: string; name: string }) {
  // ❌ Wrong: Using userId from body
  return this.userService.updateUser(body.userId, { name: body.name });
}
```

**✅ Correct:**
```typescript
@Post('me/profile')
async updateProfile(
  @CurrentUser() user: AuthenticatedUser,
  @Body() body: { name: string }
) {
  // ✅ Right: Use user ID from token
  return this.userService.updateUser(user.id, { name: body.name });
}
```

### ❌ Mistake 4: Missing studio scoping in studio controllers

**Problem:**
```typescript
@Get(':id')
async show(@Param('id') id: string) {
  // ❌ Wrong: Not filtering by studio
  return this.taskTemplateService.findOne({ uid: id });
}
```

**✅ Correct:**
```typescript
@Get(':id')
async show(
  @Param('studioId') studioId: string,
  @Param('id') id: string
) {
  // ✅ Right: Filter by studio
  return this.taskTemplateService.findOne({
    uid: id,
    studio: { uid: studioId }
  });
}
```

### ❌ Mistake 5: Not using UidValidationPipe

**Problem:**
```typescript
@Get(':id')
async getUser(@Param('id') id: string) {
  // ❌ Wrong: No validation on UID format
  return this.userService.getUserById(id);
}
```

**✅ Correct:**
```typescript
@Get(':id')
async getUser(
  @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
  id: string
) {
  // ✅ Right: Validate UID format
  return this.userService.getUserById(id);
}
```
