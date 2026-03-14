import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSidebarConfig } from '../sidebar-config';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  BadgeCheck: vi.fn(),
  Clapperboard: vi.fn(),
  ClipboardCheck: vi.fn(),
  Command: vi.fn(),
  LayoutDashboard: vi.fn(),
  Building2: vi.fn(),
  Film: vi.fn(),
  Layers: vi.fn(),
  ListTodo: vi.fn(),
  MonitorPlay: vi.fn(),
  Ruler: vi.fn(),
  Settings: vi.fn(),
  ShieldAlert: vi.fn(),
  ShieldCheck: vi.fn(),
  Shapes: vi.fn(),
  Users: vi.fn(),
  UserSquare2: vi.fn(),
  CalendarDays: vi.fn(),
  Videotape: vi.fn(),
  Warehouse: vi.fn(),
}));

// Mock auth client
vi.mock('@/lib/auth', () => ({
  authClient: {
    client: {
      signOut: vi.fn(),
    },
    redirectToLogin: vi.fn(),
  },
}));

// Mock API clearAllCaches
vi.mock('@/lib/api', () => ({
  clearAllCaches: vi.fn().mockResolvedValue(undefined),
}));

// Mock useLocation hook
const mockUseLocation = vi.fn();
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockUseLocation(),
  useNavigate: () => mockNavigate,
}));

// Mock useSession hook
const mockUseSession = vi.fn();
vi.mock('@/lib/session-provider', () => ({
  useSession: () => mockUseSession(),
}));

// Mock useUserProfile hook
const mockUseUserProfile = vi.fn();
vi.mock('@/lib/hooks/use-user', () => ({
  useUserProfile: () => mockUseUserProfile(),
}));

describe('useSidebarConfig', () => {
  const mockSession = {
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      image: '/avatars/john.jpg',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock session
    mockUseSession.mockReturnValue({
      session: mockSession,
      isLoading: false,
      error: null,
      checkSession: vi.fn(),
      refreshSession: vi.fn(),
      clearSession: vi.fn(),
    });
    // Set up default mock user profile
    mockUseUserProfile.mockReturnValue({
      data: {
        ext_id: 'user-123',
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        image: '/avatars/john.jpg',
        is_system_admin: true, // Mock as system admin for tests
        // Add studio memberships to mock data
        studio_memberships: [
          {
            studio: { uid: 'studio-1', name: 'Studio 1' },
            role: 'admin',
          },
          {
            studio: { uid: 'studio-2', name: 'Studio 2' },
            role: 'member',
          },
          {
            studio: { uid: 'studio-3', name: 'Studio 3' },
            role: 'admin',
          },
        ],
        payload: {
          sub: 'user-123',
          email: 'john@example.com',
          activeOrganizationId: 'org-123',
          activeTeamId: 'team-123',
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('returns sidebar config with correct header', () => {
    mockUseLocation.mockReturnValue({ pathname: '/' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    // Header should be a TeamSwitcher component
    const header = result.current.header as React.ReactElement;

    expect((header.type as any).name).toBe('TeamSwitcher');
    expect((header as any).props.teams).toHaveLength(3);
  });

  it('returns sidebar config with navigation items', () => {
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    expect(result.current.navMain).toHaveLength(6); // Dashboard + App Recovery + System + Studio Common + Studio Admin + Creators
    expect(result.current.navMain[0]).toEqual({
      title: 'Dashboard',
      url: '/dashboard',
      icon: expect.any(Function),
      isActive: true,
      // items removed as it's not present in the implementation
    });

    expect(result.current.navMain[1]).toEqual({
      title: 'App Recovery',
      url: '/app-recovery',
      icon: expect.any(Function),
      isActive: false,
    });

    expect(result.current.navMain[2]).toEqual({
      title: 'System',
      url: '/system',
      icon: expect.any(Function),
      isActive: false,
      items: expect.arrayContaining([
        expect.objectContaining({ title: 'Clients', url: '/system/clients' }),
        expect.objectContaining({ title: 'Studios', url: '/system/studios' }),
        expect.objectContaining({ title: 'Creators', url: '/system/creators' }),
        expect.objectContaining({ title: 'Memberships', url: '/system/memberships' }),
        expect.objectContaining({ title: 'Users', url: '/system/users' }),
        expect.objectContaining({ title: 'Platforms', url: '/system/platforms' }),
        expect.objectContaining({ title: 'Show Standards', url: '/system/show-standards' }),
        expect.objectContaining({ title: 'Show Statuses', url: '/system/show-statuses' }),
        expect.objectContaining({ title: 'Show Types', url: '/system/show-types' }),
        expect.objectContaining({ title: 'Schedules', url: '/system/schedules' }),
        expect.objectContaining({ title: 'Tasks', url: '/system/tasks' }),
        expect.objectContaining({ title: 'Task Templates', url: '/system/task-templates' }),
        expect.objectContaining({ title: 'Shows', url: '/system/shows' }),
      ]),
    });

    expect(result.current.navMain[3]).toEqual(expect.objectContaining({
      title: 'Studio Common',
      url: '/studios/studio-1',
      icon: expect.any(Function),
      isActive: false,
      items: expect.arrayContaining([
        expect.objectContaining({
          title: 'Dashboard',
          url: '/studios/studio-1/dashboard',
        }),
        expect.objectContaining({
          title: 'My Tasks',
          url: '/studios/studio-1/my-tasks',
        }),
        expect.objectContaining({
          title: 'My Shifts',
          url: '/studios/studio-1/my-shifts',
        }),
      ]),
    }));

    expect(result.current.navMain[4]).toEqual(expect.objectContaining({
      title: 'Studio Admin',
      url: '/studios/studio-1/admin',
      icon: expect.any(Function),
      isActive: false,
      items: expect.arrayContaining([
        expect.objectContaining({
          title: 'Review Queue',
          url: '/studios/studio-1/review-queue',
        }),
        expect.objectContaining({
          title: 'Shift Schedule',
          url: '/studios/studio-1/shifts',
        }),
      ]),
    }));

    expect(result.current.navMain[5]).toEqual(expect.objectContaining({
      title: 'Creators',
      url: '/studios/studio-1/creator-mapping',
      icon: expect.any(Function),
      isActive: false,
      items: expect.arrayContaining([
        expect.objectContaining({
          title: 'Creator Mapping',
          url: '/studios/studio-1/creator-mapping',
        }),
      ]),
    }));
  });

  it('sets system navigation as active when on system routes', () => {
    mockUseLocation.mockReturnValue({ pathname: '/system/studios' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    expect(result.current.navMain[2].isActive).toBe(true);
    expect(result.current.navMain[0].isActive).toBe(false);
  });

  it('sets dashboard as active when on dashboard route', () => {
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    expect(result.current.navMain[0].isActive).toBe(true);
    expect(result.current.navMain[2].isActive).toBe(false);
  });

  it('returns user data when session exists', () => {
    mockUseLocation.mockReturnValue({ pathname: '/' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    expect(result.current.user).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '/avatars/john.jpg',
    });
  });

  it('returns undefined user when session is null', () => {
    mockUseLocation.mockReturnValue({ pathname: '/' });

    const { result } = renderHook(() => useSidebarConfig(null));

    expect(result.current.user).toBeUndefined();
  });

  it('returns correct navMainLabel', () => {
    mockUseLocation.mockReturnValue({ pathname: '/' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    expect(result.current.navMainLabel).toBe('Workspace');
  });

  it('provides logout handler that clears caches and signs out', async () => {
    mockUseLocation.mockReturnValue({ pathname: '/' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    const { clearAllCaches } = await import('@/lib/api');
    const { authClient } = await import('@/lib/auth');

    await result.current.onLogout?.();

    expect(clearAllCaches).toHaveBeenCalled();
    expect(authClient.client.signOut).toHaveBeenCalled();
    expect(authClient.redirectToLogin).toHaveBeenCalled();
  });
});
