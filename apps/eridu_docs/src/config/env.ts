import { z } from 'zod';

const envSchema = z.object({
  AUTH_URL: z.url({ message: 'AUTH_URL must be a valid URL' }).optional(),
  AUTH_API_URL: z
    .url({ message: 'AUTH_API_URL must be a valid URL' })
    .optional(),
  AUTH_UI_URL: z.url({ message: 'AUTH_UI_URL must be a valid URL' }).optional(),
  AUTH_ISSUER_URL: z
    .url({ message: 'AUTH_ISSUER_URL must be a valid URL' })
    .optional(),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.coerce.boolean().optional(),
  DEV: z.coerce.boolean().default(false),
  BYPASS_AUTH: z.coerce.boolean().default(false),
});

const parsedEnv = envSchema.parse({
  AUTH_URL: import.meta.env.AUTH_URL,
  AUTH_API_URL: import.meta.env.AUTH_API_URL,
  AUTH_UI_URL: import.meta.env.AUTH_UI_URL,
  AUTH_ISSUER_URL: import.meta.env.AUTH_ISSUER_URL,
  COOKIE_DOMAIN: import.meta.env.COOKIE_DOMAIN,
  COOKIE_SECURE: import.meta.env.COOKIE_SECURE,
  DEV: import.meta.env.DEV,
  BYPASS_AUTH: import.meta.env.BYPASS_AUTH || process.env.BYPASS_AUTH,
});

const authUrl
  = parsedEnv.AUTH_URL
    || parsedEnv.AUTH_UI_URL
    || parsedEnv.AUTH_API_URL
    || 'http://localhost:5173';
const authUiUrl = parsedEnv.AUTH_UI_URL || authUrl;

const authUrlParsed = new URL(authUrl);
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
const isLocalAuthHost = localHosts.has(authUrlParsed.hostname);

// Local convenience default:
// If auth UI is localhost:5173 and API override is absent, assume eridu_auth API on localhost:3001.
const inferredLocalApiUrl = `${authUrlParsed.protocol}//${authUrlParsed.hostname}:3001`;
const authApiUrl
  = parsedEnv.AUTH_API_URL
    || (isLocalAuthHost && authUrlParsed.port === '5173'
      ? inferredLocalApiUrl
      : authUrl);
const authIssuerUrl
  = parsedEnv.AUTH_ISSUER_URL
    || parsedEnv.AUTH_URL
    || parsedEnv.AUTH_API_URL
    || authUrl;

const cookieSecure
  = typeof parsedEnv.COOKIE_SECURE === 'boolean'
    ? parsedEnv.COOKIE_SECURE
    : !parsedEnv.DEV && !isLocalAuthHost;

export const CONFIG = {
  // Legacy alias for existing callers/docs that still reference `authUrl`.
  authUrl: authApiUrl,
  authApiUrl,
  authUiUrl,
  authIssuerUrl,
  cookieSecure,
  cookieDomain: parsedEnv.COOKIE_DOMAIN,
  isDev: parsedEnv.DEV,
  bypassAuth: parsedEnv.BYPASS_AUTH,
};
