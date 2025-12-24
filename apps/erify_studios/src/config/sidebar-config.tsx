import { useLocation } from '@tanstack/react-router';
import {
  AudioWaveform,
  Building2,
  Command,
  GalleryVerticalEnd,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import type * as React from 'react';
import { useCallback, useMemo } from 'react';

import {
  type AppSidebarProps,
  type SidebarNavItem,
  type SidebarUser,
  type Team,
  TeamSwitcher,
} from '@eridu/ui';

import { authClient, type Session } from '@/lib/auth';
import { useIsSystemAdmin } from '@/lib/hooks/use-is-system-admin';

// Mock teams data
const teams: Team[] = [
  {
    name: 'Erify Studio',
    logo: GalleryVerticalEnd,
    plan: 'Enterprise',
  },
  {
    name: 'Acme Corp.',
    logo: AudioWaveform,
    plan: 'Startup',
  },
  {
    name: 'Evil Corp.',
    logo: Command,
    plan: 'Free',
  },
];

/**
 * System navigation configuration
 * Separated for maintainability and reusability
 */
const SYSTEM_NAV_ITEMS: SidebarNavItem[] = [
  {
    title: 'Clients',
    url: '/system/clients',
    icon: Building2,
  },
  {
    title: 'Studios',
    url: '/system/studios',
    icon: Building2,
  },
  {
    title: 'MCs',
    url: '/system/mcs',
    icon: Users,
  },
  {
    title: 'Memberships',
    url: '/system/memberships',
    icon: Users,
  },
  {
    title: 'Users',
    url: '/system/users',
    icon: Users,
  },
  {
    title: 'Platforms',
    url: '/system/platforms',
    icon: Settings,
  },
  {
    title: 'Show Standards',
    url: '/system/show-standards',
    icon: Settings,
  },
  {
    title: 'Show Types',
    url: '/system/show-types',
    icon: Settings,
  },
];

export function useSidebarConfig(
  session: Session | null,
): Omit<AppSidebarProps, keyof React.ComponentProps<'div'>> {
  const location = useLocation();
  const currentPath = location.pathname;
  const { isSystemAdmin } = useIsSystemAdmin();

  // Memoize nav items to prevent unnecessary re-renders
  const sidebarNavItems: SidebarNavItem[] = useMemo(() => {
    const baseItems: SidebarNavItem[] = [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
        isActive: currentPath === '/dashboard',
        items: [],
      },
    ];

    // Only include admin nav if user is system admin
    if (isSystemAdmin) {
      baseItems.push({
        title: 'System',
        url: '/system',
        icon: Settings,
        isActive: currentPath.startsWith('/system'),
        items: SYSTEM_NAV_ITEMS,
      });
    }

    return baseItems;
  }, [currentPath, isSystemAdmin]);

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
    header: <TeamSwitcher teams={teams} />,
    navMain: sidebarNavItems,
    navMainLabel: 'Activities', // Hardcoded for now
    user,
    onLogout: handleLogout,
  };
}
