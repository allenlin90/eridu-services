import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useEffect, useState } from 'react';

import { Spinner } from '@eridu/ui';

import { NoStudioAssociationView, UnlinkedCreatorView } from '@/components/onboarding-guards';
import { SidebarLayout } from '@/layouts/sidebar-layout';
import { authClient, type Session } from '@/lib/auth';
import { useUserProfile } from '@/lib/hooks';
import { SessionProvider, useSession } from '@/lib/session-provider';
import { NotFoundPage } from '@/pages/not-found-page';

function ProfileGuardLayout({ session }: { session: Session }) {
  const { data: profile, isLoading: isProfileLoading, refetch } = useUserProfile();

  if (isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Spinner />
      </div>
    );
  }

  // 1. Guard: Account must be linked to a Creator record
  if (!profile || !profile.creator) {
    return (
      <UnlinkedCreatorView
        userName={session.user?.name}
        userEmail={session.user?.email}
        avatarUrl={session.user?.image || undefined}
        onRecheck={async () => {
          await refetch();
        }}
      />
    );
  }

  // 2. Guard: Must be active on at least one studio creator roster
  const hasActiveStudio = profile.creator.studio_creators?.some(
    (sc) => sc.is_active,
  );

  if (!hasActiveStudio) {
    return (
      <NoStudioAssociationView
        userName={session.user?.name}
        userEmail={session.user?.email}
        avatarUrl={session.user?.image || undefined}
        onRecheck={async () => {
          await refetch();
        }}
      />
    );
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

  return <ProfileGuardLayout session={session} />;
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

