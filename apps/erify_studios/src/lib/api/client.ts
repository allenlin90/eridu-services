import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { decodeJwt } from 'jose';

import { getCachedToken, setCachedToken } from '@/lib/api/token-store';
import { authClient } from '@/lib/auth';

/**
 * API Client Configuration
 *
 * Security Best Practices:
 * - JWT tokens attached via interceptor (not stored in client)
 * - Tokens retrieved fresh from auth client on each request
 * - JWT expiration checked before attempting refresh (reduces auth server load)
 * - Automatic token refresh on expiration with retry
 * - Automatic redirect to login on authentication failure
 * - CSRF protection via SameSite cookies (handled by Better Auth)
 */

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Security: withCredentials enables cookies for CSRF protection
  withCredentials: true,
});

/**
 * Check if JWT token is expired or about to expire
 *
 * @param token - JWT token string
 * @param bufferSeconds - Consider token expired if it expires within this buffer (default: 60s)
 * @returns true if token is expired or about to expire
 */
function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  try {
    const decoded = decodeJwt(token);

    if (!decoded.exp) {
      // No expiration claim - consider it expired
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = decoded.exp;

    // Token is expired if current time + buffer >= expiration time
    return now + bufferSeconds >= expiresAt;
  } catch {
    // Failed to decode - consider it expired
    return true;
  }
}

/**
 * Request Interceptor: Attach JWT Token
 *
 * Uses cached token when available and valid
 * Only fetches fresh token when cached token is expired or missing
 * This minimizes unnecessary session checks while ensuring valid tokens
 */
apiClient.interceptors.request.use(
  async (config) => {
    // 1. Check cached token first
    let token = getCachedToken();

    // 2. If no cached token or expired, fetch fresh one
    // This only happens when making API calls, not continuously
    if (!token || isTokenExpired(token)) {
      try {
        const session = await authClient.client.token();
        if (session?.data?.token) {
          token = session.data.token;
          setCachedToken(token);
        }
      } catch (error) {
        // If token fetch fails, continue with cached token if available
        // The response interceptor will handle authentication failures
        console.warn('Failed to fetch fresh token, using cached token if available:', error);
      }
    }

    // 3. Attach token if available
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor: Handle JWT Expiration and Authentication Errors
 *
 * Flow:
 * 1. On 401 error, check if JWT is actually expired
 * 2. If expired, attempt single refresh via Better Auth
 * 3. If refresh succeeds with valid token, retry the original request
 * 4. If refresh fails or returns invalid token, redirect to login
 * 5. For non-expired tokens causing 401, don't redirect (insufficient permissions)
 *
 * This ensures session checks only happen during actual API calls and failures
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - JWT expired or invalid
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;

      // Extract token from original request
      const authHeader = originalRequest.headers?.Authorization as string | undefined;
      const token = authHeader?.replace('Bearer ', '');

      // Only attempt refresh if token exists and is actually expired
      // This prevents unnecessary refresh attempts for insufficient permissions
      if (token && isTokenExpired(token)) {
        try {
          // Single attempt to refresh session
          const session = await authClient.client.token();

          // If we got a valid, non-expired token, retry the request
          if (session?.data?.token && !isTokenExpired(session.data.token)) {
            // Update cache with fresh token
            setCachedToken(session.data.token);

            // Update the Authorization header
            originalRequest.headers.Authorization = `Bearer ${session.data.token}`;

            // Retry the original request with new token
            return apiClient(originalRequest);
          }

          // Refresh failed or returned invalid token - user needs to re-authenticate
          console.warn('Session refresh failed or returned invalid token, redirecting to login');
          authClient.redirectToLogin();
          return Promise.reject(error);
        } catch (refreshError) {
          // Session refresh failed completely - redirect to login
          console.warn('Session refresh error, redirecting to login:', refreshError);
          authClient.redirectToLogin();
          return Promise.reject(refreshError);
        }
      }

      // Token exists but not expired, or no token - likely insufficient permissions
      // Don't redirect, let the component handle the 401 error appropriately
      return Promise.reject(error);
    }

    // For other errors or already retried requests, just reject
    return Promise.reject(error);
  },
);

/**
 * Type-safe API request wrapper
 *
 * Provides better TypeScript inference for API calls
 */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}
