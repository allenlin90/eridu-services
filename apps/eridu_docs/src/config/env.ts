import { z } from 'zod';

/**
 * Shared Environment Configuration Schema
 * 
 * Defines strict requirements, typing, and sensible fallbacks for all docs environment constants.
 */
const envSchema = z.object({
  // Authentication Context
  AUTH_URL: z.url({ message: 'AUTH_URL must be a valid URL' }).default('http://localhost:3000'),
  AUTH_COOKIE_NAME: z.string().default('eridu_session_token'),
  
  // External Application Links
  LOGIN_URL: z.url({ message: 'LOGIN_URL must be a valid URL' }).default('http://localhost:3000/login'),
  
  // Environment State
  DEV: z.coerce.boolean().default(false),
  BYPASS_AUTH: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Centralized settings and constants object for the Eridu Docs application.
 * Parsed immediately at module-build using Astro's current import.meta.env scope
 */
const parsedEnv = envSchema.parse({
  AUTH_URL: import.meta.env.AUTH_URL,
  AUTH_COOKIE_NAME: import.meta.env.AUTH_COOKIE_NAME,
  LOGIN_URL: import.meta.env.LOGIN_URL,
  DEV: import.meta.env.DEV,
  BYPASS_AUTH: import.meta.env.BYPASS_AUTH || process.env.BYPASS_AUTH,
});

export const CONFIG = {
  auth: {
    url: parsedEnv.AUTH_URL,
    cookieName: parsedEnv.AUTH_COOKIE_NAME,
  },
  urls: {
    login: parsedEnv.LOGIN_URL,
  },
  isDev: parsedEnv.DEV,
  bypassAuth: parsedEnv.BYPASS_AUTH,
};
