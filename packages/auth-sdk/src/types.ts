/**
 * Shared TypeScript types for auth-sdk
 */

/**
 * JWT Payload structure from Better Auth
 */
export type JwtPayload = {
  id: string;
  name: string;
  email: string;
  image?: string | null; // Better Auth can send null for image
  activeOrganizationId?: string | null;
  activeTeamId?: string | null;
  impersonatedBy?: string | null;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  sub?: string; // Standard JWT subject claim (Better Auth includes this)
};

/**
 * User information extracted from JWT payload
 */
export type UserInfo = {
  id: string;
  name: string;
  email: string;
  image?: string;
};
