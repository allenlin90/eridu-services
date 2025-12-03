import { z } from 'zod';

/**
 * Client API Response Schema (snake_case - matches backend API output)
 */
export const clientApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact_person: z.string(),
  contact_email: z.email(),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});
