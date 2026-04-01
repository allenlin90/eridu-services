import path from 'node:path';

import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { z } from 'zod';

const stringBoolean = z.coerce
  .string()
  .transform((val) => val === 'true')
  .default(false);

// Load environment variables from .env file if it exists
// In production (Railway), environment variables are injected directly via process.env
const envPath = path.resolve(
  process.cwd(),
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
);

try {
  expand(config({ path: envPath }));
} catch (error) {
  // In production, .env file might not exist - this is expected
  if (process.env.NODE_ENV === 'production') {
    // Continue without .env file - Railway injects env vars directly
  } else {
    throw error;
  }
}

const EnvSchema = z
  .object({
    BETTER_AUTH_URL: z.url().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    DISABLE_SIGNUP: stringBoolean,
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('debug'),
    DATABASE_URL: z.url(),
    DB_MIGRATING: stringBoolean,
    DB_SEEDING: stringBoolean,
    OPEN_API_DOC_TITLE: z.string().default('livestream studio'),
    ALLOWED_ORIGINS: z
      .string()
      .default(
        'http://localhost:3000,http://localhost:3001,http://localhost:4173,http://localhost:5173',
      ),
    // SAML Configuration (optional - for future enterprise clients)
    SAML_ENTRY_POINT: z.url().optional(),
    SAML_ISSUER: z.string().optional(),
    SAML_CERT: z.string().optional(),
    // OIDC Configuration (optional - disabled for Phase 1)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    LINE_CLIENT_ID: z.string().optional(),
    LINE_CLIENT_SECRET: z.string().optional(),
    OIDC_CLIENT_ID: z.string().optional(),
    OIDC_CLIENT_SECRET: z.string().optional(),
    OIDC_ISSUER: z.url().optional(),
    COOKIE_DOMAIN: z.string().optional(),
  })
  .transform((data) => {
    // Construct BETTER_AUTH_URL from PORT only if not provided or if localhost
    const BETTER_AUTH_URL
      = data.BETTER_AUTH_URL && data.BETTER_AUTH_URL !== ''
        ? data.BETTER_AUTH_URL
        : `http://localhost:${data.PORT}`;

    return {
      ...data,
      BETTER_AUTH_URL,
      ALLOWED_ORIGINS: data.ALLOWED_ORIGINS.split(',').map((origin) =>
        origin.trim(),
      ),
    };
  });

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);

if (parsed.success === false) {
  const skip
    = !!process.env.SKIP_ENV_VALIDATION
    || !!process.env.SKIP_ENV_CHECK
    || process.env.NODE_ENV === 'test';

  if (skip) {
    console.warn('⚠️  Skipping env validation');
  } else {
    console.error('❌ Invalid env:');
    console.error(JSON.stringify(z.treeifyError(parsed.error), null, 2));
    process.exit(1);
  }
}

const env = (parsed.success ? parsed.data : process.env) as Env;

export default env;
