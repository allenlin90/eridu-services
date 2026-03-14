import { useLocation } from '@tanstack/react-router';
import { Command, Video } from 'lucide-react';
import type * as React from 'react';
import { useMemo } from 'react';

import type {
  AppSidebarProps,
  SidebarHeaderContent,
  SidebarNavItem,
  SidebarUser,
} from '@eridu/ui';

import { authClient, type Session } from '@/lib/auth';
import * as m from '@/paraglide/messages.js';

const sidebarHeader: SidebarHeaderContent = {
  icon: Command,
  title: 'Erify',
  subtitle: 'Creators',
  url: '/',
};

function normalizePath(url: string): string {
  const [path] = url.split('?');
  if (!path || path === '/') {
    return '/';
  }
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function isPathActive(pathname: string, targetUrl: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(targetUrl);

  if (target === '/') {
    return current === '/';
  }

  return current === target || current.startsWith(`${target}/`);
}

export function useSidebarConfig(
  session: Session | null,
): Omit<AppSidebarProps, keyof React.ComponentProps<'div'>> {
  const location = useLocation();

  const sidebarNavItems = useMemo<SidebarNavItem[]>(() => [
    {
      title: m['sidebar.shows'](),
      url: '/shows',
      icon: Video,
      isActive: isPathActive(location.pathname, '/shows'),
      items: [],
    },
  ], [location.pathname]);

  const handleLogout = async () => {
    // Import clearAllCaches dynamically to avoid circular dependencies
    const { clearAllCaches } = await import('@/lib/api');

    // Clear all caches before signing out to prevent data leakage
    await clearAllCaches();

    // Sign out and redirect to login
    await authClient.client.signOut();
    authClient.redirectToLogin();
  };

  // Map session user data to SidebarUser type
  const user: SidebarUser | undefined = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image || '/avatars/default.jpg',
      }
    : undefined;

  return {
    header: sidebarHeader,
    navMain: sidebarNavItems,
    navMainLabel: m['sidebar.activities'](),
    user,
    onLogout: handleLogout,
  };
}
