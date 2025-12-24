import { z } from 'zod';

import { jwtPayloadSchema } from '@eridu/auth-sdk/schemas/jwt-payload.schema';

/**
 * Profile response schema
 *
 * API response schema for authenticated user profile information.
 * Maps JWT payload and user details.
 */
export const profileResponseSchema = z.object({
  ext_id: z
    .string()
    .describe('User ID from better-auth (maps to User.ext_id in database)'),
  id: z.string().describe('Same as ext_id for convenience'),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
  is_system_admin: z.boolean().default(false),
  payload: jwtPayloadSchema.describe(
    'Full JWT payload including activeOrganizationId, activeTeamId, etc.',
  ),
});

export type ProfileResponse = z.infer<typeof profileResponseSchema>;

/**
 * User API Response Schema (snake_case - matches backend API output)
 */
export const userApiResponseSchema = z.object({
  id: z.string(),
  ext_id: z.string().nullable(),
  email: z.email(),
  name: z.string(),
  profile_url: z.string().nullable(),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

/**
 * Create User Input Schema
 */
export const createUserInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  ext_id: z.string().optional(),
  profile_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update User Input Schema
 */
export const updateUserInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email().optional(),
  ext_id: z.string().optional(),
  profile_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type UserApiResponse = z.infer<typeof userApiResponseSchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
