/**
 * Better Auth standard constants
 *
 * These constants represent standard Better Auth endpoint paths and configuration.
 * Better Auth uses `/api/auth` as the default base path for all auth endpoints.
 *
 * These constants are shared between frontend and backend SDK packages.
 *
 * @see https://www.better-auth.com/docs
 */

/**
 * Better Auth standard base path
 * This is the default base path where Better Auth exposes all auth endpoints
 */
export const BETTER_AUTH_BASE_PATH = '/api/auth' as const;

/**
 * Better Auth standard endpoints
 * These paths are relative to the base path (e.g., `/api/auth`)
 */
export const BETTER_AUTH_ENDPOINTS = {
  /**
   * JWKS (JSON Web Key Set) endpoint for JWT verification
   * Used by backend services to fetch public keys for token verification
   */
  JWKS: `${BETTER_AUTH_BASE_PATH}/jwks` as const,

  /**
   * Session endpoint - Get current user session
   * Used by both frontend and backend to verify authentication
   */
  SESSION: `${BETTER_AUTH_BASE_PATH}/session` as const,

  /**
   * Token endpoint - Get or refresh JWT token
   */
  TOKEN: `${BETTER_AUTH_BASE_PATH}/token` as const,

  /**
   * Authentication endpoints
   */
  AUTH: {
    SIGN_IN: `${BETTER_AUTH_BASE_PATH}/sign-in` as const,
    SIGN_UP: `${BETTER_AUTH_BASE_PATH}/sign-up` as const,
    SIGN_OUT: `${BETTER_AUTH_BASE_PATH}/sign-out` as const,
    MAGIC_LINK: `${BETTER_AUTH_BASE_PATH}/sign-in/magic-link` as const,
  },

  /**
   * Password management endpoints
   */
  PASSWORD: {
    FORGOT: `${BETTER_AUTH_BASE_PATH}/forgot-password` as const,
    RESET: `${BETTER_AUTH_BASE_PATH}/reset-password` as const,
    CHANGE: `${BETTER_AUTH_BASE_PATH}/change-password` as const,
  },

  /**
   * Email verification endpoints
   */
  EMAIL: {
    SEND_VERIFICATION: `${BETTER_AUTH_BASE_PATH}/send-verification` as const,
    VERIFY: `${BETTER_AUTH_BASE_PATH}/verify-email` as const,
    CHANGE: `${BETTER_AUTH_BASE_PATH}/change-email` as const,
  },

  /**
   * Organization management endpoints
   */
  ORGANIZATION: {
    CREATE: `${BETTER_AUTH_BASE_PATH}/organization` as const,
    INVITE: `${BETTER_AUTH_BASE_PATH}/organization/invite` as const,
    ACCEPT_INVITATION:
      `${BETTER_AUTH_BASE_PATH}/organization/accept-invitation` as const,
    REJECT_INVITATION:
      `${BETTER_AUTH_BASE_PATH}/organization/reject-invitation` as const,
    REMOVE_MEMBER:
      `${BETTER_AUTH_BASE_PATH}/organization/remove-member` as const,
    UPDATE_MEMBER_ROLE:
      `${BETTER_AUTH_BASE_PATH}/organization/update-member-role` as const,
  },

  /**
   * Team management endpoints
   */
  TEAM: {
    CREATE: `${BETTER_AUTH_BASE_PATH}/team` as const,
    ADD_MEMBER: `${BETTER_AUTH_BASE_PATH}/team/add-member` as const,
    REMOVE_MEMBER: `${BETTER_AUTH_BASE_PATH}/team/remove-member` as const,
  },

  /**
   * Admin endpoints
   */
  ADMIN: {
    IMPERSONATE: `${BETTER_AUTH_BASE_PATH}/admin/impersonate` as const,
    STOP_IMPERSONATING:
      `${BETTER_AUTH_BASE_PATH}/admin/stop-impersonating` as const,
    CREATE_USER: `${BETTER_AUTH_BASE_PATH}/admin/create-user` as const,
    DELETE_USER: `${BETTER_AUTH_BASE_PATH}/admin/delete-user` as const,
    UPDATE_USER: `${BETTER_AUTH_BASE_PATH}/admin/update-user` as const,
  },
} as const;

/**
 * Legacy export for backward compatibility
 * @deprecated Use BETTER_AUTH_ENDPOINTS.JWKS instead
 */
export const BETTER_AUTH_JWKS_PATH = BETTER_AUTH_ENDPOINTS.JWKS;
