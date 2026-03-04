import { useLocation } from '@tanstack/react-router';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Clapperboard,
  ClipboardCheck,
  Film,
  Layers,
  LayoutDashboard,
  ListTodo,
  MonitorPlay,
  Ruler,
  Settings,
  Shapes,
  Users,
  UserSquare2,
  Videotape,
  Warehouse,
} from 'lucide-react';
import type * as React from 'react';
import { useCallback, useMemo } from 'react';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  type AppSidebarProps,
  type SidebarNavItem,
  type SidebarUser,
  TeamSwitcher,
} from '@eridu/ui';

import { authClient, type Session } from '@/lib/auth';
import { useIsSystemAdmin } from '@/lib/hooks/use-is-system-admin';
import { useStudioTeams } from '@/lib/hooks/use-studio-teams';

/**
 * System navigation configuration
 * Separated for maintainability and reusability
 */
const SYSTEM_NAV_ITEMS: SidebarNavItem['items'] = [
  {
    title: 'Clients',
    url: '/system/clients',
    icon: Building2,
  },
  {
    title: 'Studios',
    url: '/system/studios',
    icon: Warehouse,
  },
  {
    title: 'MCs',
    url: '/system/mcs',
    icon: MonitorPlay,
  },
  {
    title: 'Memberships',
    url: '/system/memberships',
    icon: Users,
  },
  {
    title: 'Users',
    url: '/system/users',
    icon: UserSquare2,
  },
  {
    title: 'Platforms',
    url: '/system/platforms',
    icon: Layers,
  },
  {
    title: 'Show Standards',
    url: '/system/show-standards',
    icon: Ruler,
  },
  {
    title: 'Show Statuses',
    url: '/system/show-statuses',
    icon: BadgeCheck,
  },
  {
    title: 'Show Types',
    url: '/system/show-types',
    icon: Shapes,
  },
  {
    title: 'Schedules',
    url: '/system/schedules',
    icon: CalendarDays,
  },
  {
    title: 'Tasks',
    url: '/system/tasks',
    icon: ListTodo,
  },
  {
    title: 'Task Templates',
    url: '/system/task-templates',
    icon: ClipboardCheck,
  },
  {
    title: 'Shows',
    url: '/system/shows',
    icon: Film,
  },
];

function normalizePath(url: string): string {
  const [path] = url.split('?');
  if (!path || path === '/')
    return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function isPathActive(pathname: string, targetUrl: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(targetUrl);
  if (target === '/')
    return current === '/';
  return current === target || current.startsWith(`${target}/`);
}

/**
 * Generates studio management navigation items based on user role
 * @param studioId - The unique identifier of the active studio
 * @param role - The user's role in the studio (admin, manager, member)
 * @returns Array of navigation sub-items for the Studio section
 */
function getStudioManagementItems(
  studioId: string,
  role: string,
): SidebarNavItem['items'] {
  const managementItems: SidebarNavItem['items'] = [
    {
      title: 'Dashboard',
      url: `/studios/${studioId}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      title: 'My Tasks',
      url: `/studios/${studioId}/my-tasks`,
      icon: ListTodo,
    },
  ];

  if (role === STUDIO_ROLE.ADMIN || role === STUDIO_ROLE.MANAGER) {
    managementItems.push({
      title: 'Review Queue',
      url: `/studios/${studioId}/tasks?status=REVIEW`,
      icon: ClipboardCheck,
    });
  }

  // Check role safely (case-insensitive)
  if (role === STUDIO_ROLE.ADMIN) {
    managementItems.push({
      title: 'Shift Schedule',
      url: `/studios/${studioId}/shifts`,
      icon: CalendarDays,
    });
    managementItems.push({
      title: 'Shows',
      url: `/studios/${studioId}/shows`,
      icon: Clapperboard,
    });
    managementItems.push({
      title: 'Task Templates',
      url: `/studios/${studioId}/task-templates`,
      icon: ClipboardCheck,
    });
  }

  return managementItems;
}

/**
 * Custom hook to configure the application sidebar
 * Generates navigation items based on user role, active studio, and system admin status
 * @param session - The current user session (null if not authenticated)
 * @returns Sidebar configuration props for AppSidebar component
 */
export function useSidebarConfig(
  session: Session | null,
): Omit<AppSidebarProps, keyof React.ComponentProps<'div'>> {
  const { isSystemAdmin } = useIsSystemAdmin();
  const { teams, activeTeam, activeStudio, handleTeamChange } = useStudioTeams();
  const location = useLocation();

  // Memoize nav items to prevent unnecessary re-renders
  const sidebarNavItems: SidebarNavItem[] = useMemo(() => {
    const currentPath = location.pathname;
    const buildActiveItems = (items: SidebarNavItem['items'] = []) =>
      items.map((item) => ({
        ...item,
        isActive: isPathActive(currentPath, item.url),
      }));

    const navItems: SidebarNavItem[] = [
      {
        title: 'Dashboard',
        url: `/dashboard`,
        icon: LayoutDashboard,
        isActive: isPathActive(currentPath, '/dashboard'),
      },
    ];

    // System items (if admin) - placed before studio management
    if (isSystemAdmin) {
      const systemItems = buildActiveItems(SYSTEM_NAV_ITEMS);
      navItems.push({
        title: 'System',
        url: '/system',
        icon: Settings,
        isActive: systemItems.some((item) => item.isActive),
        items: systemItems,
      });
    }
    if (activeStudio) {
      // Studio management items (appended last)
      const studioManagementItems = buildActiveItems(getStudioManagementItems(
        activeStudio.studio.uid,
        activeStudio.role,
      ));

      navItems.push({
        title: 'Studio',
        url: '/studios',
        icon: Videotape,
        isActive: studioManagementItems.some((item) => item.isActive),
        items: studioManagementItems,
      });
    }

    return navItems;
  }, [activeStudio, isSystemAdmin, location.pathname]);

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
    navMainLabel: 'Activities', // Hardcoded for now
    user,
    onLogout: handleLogout,
  };
}
