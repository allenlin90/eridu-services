/**
 * JWT Payload parsing and validation
 */

import type { JwtPayload, UserInfo } from "../../types.js";

/**
 * Extract user information from JWT payload
 */
export function extractUserInfo(payload: JwtPayload): UserInfo {
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    // Convert null to undefined since UserInfo.image is optional string, not nullable
    image: payload.image ?? undefined,
  };
}

/**
 * Validate JWT payload structure
 */
export function validateJwtPayload(payload: unknown): payload is JwtPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const p = payload as Record<string, unknown>;

  return (
    typeof p.id === "string"
    && typeof p.name === "string"
    && typeof p.email === "string"
    && (p.image === undefined || p.image === null || typeof p.image === "string")
  );
}
