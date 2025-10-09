import { z } from 'zod';

/**
 * Environment variables schema with validation and type inference
 * @see https://zod.dev/ for more information about Zod schema validation
 */
export const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .url({ message: 'DATABASE_URL must be a valid URL' })
    .min(1, { message: 'DATABASE_URL is required' }),

  // Server
  PORT: z.coerce
    .number()
    .int({ message: 'PORT must be an integer' })
    .min(1, { message: 'PORT must be greater than 0' })
    .default(3000),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Security
  CORS_ENABLED: z.coerce.boolean().default(true),
  CORS_ORIGIN: z
    .string()
    .min(1, { message: 'CORS_ORIGIN cannot be empty' })
    .default('*'),
});

// Export type for use with ConfigService<Env>
export type Env = z.infer<typeof envSchema>;
