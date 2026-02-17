# The Ideal Model Pattern

**Based on analysis of task model (best service) + studio-membership model (best schema)**

## File Structure

```
/models/{domain}
  /{domain}.module.ts       - NestJS module
  /{domain}.controller.ts   - REST endpoints
  /{domain}.service.ts      - Business logic
  /{domain}.repository.ts   - Data access
  /schemas
    /{domain}.schema.ts     - Zod schemas + types
    index.ts                - Re-exports
```

## 1. Schema Layer Pattern

**File**: `schemas/{domain}.schema.ts`

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import type { Prisma } from '@prisma/client';
import { apiResponseSchema } from '@eridu/api-types/{domain}';

// ============================================================================
// INTERNAL SCHEMAS (for service layer)
// ============================================================================

// Service Payload Types - abstraction from Prisma
export type CreateDomainPayload = Omit<Prisma.DomainCreateInput, 'uid'> & {
  uid?: string;
};

export type UpdateDomainPayload = Prisma.DomainUpdateInput;

export type DomainFilters = {
  includeDeleted?: boolean;
  searchTerm?: string;
  // ... domain-specific filters (NOT Prisma types)
};

// Internal domain schema (for validation)
const domainInternalSchema = z.object({
  id: z.bigint(),
  uid: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// Assert helper for runtime validation
export function assertDomainSchema(data: unknown): asserts data is Domain {
  const result = domainInternalSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid domain data: ${result.error.message}`);
  }
}

// ============================================================================
// API DTOs (for controller layer)
// ============================================================================

// Input validation schemas
const createDomainSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  // snake_case for API compatibility
});

const updateDomainSchema = createDomainSchema.partial();

const listDomainsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  include_deleted: z.coerce.boolean().default(false),
});

// DTOs (used in controllers)
export class CreateDomainDto extends createZodDto(createDomainSchema) {}
export class UpdateDomainDto extends createZodDto(updateDomainSchema) {}
export class ListDomainsQueryDto extends createZodDto(listDomainsQuerySchema) {}

// ============================================================================
// API RESPONSE TRANSFORMATIONS
// ============================================================================

// Transform internal domain to API response
export const domainDto = domainInternalSchema
  .pick({
    uid: true,
    name: true,
    createdAt: true,
    updatedAt: true,
  })
  .transform((obj) => ({
    id: obj.uid,
    name: obj.name,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(apiResponseSchema); // Validate against shared API schema

// With relations (for detailed endpoints)
export const domainWithRelationsDto = domainInternalSchema
  .pick({
    uid: true,
    name: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    relatedEntity: z.object({
      uid: z.string(),
      name: z.string(),
    }).nullable(),
  })
  .transform((obj) => ({
    id: obj.uid,
    name: obj.name,
    related_entity: obj.relatedEntity ? {
      id: obj.relatedEntity.uid,
      name: obj.relatedEntity.name,
    } : null,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(apiResponseWithRelationsSchema);
```

## 2. Service Layer Pattern

**File**: `{domain}.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Domain } from '@prisma/client';  // ONLY the entity type
import { DomainRepository } from './{domain}.repository';
import {
  CreateDomainDto,
  UpdateDomainDto,
  ListDomainsQueryDto,
  CreateDomainPayload,
  UpdateDomainPayload,
  DomainFilters,
} from './schemas/{domain}.schema';

@Injectable()
export class DomainService extends BaseModelService {
  static readonly UID_PREFIX = 'domain';

  constructor(private readonly domainRepository: DomainRepository) {
    super();
  }

  // ============================================================================
  // CORE CRUD (using payload types, NOT Prisma types)
  // ============================================================================

  async create(payload: CreateDomainPayload): Promise<Domain> {
    return this.domainRepository.create({
      ...payload,
      uid: payload.uid ?? this.generateUid(),
    });
  }

  async update(uid: string, payload: UpdateDomainPayload): Promise<Domain> {
    const domain = await this.findByUid(uid);
    return this.domainRepository.update({ id: domain.id }, payload);
  }

  async findByUid(uid: string): Promise<Domain> {
    const domain = await this.domainRepository.findUnique({ uid });
    if (!domain) {
      throw new NotFoundException(`Domain with uid ${uid} not found`);
    }
    return domain;
  }

  async findAll(filters: DomainFilters): Promise<Domain[]> {
    // Transform domain filters to repository params
    return this.domainRepository.findManyByFilters(filters);
  }

  async softDelete(uid: string): Promise<Domain> {
    const domain = await this.findByUid(uid);
    return this.domainRepository.update(
      { id: domain.id },
      { deletedAt: new Date() },
    );
  }

  // ============================================================================
  // DTO TRANSFORMATIONS (controller → service)
  // ============================================================================

  async createFromDto(dto: CreateDomainDto): Promise<Domain> {
    // Transform DTO to payload in service layer
    const payload: CreateDomainPayload = {
      name: dto.name,
      description: dto.description ?? null,
      // ... other transformations
    };
    return this.create(payload);
  }

  async updateFromDto(uid: string, dto: UpdateDomainDto): Promise<Domain> {
    const payload: UpdateDomainPayload = {
      name: dto.name,
      description: dto.description,
      // ... other transformations
    };
    return this.update(uid, payload);
  }

  async listFromQuery(query: ListDomainsQueryDto): Promise<{
    items: Domain[];
    total: number;
  }> {
    const filters: DomainFilters = {
      includeDeleted: query.include_deleted,
      searchTerm: query.search,
    };

    const skip = (query.page - 1) * query.per_page;
    const take = query.per_page;

    const [items, total] = await Promise.all([
      this.domainRepository.findMany({ skip, take, filters }),
      this.domainRepository.count(filters),
    ]);

    return { items, total };
  }

  // ============================================================================
  // PRIVATE HELPERS (keep service logic organized)
  // ============================================================================

  private generateUid(): string {
    return this.baseGenerateUid(DomainService.UID_PREFIX);
  }
}
```

## 3. Repository Layer Pattern

**File**: `{domain}.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { BaseRepository, IBaseModel } from '@/lib/repository/base-repository';
import type { DomainFilters } from './schemas/{domain}.schema';

// Model wrapper (encapsulates Prisma delegate)
class DomainModelWrapper implements IBaseModel<...> {
  constructor(private readonly prismaModel: Prisma.DomainDelegate) {}

  create(args: any) {
    return this.prismaModel.create(args);
  }

  findUnique(args: any) {
    return this.prismaModel.findUnique(args);
  }

  findFirst(args: any) {
    return this.prismaModel.findFirst(args);
  }

  findMany(args: any) {
    return this.prismaModel.findMany(args);
  }

  update(args: any) {
    return this.prismaModel.update(args);
  }

  delete(args: any) {
    return this.prismaModel.delete(args);
  }

  count(args: any) {
    return this.prismaModel.count(args);
  }
}

@Injectable()
export class DomainRepository extends BaseRepository<...> {
  constructor(private readonly prisma: PrismaService) {
    super(new DomainModelWrapper(prisma.domain));
  }

  // ============================================================================
  // DOMAIN-SPECIFIC QUERIES (Prisma queries belong HERE, not in service)
  // ============================================================================

  async findManyByFilters(filters: DomainFilters) {
    const where = this.buildWhereClause(filters);
    return this.findMany({ where });
  }

  async count(filters: DomainFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.count({ where });
  }

  // ============================================================================
  // PRIVATE QUERY BUILDERS (Prisma-specific logic encapsulated)
  // ============================================================================

  private buildWhereClause(filters: DomainFilters): Prisma.DomainWhereInput {
    const where: Prisma.DomainWhereInput = {};

    if (!filters.includeDeleted) {
      where.deletedAt = null;
    }

    if (filters.searchTerm) {
      where.OR = [
        { name: { contains: filters.searchTerm, mode: 'insensitive' } },
        { description: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
```

## 4. Controller Layer Pattern

**File**: `{domain}.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DomainService } from './{domain}.service';
import { CurrentUser } from '@/lib/auth/current-user.decorator';
import { AuthenticatedUser } from '@/lib/auth/types';
import {
  CreateDomainDto,
  UpdateDomainDto,
  ListDomainsQueryDto,
  domainDto,
  domainWithRelationsDto,
} from './schemas/{domain}.schema';

@Controller('domains')
@ApiTags('domains')
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new domain' })
  async create(
    @Body() dto: CreateDomainDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const domain = await this.domainService.createFromDto(dto);
    return domainDto.parse(domain);
  }

  @Get()
  @ApiOperation({ summary: 'List all domains' })
  async findAll(@Query() query: ListDomainsQueryDto) {
    const { items, total } = await this.domainService.listFromQuery(query);

    return {
      data: items.map((item) => domainDto.parse(item)),
      meta: {
        total,
        page: query.page,
        per_page: query.per_page,
        total_pages: Math.ceil(total / query.per_page),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get domain by id' })
  async findOne(@Param('id') uid: string) {
    const domain = await this.domainService.findByUid(uid);
    return domainWithRelationsDto.parse(domain);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update domain' })
  async update(
    @Param('id') uid: string,
    @Body() dto: UpdateDomainDto,
  ) {
    const domain = await this.domainService.updateFromDto(uid, dto);
    return domainDto.parse(domain);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete domain' })
  async remove(@Param('id') uid: string) {
    const domain = await this.domainService.softDelete(uid);
    return domainDto.parse(domain);
  }
}
```

## Key Principles

### ✅ DO:

1. **Schema Layer**:
   - Define payload types (`CreatePayload`, `UpdatePayload`)
   - Define domain filter types (NOT Prisma types)
   - Separate internal schemas from API DTOs
   - Add assert helpers for validation
   - Transform internal → API with `.pipe()` validation

2. **Service Layer**:
   - Import ONLY entity type from Prisma (`Domain`)
   - Use payload types in method signatures
   - Transform DTOs to payloads in service
   - Keep business logic here
   - Call repository for data access

3. **Repository Layer**:
   - Encapsulate ALL Prisma queries here
   - Build Prisma where clauses here
   - Accept domain filter types, return entities

4. **Controller Layer**:
   - Use DTOs for input validation
   - Call service methods
   - Transform service response to API format using DTOs

### ❌ DON'T:

1. **Never** expose `Prisma.*` types in service method signatures
2. **Never** build Prisma queries in service layer
3. **Never** use Prisma types in controller layer
4. **Never** return raw Prisma entities from controllers (always transform)
5. **Never** expose internal BigInt IDs externally (use UIDs)

## Benefits of This Pattern

1. ✅ **Separation of Concerns**: Each layer has clear responsibility
2. ✅ **Testability**: Services can be tested with mocked repositories
3. ✅ **Type Safety**: End-to-end type safety with Zod + TypeScript
4. ✅ **ORM Independence**: Easy to swap Prisma for another ORM
5. ✅ **API Consistency**: Transformation schemas ensure API contracts
6. ✅ **Developer Experience**: Clear, predictable patterns

## Migration Checklist

When refactoring an existing model to this pattern:

- [ ] Create payload types in schema file
- [ ] Create domain filter types (not Prisma types)
- [ ] Update service to use payload types
- [ ] Remove Prisma type imports from service (except entity type)
- [ ] Move query building from service to repository
- [ ] Add `createFromDto` and `updateFromDto` methods to service
- [ ] Update controller to use transformation DTOs
- [ ] Add assert helpers to schema
- [ ] Add unit tests for service (with mocked repository)
- [ ] Add integration tests for repository
