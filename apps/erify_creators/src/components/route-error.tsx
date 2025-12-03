import type { ErrorComponentProps } from '@tanstack/react-router';

import { Button } from '@eridu/ui';

/**
 * RouteError Component
 *
 * Global error handler for TanStack Router. Catches all errors in:
 * - Route components and their children
 * - Route loaders
 * - During route rendering
 *
 * Configured as `defaultErrorComponent` in the router configuration.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">
          Something went wrong
        </h1>
        <p className="mt-2 text-gray-600">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button type="button" onClick={() => reset?.()}>
            Try Again
          </Button>
          <Button
            type="button"
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}
