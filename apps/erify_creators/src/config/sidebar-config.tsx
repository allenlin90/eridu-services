import { useLocation, useNavigate } from '@tanstack/react-router';
import { DollarSign, Video } from 'lucide-react';
import type * as React from 'react';
import { useCallback, useMemo } from 'react';

import {
  type AppSidebarProps,
  type SidebarNavItem,
  type SidebarUser,
  TeamSwitcher,
} from '@eridu/ui';

import { authClient, type Session } from '@/lib/auth';
import { useCreatorStudios } from '@/lib/hooks';
import * as m from '@/paraglide/messages.js';

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
  const navigate = useNavigate();
  const { teams, activeTeam, handleTeamChange } = useCreatorStudios();

  const sidebarNavItems = useMemo<SidebarNavItem[]>(() => [
    {
      title: m['sidebar.shows'](),
      url: '/shows',
      icon: Video,
      isActive: isPathActive(location.pathname, '/shows'),
      items: [],
    },
    {
      title: m['sidebar.compensations'](),
      url: '/compensations',
      icon: DollarSign,
      isActive: isPathActive(location.pathname, '/compensations'),
      items: [],
    },
  ], [location.pathname]);

  const handleSettingsClick = useCallback(() => {
    void navigate({ to: '/settings' });
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    // Import clearAllCaches dynamically to avoid circular dependencies
    const { clearAllCaches } = await import('@/lib/api');

    // Clear all caches before signing out to prevent data leakage
    await clearAllCaches();

    // Sign out and redirect to login
    await authClient.client.signOut();
    authClient.redirectToLogin();
  }, []);

  // Map session user data to SidebarUser type
  const user: SidebarUser | undefined = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image || '/avatars/default.jpg',
      }
    : undefined;

  return {
    header: (
      <TeamSwitcher
        teams={teams}
        activeTeam={activeTeam}
        onTeamChange={handleTeamChange}
      />
    ),
    navMain: sidebarNavItems,
    navMainLabel: m['sidebar.activities'](),
    user,
    onLogout: handleLogout,
    onSettingsClick: handleSettingsClick,
  };
}
