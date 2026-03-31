import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true'));

const envSchema = z.object({
  SITE_URL: z.url().optional(),
  AUTH_URL: z.url().default('http://localhost:3001'),
  AUTH_INTERNAL_URL: z.url().optional(),
  BYPASS_AUTH: booleanish.default(false),
  COOKIE_SECURE: booleanish.optional(),
  // Shared secret for server-to-server calls to eridu_auth /api/service/* endpoints.
  // Must match SERVICE_SECRET in eridu_auth. Optional — logout falls back to
  // cookie-clear-only redirect when unset.
  AUTH_SERVICE_SECRET: z.string().min(32).optional(),
});

const parsed = envSchema.parse({
  SITE_URL: import.meta.env.SITE_URL ?? process.env.SITE_URL,
  AUTH_URL: import.meta.env.AUTH_URL ?? process.env.AUTH_URL,
  AUTH_INTERNAL_URL: import.meta.env.AUTH_INTERNAL_URL ?? process.env.AUTH_INTERNAL_URL,
  BYPASS_AUTH: import.meta.env.BYPASS_AUTH ?? process.env.BYPASS_AUTH,
  COOKIE_SECURE: import.meta.env.COOKIE_SECURE ?? process.env.COOKIE_SECURE,
  AUTH_SERVICE_SECRET: import.meta.env.AUTH_SERVICE_SECRET ?? process.env.AUTH_SERVICE_SECRET,
});

export const CONFIG = {
  // Explicit public origin used for building callback URLs.
  // Required in production to avoid Railway's internal Host header (localhost:PORT)
  // being used as the callbackURL base. Falls back to the request origin in local dev.
  siteUrl: parsed.SITE_URL ?? null,
  authApiUrl: parsed.AUTH_INTERNAL_URL ?? parsed.AUTH_URL,
  authUiUrl: parsed.AUTH_URL,
  // JWT issuer matches eridu_auth BETTER_AUTH_URL
  authIssuerUrl: parsed.AUTH_URL,
  cookieSecure: parsed.COOKIE_SECURE ?? import.meta.env.PROD,
  bypassAuth: parsed.BYPASS_AUTH,
  // Service secret for server-to-server calls to eridu_auth /api/service/* endpoints.
  // When set, logout is performed server-to-server. When unset, cookie is cleared only.
  authServiceSecret: parsed.AUTH_SERVICE_SECRET ?? null,
};
