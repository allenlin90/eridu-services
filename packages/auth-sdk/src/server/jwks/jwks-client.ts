/**
 * HTTP client for fetching JWKS from Better Auth endpoint
 */

import type { JwksResponse } from "./types.js";

/**
 * Fetches JWKS from the auth service endpoint
 */
export async function fetchJwks(
  authServiceUrl: string,
  jwksPath: string,
): Promise<JwksResponse> {
  const url = `${authServiceUrl}${jwksPath}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch JWKS: ${response.status} ${response.statusText}`,
      );
    }

    const jwks = (await response.json()) as JwksResponse;

    if (!jwks.keys || !Array.isArray(jwks.keys)) {
      throw new Error("Invalid JWKS format: missing or invalid keys array");
    }

    return jwks;
  }
  catch (error) {
    if (error instanceof Error) {
      throw new TypeError(`JWKS fetch error: ${error.message}`);
    }
    throw new Error("Unknown error occurred while fetching JWKS");
  }
}
