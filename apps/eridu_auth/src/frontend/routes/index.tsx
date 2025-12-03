import { createFileRoute, redirect } from '@tanstack/react-router';

import { authClient } from '../features/auth/api/auth-client';
import { PortalPage } from '../pages/portal-page';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({ to: '/sign-in' });
    }
  },
  component: PortalPage,
});
