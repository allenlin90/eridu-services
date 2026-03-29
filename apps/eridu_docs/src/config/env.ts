import { z } from 'zod';

/**
 * Shared Environment Configuration Schema
 * 
 * Defines strict requirements, typing, and sensible fallbacks for all docs environment constants.
 */
const envSchema = z.object({
  // Authentication Context
  JWT_SECRET: z.string().min(1).default('fallback_secret_override_in_env'),
  AUTH_COOKIE_NAME: z.string().default('eridu_session_token'),
  
  // External Application Links
  LOGIN_URL: z.url({ message: 'LOGIN_URL must be a valid URL' }).default('https://app.erify.io/login'),
  
  // Environment State
  DEV: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Centralized settings and constants object for the Eridu Docs application.
 * Parsed immediately at module-build using Astro's current import.meta.env scope
 */
const parsedEnv = envSchema.parse({
  JWT_SECRET: import.meta.env.JWT_SECRET,
  AUTH_COOKIE_NAME: import.meta.env.AUTH_COOKIE_NAME,
  LOGIN_URL: import.meta.env.LOGIN_URL,
  DEV: import.meta.env.DEV,
});

export const CONFIG = {
  jwt: {
    secret: parsedEnv.JWT_SECRET,
    cookieName: parsedEnv.AUTH_COOKIE_NAME,
  },
  urls: {
    login: parsedEnv.LOGIN_URL,
  },
  isDev: parsedEnv.DEV,
};
