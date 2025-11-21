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

  // Authentication & Authorization (JWT/JWKS)
  // Base URL of the erify_auth service (e.g., http://localhost:3000 or https://auth.example.com)
  ERIFY_AUTH_URL: z.url({ message: 'ERIFY_AUTH_URL must be a valid URL' }),

  // Rate Limiting (Throttling)
  // Time window in milliseconds for rate limiting (default: 60000 = 1 minute)
  THROTTLE_TTL: z.coerce
    .number()
    .int({ message: 'THROTTLE_TTL must be an integer' })
    .min(1000, { message: 'THROTTLE_TTL must be at least 1000ms' })
    .default(60000),
  // Maximum number of requests per time window (default: 10)
  THROTTLE_LIMIT: z.coerce
    .number()
    .int({ message: 'THROTTLE_LIMIT must be an integer' })
    .min(1, { message: 'THROTTLE_LIMIT must be at least 1' })
    .default(10),
});

// Export type for use with ConfigService<Env>
export type Env = z.infer<typeof envSchema>;
