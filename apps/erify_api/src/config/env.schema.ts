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

  // Body Parser
  BODY_PARSER_LIMIT: z
    .string()
    .regex(/^\d+(kb|mb|gb)$/i, {
      message: 'BODY_PARSER_LIMIT must be in bytes format, e.g. 100kb, 2mb',
    })
    .default('100kb'),

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
  // Base URL of the eridu_auth service (e.g., http://localhost:3000 or https://auth.example.com)
  ERIDU_AUTH_URL: z.url({ message: 'ERIDU_AUTH_URL must be a valid URL' }),
  ERIDU_PRIVATE_AUTH_URL: z.url({ message: 'ERIDU_PRIVATE_AUTH_URL must be a valid URL' }).optional(),

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

  // Cloudflare R2 (S3-compatible object storage)
  R2_ENDPOINT: z.url({ message: 'R2_ENDPOINT must be a valid URL' }).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_PUBLIC_BASE_URL: z.url({ message: 'R2_PUBLIC_BASE_URL must be a valid URL' }).optional(),

});

// Export type for use with ConfigService<Env>
export type Env = z.infer<typeof envSchema>;
