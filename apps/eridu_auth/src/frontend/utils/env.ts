import { z } from 'zod';

// Browser-compatible environment schema - only includes variables needed in the frontend
const BrowserEnvSchema = z.object({
  VITE_BETTER_AUTH_URL: z.url().optional(),
});

// Get environment variables from Vite's import.meta.env
const browserEnv = {
  VITE_BETTER_AUTH_URL: import.meta.env.VITE_BETTER_AUTH_URL,
};

// Validate and parse the environment
const { data: env, error } = BrowserEnvSchema.safeParse(browserEnv);

if (error) {
  console.error('❌ Invalid browser env:');
  console.error(JSON.stringify(z.treeifyError(error), null, 2));
  throw new Error('Invalid browser environment configuration');
}

export type BrowserEnv = z.infer<typeof BrowserEnvSchema>;
export default env!;
