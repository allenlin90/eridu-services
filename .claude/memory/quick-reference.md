# Quick Reference Guide

One-page reference for common tasks and patterns.

## 🚀 Creating a New Model (Backend)

```bash
# 1. Create directory structure
mkdir -p apps/erify_api/src/models/widget/{schemas}

# 2. Create files (follow this order)
touch apps/erify_api/src/models/widget/{
  schemas/widget.schema.ts,
  widget.repository.ts,
  widget.service.ts,
  widget.controller.ts,
  widget.module.ts
}
```

### Template: widget.schema.ts
```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import type { Prisma } from '@prisma/client';

// Payload types
export type CreateWidgetPayload = Omit<Prisma.WidgetCreateInput, 'uid'> & { uid?: string };
export type UpdateWidgetPayload = Prisma.WidgetUpdateInput;

// DTOs
const createWidgetSchema = z.object({
  name: z.string().min(1).max(255),
  // ... fields
});

export class CreateWidgetDto extends createZodDto(createWidgetSchema) {}
export class UpdateWidgetDto extends createZodDto(createWidgetSchema.partial()) {}
```

### Template: widget.service.ts
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Widget } from '@prisma/client';  // ONLY entity type!
import { WidgetRepository } from './widget.repository';
import { CreateWidgetPayload, UpdateWidgetPayload, CreateWidgetDto } from './schemas';

@Injectable()
export class WidgetService extends BaseModelService {
  static readonly UID_PREFIX = 'widget';

  constructor(private readonly widgetRepository: WidgetRepository) {
    super();
  }

  async create(payload: CreateWidgetPayload): Promise<Widget> {
    return this.widgetRepository.create({
      ...payload,
      uid: payload.uid ?? this.generateUid(),
    });
  }

  async createFromDto(dto: CreateWidgetDto): Promise<Widget> {
    const payload: CreateWidgetPayload = { name: dto.name };
    return this.create(payload);
  }

  private generateUid(): string {
    return this.baseGenerateUid(WidgetService.UID_PREFIX);
  }
}
```

---

## 🎨 Creating a New React Feature

```bash
# 1. Create directory structure
mkdir -p apps/erify_studios/src/features/widgets/{api,components,hooks}

# 2. Create files
touch apps/erify_studios/src/features/widgets/{
  api/widgets.ts,
  components/WidgetList.tsx,
  hooks/useWidgets.ts
}
```

### Template: api/widgets.ts
```typescript
import { apiClient } from '@/lib/api/client';
import { widgetApiResponseSchema } from '@eridu/api-types/widgets';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const widgetKeys = {
  all: ['widgets'] as const,
  lists: () => [...widgetKeys.all, 'list'] as const,
  detail: (id: string) => [...widgetKeys.all, 'detail', id] as const,
};

export function useWidgets(studioId: string) {
  return useQuery({
    queryKey: [...widgetKeys.lists(), studioId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/studios/${studioId}/widgets`);
      return data.data.map(item => widgetApiResponseSchema.parse(item));
    },
  });
}

export function useCreateWidget(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string }) =>
      apiClient.post(`/studios/${studioId}/widgets`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: widgetKeys.lists() });
    },
  });
}
```

---

## 🔄 Refresh Action Pattern (Frontend)

Use icon-only refresh controls for manual refetch actions in toolbars/headers.

```tsx
<Button
  type="button"
  variant="outline"
  size="icon"
  className="h-9 w-9"
  onClick={onRefresh}
  disabled={isRefreshing}
  aria-label="Refresh data"
>
  <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
</Button>
```

Use text labels only for dropdown menu items where needed for mobile action menus.

---

## 📊 Task Report Key Contracts

### Source-scope vs run-scope

`@eridu/api-types/task-management` exports **two** scope schemas:

| Schema                         | Date range                                                       | Used by                                                |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------ |
| `taskReportScopeSchema`        | **Required** (`date_from` + `date_to` each separately validated) | Preflight and run endpoints                            |
| `taskReportSourcesScopeSchema` | Optional                                                         | Source discovery endpoint (`GET /task-report-sources`) |

The split lets the column picker populate before the user commits to a date range. `GetTaskReportSourcesQuery` transforms to the looser schema internally via `safeParse`. `TaskReportSourcesScope` is exported as the resulting type.

### Exported types

- `TaskReportColumn` — inferred from `taskReportColumnSchema`; use this instead of `TaskReportSelectedColumn` in `filter-rows.ts` and `serialize-csv.ts`.
- `TaskReportSourcesScope` — inferred from `taskReportSourcesScopeSchema`; use for the sources query hook signature.

### Definition schema notes

- `updated_by_id` has been **intentionally removed** from `taskReportDefinitionSchema`. Definitions are personal presets — only creator tracking is supported in MVP. No `updated_by` relation exists in the DB model.

### View-filter field naming convention

`TaskReportViewFilters` in `filter-rows.ts` uses **name-preferred, id-fallback** fields:

```ts
{
  client_id?: string;          // legacy compat
  client_name?: string;        // preferred — exact match against system-column value
  show_status_id?: string;     // legacy compat
  show_status_name?: string;   // preferred
  studio_room_id?: string;     // legacy compat
  studio_room_name?: string;   // preferred
  assignee?: string;
  search?: string;
}
```

When populating view-filter state from result rows, prefer setting `*_name` over `*_id` so the filter matches the actual string values returned in the flat row. The `_id` fields remain for backward compatibility.

### Guardrails (2026-03-20)

- Preflight `task_count` must match run eligibility: count only submitted tasks with both `templateId` and `snapshotId` (unsnapshotted tasks are excluded from both preflight and run).
- Shared-field keys must not collide with report system column keys (`show_id`, `show_name`, `show_external_id`, `client_name`, `studio_room_name`, `show_standard_name`, `show_type_name`, `start_time`, `end_time`).

---

## 📊 Task Report Stress Simulation Seed

Use this when validating task-report column picker UX against high-noise real-world conditions (many brands/templates + loop-heavy moderation schemas):

```bash
pnpm --filter erify_api db:seed:report-simulation
```

What it adds (idempotent upserts):
- 30 client-dedicated moderation templates (`ttpl_seed_report_sim_*`)
- 8 loops/template, 20 fields per loop
- 30-brand scoped shows and >100 submitted tasks per simulation template

Why:
- Reproduces noisy column-selection conditions where template-scoped custom fields can overwhelm the picker.
- Validates collapse/search/selected-only workflows before production rollout.

---

## 🔐 Adding Authentication to Endpoints

### Public Endpoint (no auth)
```typescript
@Get('health')
@SkipJwtAuth()
healthCheck() {
  return { status: 'ok' };
}
```

### Authenticated Endpoint
```typescript
@Get('me')
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return this.userService.findByUid(user.uid);
}
```

### Admin-Only Endpoint
```typescript
@Get('users')
@Admin()
listAllUsers() {
  return this.userService.findAll();
}
```

### Studio-Scoped Endpoint
```typescript
@Post(':studioId/tasks')
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
createTask(
  @StudioParam() studioUid: string,
  @Body() dto: CreateTaskDto,
) {
  return this.taskService.createInStudio(studioUid, dto);
}
```

---

## 📦 Adding to @eridu/api-types

```bash
# 1. Create domain directory
mkdir -p packages/api-types/src/widgets

# 2. Create schema file
touch packages/api-types/src/widgets/{schemas.ts,index.ts}
```

### Template: widgets/schemas.ts
```typescript
import { z } from 'zod';

// Constants
export const WIDGET_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// API Response (snake_case)
export const widgetApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['active', 'inactive']),
  created_at: z.string(),
  updated_at: z.string(),
});

export type WidgetApiResponse = z.infer<typeof widgetApiResponseSchema>;

// API Input
export const createWidgetInputSchema = z.object({
  name: z.string().min(1).max(255),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type CreateWidgetInput = z.infer<typeof createWidgetInputSchema>;
```

### Update package.json exports
```json
{
  "exports": {
    "./widgets": {
      "types": "./dist/widgets/index.d.ts",
      "default": "./dist/widgets/index.js"
    }
  }
}
```

---

## 🗄️ Adding Prisma Model

```prisma
model Widget {
  id          BigInt    @id @default(autoincrement())
  uid         String    @unique
  name        String
  status      String    @default("active")

  studioId    BigInt    @map("studio_id")
  studio      Studio    @relation(fields: [studioId], references: [id])

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  @@map("widgets")
}
```

```bash
# Generate migration
pnpm --filter erify_api prisma migrate dev --name add_widgets_table

# Generate Prisma client
pnpm --filter erify_api prisma generate
```

---

## 🧪 Common Test Patterns

### Service Unit Test (Mock Repository)
```typescript
describe('WidgetService', () => {
  let service: WidgetService;
  let repository: jest.Mocked<WidgetRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findUnique: jest.fn(),
    } as any;

    service = new WidgetService(repository);
  });

  it('should create widget', async () => {
    const payload = { name: 'Test' };
    const expected = { id: 1n, uid: 'widget_123', name: 'Test' };

    repository.create.mockResolvedValue(expected);

    const result = await service.create(payload);

    expect(result).toEqual(expected);
    expect(repository.create).toHaveBeenCalledWith({
      ...payload,
      uid: expect.stringContaining('widget_'),
    });
  });
});
```

### React Component Test
```typescript
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('WidgetList', () => {
  it('renders widgets', async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <WidgetList studioId="studio_123" />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Widget 1')).toBeInTheDocument();
  });
});
```

---

## 🔧 Common Debugging

### Check Guard Order
```typescript
// apps/erify_api/src/app.module.ts
providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },      // 1
  { provide: APP_GUARD, useClass: JwtAuthGuard },         // 2
  { provide: APP_GUARD, useClass: BackdoorApiKeyGuard },  // 3
  { provide: APP_GUARD, useClass: AdminGuard },           // 4
  { provide: APP_GUARD, useClass: StudioGuard },          // 5
]
```

### Check JWT Token
```bash
# Get token
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Decode JWT (paste token)
echo "YOUR_JWT_TOKEN" | cut -d. -f2 | base64 -d | jq
```

### Check Prisma Schema Sync
```bash
# Check if DB matches schema
pnpm --filter erify_api prisma migrate status

# Reset DB (DEV ONLY!)
pnpm --filter erify_api prisma migrate reset
```

### Check TanStack Query Cache
```typescript
// In React component
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
console.log('Query cache:', queryClient.getQueryCache().getAll());
```

---

## 📊 Common Queries

### List with Pagination
```typescript
async findAll(page: number, perPage: number) {
  const skip = (page - 1) * perPage;

  const [items, total] = await Promise.all([
    this.repository.findMany({ skip, take: perPage }),
    this.repository.count(),
  ]);

  return {
    data: items,
    meta: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
  };
}
```

### Find with Relations
```typescript
async findByUidWithRelations(uid: string) {
  return this.repository.findUnique({
    where: { uid },
    include: {
      studio: true,
      assignee: true,
    },
  });
}
```

### Soft Delete
```typescript
async softDelete(uid: string) {
  const widget = await this.findByUid(uid);
  return this.repository.update(
    { id: widget.id },
    { deletedAt: new Date() },
  );
}
```

### Bulk Operations
```typescript
async bulkCreate(payloads: CreateWidgetPayload[]) {
  return Promise.all(
    payloads.map(payload => this.create(payload))
  );
}
```

---

## 🎯 Common Patterns

### UID Generation
```typescript
// In service
private generateUid(): string {
  return this.baseGenerateUid(WidgetService.UID_PREFIX);
}

// Resolving UID to internal ID
const widget = await this.findByUid(uid);  // Returns entity with BigInt id
```

### DTO to Payload Transformation
```typescript
async createFromDto(dto: CreateWidgetDto): Promise<Widget> {
  const payload: CreateWidgetPayload = {
    name: dto.name,
    status: dto.status ?? 'active',
    // Transform snake_case to camelCase if needed
    studioId: dto.studio_id,  // But payload types should already be camelCase!
  };
  return this.create(payload);
}
```

### Entity to API Response
```typescript
// In controller
@Get(':id')
async findOne(@Param('id') uid: string) {
  const widget = await this.widgetService.findByUid(uid);
  return widgetDto.parse(widget);  // Transforms to snake_case API format
}
```

---

## 🚨 Common Mistakes

### ❌ Exposing Prisma Types
```typescript
// WRONG
async create(data: Prisma.WidgetCreateInput): Promise<Widget>

// CORRECT
async create(payload: CreateWidgetPayload): Promise<Widget>
```

### ❌ Building Queries in Service
```typescript
// WRONG (in service)
const where: Prisma.WidgetWhereInput = { name: { contains: search } };
return this.repository.findMany({ where });

// CORRECT (in repository)
async findByName(search: string) {
  return this.findMany({
    where: { name: { contains: search } },
  });
}
```

### ❌ Exposing Internal IDs
```typescript
// WRONG
return { id: widget.id }  // BigInt!

// CORRECT
return { id: widget.uid }  // String UID
```

### ❌ Direct DTO in Service
```typescript
// WRONG
async create(dto: CreateWidgetDto): Promise<Widget>

// CORRECT
async createFromDto(dto: CreateWidgetDto): Promise<Widget> {
  const payload: CreateWidgetPayload = { ... };
  return this.create(payload);
}
```

---

## 📌 Environment Variables

```bash
# Backend (.env)
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
BACKDOOR_API_KEY="..."

# Auth (.env)
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3001"

# Frontend (.env)
VITE_API_URL="http://localhost:3000"
VITE_AUTH_URL="http://localhost:3001"
```

---

## 🔗 Key File Locations

```
erify_api/
├── src/
│   ├── lib/
│   │   ├── auth/           ← Guards, decorators
│   │   ├── repository/     ← BaseRepository
│   │   └── zod/           ← Assert helpers
│   ├── models/
│   │   └── task/          ← ✅ BEST EXAMPLE
│   └── prisma/
│       └── schema.prisma

erify_studios/
├── src/
│   ├── features/          ← Domain features
│   ├── lib/
│   │   └── api/          ← API client
│   └── routes/           ← TanStack Router

packages/
├── api-types/            ← Shared schemas
├── auth-sdk/            ← JWT verification
└── ui/                  ← Shared components
```
