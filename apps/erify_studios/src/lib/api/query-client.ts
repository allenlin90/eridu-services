import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

declare module '@tanstack/react-query' {
  // eslint-disable-next-line -- TanStack query module augmentation requires interface
  interface Register {
    defaultError: Error;
  }
  // eslint-disable-next-line -- TanStack query module augmentation requires interface
  interface MutationMeta {
    suppressErrorToast?: boolean;
    errorMessage?: string;
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
      // Data is instantly considered stale. This ensures revalidation on mount/focus.
      staleTime: 0,

      // Keeps data in cache for instant UI rendering while background fetch runs
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
      // Log errors for monitoring
      console.error('Query error:', error);

      // Could integrate with error tracking service (e.g., Sentry)
      // Sentry.captureException(error);
    },
  }),
  // Global mutation error handler
  mutationCache: new MutationCache({
    onError: (error: any, variables, _context, mutation) => {
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
        || error?.response?.data?.message
        || error?.message
        || defaultMessage;

      toast.error(errorMessage);
    },
  }),
});
