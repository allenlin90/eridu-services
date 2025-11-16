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

  // Graceful Shutdown
  SHUTDOWN_TIMEOUT: z.coerce
    .number()
    .int({ message: 'SHUTDOWN_TIMEOUT must be an integer' })
    .min(1000, { message: 'SHUTDOWN_TIMEOUT must be at least 1000ms' })
    .default(30000),

  // Server-to-Server Authentication
  // Google Sheets integration API key
  GOOGLE_SHEETS_API_KEY: z.string().min(1).optional(),
  // Backdoor API key for service-to-service privileged operations (user creation, updates, membership management)
  BACKDOOR_API_KEY: z.string().min(1).optional(),
  // Backdoor IP whitelist (comma-separated) - future enhancement
  BACKDOOR_ALLOWED_IPS: z.string().optional(),
});

// Export type for use with ConfigService<Env>
export type Env = z.infer<typeof envSchema>;
