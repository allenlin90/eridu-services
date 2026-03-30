import { z } from 'zod';

const envSchema = z.object({
  AUTH_URL: z.url({ message: 'AUTH_URL must be a valid URL' }).optional(),
  AUTH_API_URL: z
    .url({ message: 'AUTH_API_URL must be a valid URL' })
    .optional(),
  AUTH_UI_URL: z.url({ message: 'AUTH_UI_URL must be a valid URL' }).optional(),
  COOKIE_DOMAIN: z.string().optional(),
  DEV: z.coerce.boolean().default(false),
  BYPASS_AUTH: z.coerce.boolean().default(false),
});

const parsedEnv = envSchema.parse({
  AUTH_URL: import.meta.env.AUTH_URL,
  AUTH_API_URL: import.meta.env.AUTH_API_URL,
  AUTH_UI_URL: import.meta.env.AUTH_UI_URL,
  COOKIE_DOMAIN: import.meta.env.COOKIE_DOMAIN,
  DEV: import.meta.env.DEV,
  BYPASS_AUTH: import.meta.env.BYPASS_AUTH || process.env.BYPASS_AUTH,
});

const authApiUrl = parsedEnv.AUTH_API_URL || parsedEnv.AUTH_URL || 'http://localhost:3001';
const authUiUrl = parsedEnv.AUTH_UI_URL || parsedEnv.AUTH_URL || authApiUrl;

export const CONFIG = {
  // Legacy alias for existing callers/docs that still reference `authUrl`.
  authUrl: authApiUrl,
  authApiUrl,
  authUiUrl,
  cookieDomain: parsedEnv.COOKIE_DOMAIN,
  isDev: parsedEnv.DEV,
  bypassAuth: parsedEnv.BYPASS_AUTH,
};
