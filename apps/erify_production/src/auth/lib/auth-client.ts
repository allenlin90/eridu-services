import { createAuthClient } from "better-auth/react";
import { createRemoteJWKSet } from "jose";

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL;

if (!AUTH_BASE_URL) {
  throw new Error("Missing auth base URL");
}

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
});

export const remoteJWKs = createRemoteJWKSet(new URL(`${AUTH_BASE_URL}/api/auth/jwks`));
