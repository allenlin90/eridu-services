import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import path from 'node:path';
import { z } from 'zod';

const stringBoolean = z.coerce
  .string()
  .transform((val) => val === 'true')
  .default(false);

expand(
  config({
    path: path.resolve(
      process.cwd(),
      process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
    ),
  })
);

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
  })
  .transform((data) => {
    // Construct BETTER_AUTH_URL from PORT, ensuring it matches the actual server port
    // If BETTER_AUTH_URL is set, extract the protocol and hostname, but use the actual PORT
    const BETTER_AUTH_URL =
      data.BETTER_AUTH_URL && data.BETTER_AUTH_URL !== ''
        ? (() => {
            try {
              const url = new URL(data.BETTER_AUTH_URL);
              url.port = data.PORT.toString();
              return url.toString();
            } catch {
              return `http://localhost:${data.PORT}`;
            }
          })()
        : `http://localhost:${data.PORT}`;

    return {
      ...data,
      BETTER_AUTH_URL,
    };
  });

export type env = z.infer<typeof EnvSchema>;

const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error('❌ Invalid env:');
  console.error(JSON.stringify(z.treeifyError(error), null, 2));
  process.exit(1);
}

export default env!;
