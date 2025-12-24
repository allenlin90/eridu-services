import { z } from 'zod';

/**
 * Client API Response Schema (snake_case - matches backend API output)
 */
export const clientApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact_person: z.string(),
  contact_email: z.string(),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

/**
 * Create Client Input Schema
 */
export const createClientInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_person: z.string().min(1, 'Contact person is required'),
  contact_email: z.string().email(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update Client Input Schema
 */
export const updateClientInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  contact_person: z.string().min(1, 'Contact person is required').optional(),
  contact_email: z.string().email().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ClientApiResponse = z.infer<typeof clientApiResponseSchema>;
export type CreateClientInput = z.infer<typeof createClientInputSchema>;
export type UpdateClientInput = z.infer<typeof updateClientInputSchema>;
