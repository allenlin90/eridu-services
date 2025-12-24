import { QueryCache, QueryClient } from '@tanstack/react-query';

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
      // Data considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Cache data for 30 mins (required for persistence)
      // Data older than this will be garbage collected
      gcTime: 30 * 60 * 1000,

      // Retry failed requests (except 4xx errors)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },

      // Refetch on window focus in production
      refetchOnWindowFocus: import.meta.env.PROD,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,

      // Don't throw errors, handle them in components
      throwOnError: false,
    },
    mutations: {
      // Retry mutations once for transient failures
      retry: 1,
    },
  },
  // Global error handler
  queryCache: new QueryCache({
    onError: (error) => {
      // Log errors for monitoring
      console.error('Query error:', error);

      // Could integrate with error tracking service (e.g., Sentry)
      // Sentry.captureException(error);
    },
  }),
});
