# @eridu/api-types

Shared API types and schemas for the eridu-services monorepo.

## Overview

This package provides a single source of truth for API types and schemas used across both the backend API (`erify_api`) and frontend SPA (`erify_creators`). It uses **Zod schemas** as the foundation and exports TypeScript types inferred from those schemas.

## Strategy: Precompiled (Recommended)

We use a **precompiled strategy** where:
- Types are compiled to JavaScript and TypeScript declaration files during build
- Both backend and frontend import from the compiled `dist` directory
- This provides better type safety, faster builds, and clearer dependency boundaries

### Why Precompiled?

1. **Type Safety**: TypeScript can properly resolve types across package boundaries
2. **Performance**: No runtime compilation overhead
3. **Clear Dependencies**: Explicit build dependencies in Turbo
4. **IDE Support**: Better autocomplete and type checking
5. **Monorepo Best Practices**: Aligns with Turbo monorepo recommendations

## Structure

```
packages/api-types/
├── src/
│   ├── constants.ts          # UID prefixes and shared constants
│   ├── pagination/           # Reusable pagination schemas
│   │   ├── schemas.ts        # Pagination metadata and factory
│   │   ├── types.ts          # Pagination types
│   │   └── index.ts
│   ├── clients/              # Client entity schemas
│   │   ├── schemas.ts
│   │   └── index.ts
│   ├── studio-rooms/         # Studio Room entity schemas
│   │   ├── schemas.ts
│   │   └── index.ts
│   ├── show-types/           # Show Type entity schemas
│   │   ├── schemas.ts
│   │   └── index.ts
│   ├── show-statuses/        # Show Status entity schemas
│   │   ├── schemas.ts
│   │   └── index.ts
│   ├── show-standards/       # Show Standard entity schemas
│   │   ├── schemas.ts
│   │   └── index.ts
│   ├── shows/                # Show entity schemas
│   │   ├── schemas.ts        # Show-specific schemas
│   │   ├── types.ts          # TypeScript types and helpers
│   │   └── index.ts
│   └── index.ts              # Main entry point
├── dist/                     # Compiled output (generated)
└── package.json
```

### Benefits of This Structure

- **Tree-shaking**: Each entity is in its own module, allowing bundlers to eliminate unused code
- **Organization**: Related schemas are grouped together
- **Reusability**: Pagination schemas can be used by any entity
- **Maintainability**: Easier to find and update specific schemas

## Usage

### Backend (NestJS)

```typescript
import { showApiResponseSchema } from '@eridu/api-types/shows';
import { ShowDto } from './show.schema';

// Use the shared schema for API response validation
export const showDto = showWithRelationsSchema
  .transform(/* ... */)
  .pipe(showApiResponseSchema);
```

### Using Pagination

```typescript
import { createPaginatedResponseSchema } from '@eridu/api-types/pagination';
import { clientApiResponseSchema } from '@eridu/api-types/clients';

// Create a paginated response schema for any entity
const paginatedClientsSchema = createPaginatedResponseSchema(clientApiResponseSchema);
```

### Frontend (React)

```typescript
import type { Show, ShowApiResponse } from '@eridu/api-types/shows';
import { showApiResponseToShow } from '@eridu/api-types/shows';

// Use the Show type (camelCase-friendly)
function ShowComponent({ show }: { show: Show }) {
  return <div>{show.name}</div>;
}

// Convert API response to frontend-friendly format
const show = showApiResponseToShow(apiResponse);
```

## API Response Format

The API returns data in **snake_case** format (following REST API conventions):

```typescript
type ShowApiResponse = {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string | null;
  start_time: string; // ISO 8601 datetime
  // ...
};
```

## Frontend-Friendly Format

For frontend usage, we provide a **camelCase** type and conversion helpers:

```typescript
type Show = {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  startTime: string;
  // ...
};
```

## Development

### Build

```bash
pnpm build
```

### Watch Mode

```bash
pnpm dev
```

### Type Check

```bash
pnpm typecheck
```

## Adding New Types

1. Create a new directory `src/{entity}/`
2. Create `schemas.ts` with your Zod schemas
3. Create `types.ts` if you need TypeScript types or helpers
4. Create `index.ts` to export everything
5. Add exports to `src/index.ts` and `package.json` exports field
6. Build the package: `pnpm build`

### Example: Adding a New Entity

```typescript
// src/users/schemas.ts
import { z } from 'zod';

export const userApiResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  created_at: z.string(),
});

// src/users/index.ts
export * from './schemas.js';

// src/index.ts
export * from './users/index.js';
```

## Best Practices

1. **Keep schemas framework-agnostic**: Don't import NestJS-specific types
2. **Use Zod 4 API**: Use `z.email()`, `z.url()`, etc. instead of `z.string().email()`
3. **Separate entities into modules**: Each entity should have its own directory for better tree-shaking
4. **Reuse pagination**: Use `createPaginatedResponseSchema()` for paginated endpoints
5. **Export both schemas and types**: Schemas for runtime validation, types for compile-time
6. **Document API format**: Clearly indicate snake_case vs camelCase
7. **Provide conversion helpers**: Make it easy to convert between formats
8. **Keep DTOs in correct modules**: Don't put client DTOs in show schemas, etc.

