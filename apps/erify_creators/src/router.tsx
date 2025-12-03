import { createRouter } from '@tanstack/react-router';

import { RouteError } from '@/components/route-error';
import { RoutePending } from '@/components/route-pending';
import { routeTree } from '@/routeTree.gen';

declare module '@tanstack/react-router' {
  // eslint-disable-next-line ts/consistent-type-definitions
  interface Register {
    router: typeof router;
  }
}

// Create a new router instance
export const router = createRouter({
  routeTree,
  defaultErrorComponent: RouteError,
  defaultPendingComponent: RoutePending,
  context: {
    auth: undefined!, // Will be set by root route's beforeLoad
  },
});

export default router;
