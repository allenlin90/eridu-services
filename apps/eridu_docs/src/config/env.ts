import { z } from 'zod';

const envSchema = z.object({
  AUTH_URL: z
    .url({ message: 'AUTH_URL must be a valid URL' })
    .default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().optional(),
  DEV: z.coerce.boolean().default(false),
  BYPASS_AUTH: z.coerce.boolean().default(false),
});

const parsedEnv = envSchema.parse({
  AUTH_URL: import.meta.env.AUTH_URL,
  COOKIE_DOMAIN: import.meta.env.COOKIE_DOMAIN,
  DEV: import.meta.env.DEV,
  BYPASS_AUTH: import.meta.env.BYPASS_AUTH || process.env.BYPASS_AUTH,
});

export const CONFIG = {
  authUrl: parsedEnv.AUTH_URL,
  cookieDomain: parsedEnv.COOKIE_DOMAIN,
  isDev: parsedEnv.DEV,
  bypassAuth: parsedEnv.BYPASS_AUTH,
};
