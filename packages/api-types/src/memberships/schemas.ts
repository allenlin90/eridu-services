import { z } from 'zod';

/**
 * Role types for studio membership permissions
 */
export const STUDIO_ROLE = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
} as const;

export type StudioRole = (typeof STUDIO_ROLE)[keyof typeof STUDIO_ROLE];

/**
 * Membership API Response Schema (snake_case - matches backend API output)
 */
export const membershipApiResponseSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  studio_id: z.string().nullable(),
  role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

/**
 * Create Membership Input Schema
 */
export const createMembershipInputSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  studio_id: z.string().min(1, 'Studio ID is required'),
  role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update Membership Input Schema
 */
export const updateMembershipInputSchema = z.object({
  user_id: z.string().optional(),
  studio_id: z.string().optional(),
  role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type MembershipApiResponse = z.infer<typeof membershipApiResponseSchema>;
export type CreateMembershipInput = z.infer<typeof createMembershipInputSchema>;
export type UpdateMembershipInput = z.infer<typeof updateMembershipInputSchema>;
