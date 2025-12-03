import { z } from 'zod';

/**
 * Zod schema for JWT payload from Better Auth
 *
 * This schema validates the structure of JWT tokens issued by Better Auth.
 * It matches the JwtPayload type and can be used for runtime validation
 * and OpenAPI documentation generation.
 *
 * @example
 * ```typescript
 * import { jwtPayloadSchema } from '@eridu/auth-sdk/schemas';
 *
 * const payload = jwtPayloadSchema.parse(tokenPayload);
 * ```
 */
export const jwtPayloadSchema = z.object({
  id: z.string().describe('User ID from Better Auth'),
  name: z.string().describe('User display name'),
  email: z.email().describe('User email address'),
  image: z
    .string()
    .nullable()
    .optional()
    .describe('User profile image URL (can be null)'),
  activeOrganizationId: z
    .string()
    .nullable()
    .optional()
    .describe('Currently active organization ID'),
  activeTeamId: z
    .string()
    .nullable()
    .optional()
    .describe('Currently active team ID'),
  impersonatedBy: z
    .string()
    .nullable()
    .optional()
    .describe('User ID if this session is impersonated'),
  iat: z.number().optional().describe('Issued at timestamp'),
  exp: z.number().optional().describe('Expiration timestamp'),
  iss: z.string().optional().describe('JWT issuer'),
  aud: z.string().optional().describe('JWT audience'),
  sub: z.string().optional().describe('JWT subject (standard claim)'),
});
