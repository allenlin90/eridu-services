/**
 * HTTP client for fetching JWKS from Better Auth endpoint
 */

import type { JwksResponse } from './types.js';

const FETCH_TIMEOUT_MS = 5000;

/**
 * Fetches JWKS from the auth service endpoint
 */
export async function fetchJwks(
  authServiceUrl: string,
  jwksPath: string,
): Promise<JwksResponse> {
  const url = `${authServiceUrl}${jwksPath}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch JWKS: ${response.status} ${response.statusText}`,
      );
    }

    const jwks = (await response.json()) as JwksResponse;

    if (!jwks.keys || !Array.isArray(jwks.keys)) {
      throw new Error('Invalid JWKS format: missing or invalid keys array');
    }

    return jwks;
  } catch (error) {
    if (error instanceof Error) {
      throw new TypeError(`JWKS fetch error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while fetching JWKS');
  }
}
