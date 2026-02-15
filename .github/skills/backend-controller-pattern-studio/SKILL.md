---
name: backend-controller-pattern-studio
description: Provides NestJS Controller patterns for Studio-scoped endpoints. This skill should be used when building controllers that operate within a studio context, requiring studio-level scoping and authorization.
---

# Studio Controller Pattern (NestJS)

Patterns for building **Studio-scoped** controllers in `erify_api`. These controllers operate on resources that belong to a specific studio.

## Core Principles

1. **Inheritance**: Extend `BaseStudioController`
2. **Path Structure**: `studios/:studioId/resource`
3. **Studio Scoping**: All queries filter by studio context
4. **Response Wrapper**: Use `@ZodResponse()` and `@ZodPaginatedResponse()`

## Authorization

`BaseStudioController` automatically requires studio membership via `@StudioProtected()`.

**Add role restrictions** at class or method level:

```typescript
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';

// All endpoints require ADMIN
@StudioProtected([STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/task-templates')
export class StudioTaskTemplateController extends BaseStudioController { }

// Mixed: default membership, admin for delete
@Controller('studios/:studioId/resource')
export class ResourceController extends BaseStudioController {
  @Get() list() { } // Any member
  
  @StudioProtected([STUDIO_ROLE.ADMIN])
  @Delete(':id') delete() { } // Admin only
}
```

**Available roles**: `STUDIO_ROLE.ADMIN`, `STUDIO_ROLE.MEMBER`

## Complete Example

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

## Quick Reference

| Pattern | Code |
|---------|------|
| **Studio scoping** | `studioUid: studioId` (list), `studio: { uid: studioId }` (findOne/update/delete) |
| **UID validation** | `@Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))` |
| **Studio relation** | `studio: { connect: { uid: studioId } }` (create) |
| **DTO extraction** | `const { name, description } = dto;` then pass to service |

## Checklist

- [ ] Extends `BaseStudioController`
- [ ] Route: `studios/:studioId/resource`
- [ ] Authorization: `@StudioProtected([roles])` if role restrictions needed
- [ ] UID validation on `studioId` and resource `id`
- [ ] Studio scoping in all queries
- [ ] Create operations connect studio relation
