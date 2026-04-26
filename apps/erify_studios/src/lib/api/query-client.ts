import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

const INTERACTIVE_READ_STALE_TIME_MS = 20 * 1000;
const RATE_LIMIT_TOAST_DEDUPE_MS = 5 * 1000;

// Module-level singleton — intentional for dedup across the app lifetime.
// Tests that cover the 429 toast path should call vi.resetModules() or
// import query-client in an isolated module scope to avoid bleed between suites.
let lastRateLimitToastAt = 0;

function isRateLimitedError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof error.response === 'object'
    && error.response !== null
    && 'status' in error.response
    && error.response.status === 429;
}

function getHttpStatus(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }

  return undefined;
}

function getMutationErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    let message: unknown;
    if (error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data) {
      message = error.response.data.message;
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
}

declare module '@tanstack/react-query' {
  // eslint-disable-next-line -- TanStack query module augmentation requires interface
  interface Register {
    defaultError: Error;
    mutationMeta: {
      suppressErrorToast?: boolean;
      errorMessage?: string;
    };
  }
}

/**
 * TanStack Query Client Configuration
 *
 * Best Practices:
 * - Conservative staleTime to balance freshness and performance
 * - Retry logic for transient failures
 * - Error handling for failed queries
 * - Extended gcTime for IndexedDB persistence (24 hours)
 *
 * Note: Persistence is configured in main.tsx with PersistQueryClientProvider
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep interactive reads warm across route transitions to avoid burst refetches.
      staleTime: INTERACTIVE_READ_STALE_TIME_MS,

      // Keeps data in cache for instant UI rendering while background fetch runs
      gcTime: 30 * 60 * 1000,

      // Retry failed requests (except 4xx errors)
      retry: (failureCount, error) => {
        const status = getHttpStatus(error);
        // Don't retry on 4xx errors (client errors)
        if (status !== undefined && status >= 400 && status < 500) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },

      // Intentionally disabled globally for erify_studios (internal-tool app).
      // Route churn with staleTime: 0 caused 429 bursts on every tab switch.
      // Operational reads (/me/*) opt back in per-hook where near-real-time matters.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,

      // default behavior is refetchOnMount: true (when stale), keeping implicit to ensure stale-while-revalidate mechanism

      // Don't throw errors, handle them in components
      throwOnError: false,
    },
    mutations: {
      // Retry mutations once for transient failures
      retry: 1,
    },
  },
  // Global query error handler
  queryCache: new QueryCache({
    onError: (error) => {
      if (axios.isCancel(error)) {
        return;
      }

      if (isRateLimitedError(error)) {
        const now = Date.now();
        if (now - lastRateLimitToastAt >= RATE_LIMIT_TOAST_DEDUPE_MS) {
          lastRateLimitToastAt = now;
          toast.error('Too many background requests. Wait a few seconds or refresh.');
        }
        return;
      }

      // Log errors for monitoring
      console.error('Query error:', error);

      // Could integrate with error tracking service (e.g., Sentry)
      // Sentry.captureException(error);
    },
  }),
  // Global mutation error handler
  mutationCache: new MutationCache({
    onError: (error, variables, _context, mutation) => {
      // Support dynamic suppression for autosave mutations
      if (typeof variables === 'object' && variables !== null && 'silent' in variables && variables.silent) {
        return;
      }

      if (mutation.meta?.suppressErrorToast === true) {
        return; // Skip global handling
      }

      const defaultMessage = 'An error occurred during the operation.';
      const errorMessage
        = (mutation.meta?.errorMessage as string)
        || getMutationErrorMessage(error)
        || defaultMessage;

      toast.error(errorMessage);
    },
  }),
});
