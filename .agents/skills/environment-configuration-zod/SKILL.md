---
name: environment-configuration-zod
description: Manage backend and frontend environment variables through central Zod schemas with typed defaults and startup validation.
---

# Environment Configuration Zod Pattern

Provides the repo-wide standard for environment variable parsing, validation, and type inference using `zod`. We DO NOT scatter loose `process.env` references throughout the codebase.

## Core Implementation Rules

1. **Central Schema**: Define an `envSchema` containing all environment variables as `z.object({...})`.
2. **Coercion**: Environment variables are strings. Always use `z.coerce.number()` or `z.coerce.boolean()` if you expect non-string types.
3. **Fail Fast**: The application should crash at boot if required variables are missing, instead of causing subtle errors later.
4. **Export Inferred Type**: Always export the inferred Zod type: `export type Env = z.infer<typeof envSchema>`.
5. **Parse and Export Instance**: Parse the available environment (e.g. `process.env` or `import.meta.env`) against the schema and export the safe result object for the application to import.

## NestJS (Backend) Implementations

The standard NestJS pattern (from `erify_api`) defines the schema in `src/config/env.schema.ts`.

```ts
import { z } from 'zod';

/**
 * Environment variables schema with validation and type inference
 */
export const envSchema = z.object({
  DATABASE_URL: z.url({ message: 'DATABASE_URL must be a valid URL' }).min(1),
  PORT: z.coerce.number().int().min(1).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ENABLED: z.coerce.boolean().default(true),
});

export type Env = z.infer<typeof envSchema>;

// Then integrated into NestJS ConfigModule using the schema validation.
```

## Frontend (Astro/Vite/React) Implementations

For tools like Vite or Astro that use `import.meta.env` (which bundles inline), apply the same strict schema parsing before usage.

Create a robust `src/config/env.ts` object:

```ts
import { z } from 'zod';

// Define the shape
const envSchema = z.object({
  AUTH_URL: z.url().default('http://localhost:3001'),
  AUTH_INTERNAL_URL: z.url().optional(),
  BYPASS_AUTH: z.coerce.boolean().default(false),
});

// Infer strict typings
export type Env = z.infer<typeof envSchema>;

// Parse instantly when the file is loaded
export const CONFIG: Env = envSchema.parse({
  AUTH_URL: import.meta.env.AUTH_URL,
  AUTH_INTERNAL_URL: import.meta.env.AUTH_INTERNAL_URL,
  BYPASS_AUTH: import.meta.env.BYPASS_AUTH,
});
```

## Anti-Patterns (Do NOT do this)

❌ **Loose Process Extraction**
```ts
// Bad: no validation, undefined runtime checks scattered everywhere
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl)
  throw new Error('Oops');
```

❌ **Assuming Types**
```ts
// Bad: "process.env.PORT || 3000" returns a string unless explicitly cast
const port = process.env.PORT || 3000;
```

❌ **Weak Defaults for Security**
```ts
// Bad: Don't provide valid production secrets as fallbacks!
const secret = process.env.JWT_SECRET || 'MY_TRUE_PROD_SECRET_HARDCODED';
```
