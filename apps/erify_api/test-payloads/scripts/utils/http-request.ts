/**
 * Shared HTTP request utility for test scripts
 *
 * Automatically includes X-API-Key header if GOOGLE_SHEETS_API_KEY
 * is configured in the .env file. This matches the server's configuration
 * and allows testing actual behavior:
 * - If key is in .env: header is sent → auth is enforced (dev or prod)
 * - If key is NOT in .env: no header sent → can test bypass behavior
 */

import 'dotenv/config';

/**
 * Make HTTP request with automatic API key header inclusion
 *
 * @param method - HTTP method (GET, POST, PATCH, etc.)
 * @param url - Full URL to request
 * @param body - Optional request body (will be JSON stringified)
 * @returns Promise with status code and parsed JSON data
 */
export async function httpRequest<T = unknown>(
  method: string,
  url: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Include API key header if GOOGLE_SHEETS_API_KEY is configured in .env file
  // This matches the server's configuration and allows testing actual behavior:
  // - If key is in .env: header is sent → auth is enforced (dev or prod)
  // - If key is NOT in .env: no header sent → can test bypass behavior
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    let jsonData: unknown;
    try {
      jsonData = await response.json();
    } catch {
      // If JSON parsing fails, return empty object as fallback
      jsonData = {};
    }

    return {
      status: response.status,
      // Type assertion is necessary here because response.json() returns unknown
      // The caller is responsible for validating the response matches the expected type
      data: jsonData as T,
    };
  } catch (error) {
    throw new Error(
      `HTTP ${method} ${url} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

