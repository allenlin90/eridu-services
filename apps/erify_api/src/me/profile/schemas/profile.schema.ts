import { jwtPayloadSchema } from '@eridu/auth-sdk/schemas/jwt-payload.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Profile response schema
 *
 * API response schema for authenticated user profile information.
 * The controller maps JWT payload data to this response format:
 * - Maps JWT `id` to `ext_id` (corresponds to User.ext_id in database)
 * - Includes basic user info (name, email, image)
 * - Includes full JWT payload for advanced use cases
 *
 * This schema reuses jwtPayloadSchema from SDK for the payload field,
 * following the pattern of reusing shared schemas while defining
 * API-specific response structures.
 */
export const profileResponseSchema = z.object({
  ext_id: z
    .string()
    .describe('User ID from better-auth (maps to User.ext_id in database)'),
  id: z.string().describe('Same as ext_id for convenience'),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
  payload: jwtPayloadSchema.describe(
    'Full JWT payload including activeOrganizationId, activeTeamId, etc.',
  ),
});

export type ProfileResponseSchema = z.infer<typeof profileResponseSchema>;

export class ProfileResponseDto extends createZodDto(profileResponseSchema) {}
