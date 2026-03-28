import { z } from 'zod';

/**
 * Error codes for studio member roster operations.
 */
export const STUDIO_MEMBER_ERROR = {
  SELF_DEMOTION_NOT_ALLOWED: 'SELF_DEMOTION_NOT_ALLOWED',
  SELF_REMOVE_NOT_ALLOWED: 'SELF_REMOVE_NOT_ALLOWED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  MEMBER_ALREADY_EXISTS: 'MEMBER_ALREADY_EXISTS',
} as const;

export type StudioMemberError = (typeof STUDIO_MEMBER_ERROR)[keyof typeof STUDIO_MEMBER_ERROR];

/**
 * Role types for studio membership permissions
 */
export const STUDIO_ROLE = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  TALENT_MANAGER: 'talent_manager',
  DESIGNER: 'designer',
  MODERATION_MANAGER: 'moderation_manager',
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

// ---------------------------------------------------------------------------
// Studio Member Roster — /studios/:studioId/members
// ---------------------------------------------------------------------------

/**
 * Response DTO for a single studio member (with embedded user info).
 */
export const studioMemberResponseSchema = z.object({
  membership_id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  user_email: z.string().email(),
  role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
  base_hourly_rate: z.number().nullable(),
  created_at: z.string(),
});

export type StudioMemberResponse = z.infer<typeof studioMemberResponseSchema>;

/**
 * Request DTO for adding a member to a studio (POST /studios/:studioId/members).
 */
export const addStudioMemberRequestSchema = z.object({
  email: z.string().email('A valid email address is required'),
  role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
  base_hourly_rate: z.number().min(0, 'Hourly rate must be a non-negative number'),
});

export type AddStudioMemberRequest = z.infer<typeof addStudioMemberRequestSchema>;

/**
 * Request DTO for updating a studio member (PATCH /studios/:studioId/members/:membershipId).
 * All fields are optional — partial update (last-write-wins).
 */
export const updateStudioMemberRequestSchema = z.object({
  role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]).optional(),
  base_hourly_rate: z.number().min(0, 'Hourly rate must be a non-negative number').optional(),
});

export type UpdateStudioMemberRequest = z.infer<typeof updateStudioMemberRequestSchema>;
