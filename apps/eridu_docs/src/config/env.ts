import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true'));

const envSchema = z.object({
  AUTH_API_URL: z.url().default('http://localhost:3001'),
  AUTH_UI_URL: z.url().default('http://localhost:5173'),
  BYPASS_AUTH: booleanish.default(false),
  COOKIE_SECURE: booleanish.optional(),
});

const parsed = envSchema.parse({
  AUTH_API_URL: import.meta.env.AUTH_API_URL,
  AUTH_UI_URL: import.meta.env.AUTH_UI_URL,
  BYPASS_AUTH: import.meta.env.BYPASS_AUTH ?? process.env.BYPASS_AUTH,
  COOKIE_SECURE: import.meta.env.COOKIE_SECURE,
});

export const CONFIG = {
  authApiUrl: parsed.AUTH_API_URL,
  authUiUrl: parsed.AUTH_UI_URL,
  // JWT issuer matches eridu_auth backend URL (BETTER_AUTH_URL in eridu_auth)
  authIssuerUrl: parsed.AUTH_API_URL,
  cookieSecure: parsed.COOKIE_SECURE ?? import.meta.env.PROD,
  bypassAuth: parsed.BYPASS_AUTH,
};
