import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true'));

const envSchema = z.object({
  AUTH_URL: z.url().default('http://localhost:3001'),
  AUTH_INTERNAL_URL: z.url().optional(),
  BYPASS_AUTH: booleanish.default(false),
  COOKIE_SECURE: booleanish.optional(),
});

const parsed = envSchema.parse({
  AUTH_URL: import.meta.env.AUTH_URL,
  AUTH_INTERNAL_URL: import.meta.env.AUTH_INTERNAL_URL,
  BYPASS_AUTH: import.meta.env.BYPASS_AUTH ?? process.env.BYPASS_AUTH,
  COOKIE_SECURE: import.meta.env.COOKIE_SECURE,
});

export const CONFIG = {
  authApiUrl: parsed.AUTH_INTERNAL_URL ?? parsed.AUTH_URL,
  authUiUrl: parsed.AUTH_URL,
  // JWT issuer matches eridu_auth BETTER_AUTH_URL
  authIssuerUrl: parsed.AUTH_URL,
  cookieSecure: parsed.COOKIE_SECURE ?? import.meta.env.PROD,
  bypassAuth: parsed.BYPASS_AUTH,
};
