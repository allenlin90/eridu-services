import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useEffect, useState } from 'react';

import { Spinner } from '@eridu/ui';

import { SidebarLayout } from '@/layouts/sidebar-layout';
import { authClient, type Session } from '@/lib/auth';
import { SessionProvider, useSession } from '@/lib/session-provider';
import { NotFoundPage } from '@/pages/not-found-page';

function AuthenticatedLayout() {
  const { session, isLoading, checkSession } = useSession();
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  // Check session once when component mounts
  // This replaces the continuous polling with a single check
  useEffect(() => {
    const initializeSession = async () => {
      await checkSession();
      setHasCheckedSession(true);
    };

    initializeSession();
  }, [checkSession]);

  // Show loading state while checking session initially
  if (isLoading || !hasCheckedSession) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // If no session after checking, redirect to login
  if (!session) {
    authClient.redirectToLogin();
    return null;
  }

  return (
    <>
      <SidebarLayout>
        <Outlet />
      </SidebarLayout>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  );
}

function RootLayout() {
  return (
    <SessionProvider>
      <AuthenticatedLayout />
    </SessionProvider>
  );
}

export const Route = createRootRouteWithContext<{ auth: Session }>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});
