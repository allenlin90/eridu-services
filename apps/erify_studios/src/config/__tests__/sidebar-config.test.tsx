import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSidebarConfig } from '../sidebar-config';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Command: vi.fn(),
  LayoutDashboard: vi.fn(),
  GalleryVerticalEnd: vi.fn(),
  AudioWaveform: vi.fn(),
  Building2: vi.fn(),
  Settings: vi.fn(),
  Users: vi.fn(),
  CalendarDays: vi.fn(),
  Tv: vi.fn(),
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
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockUseLocation(),
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
    expect(result.current.header.type.name).toBe('TeamSwitcher');
    expect(result.current.header.props.teams).toHaveLength(3);
  });

  it('returns sidebar config with navigation items', () => {
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    expect(result.current.navMain).toHaveLength(3); // Dashboard + System + Admin
    expect(result.current.navMain[0]).toEqual({
      title: 'Dashboard',
      url: '/dashboard',
      icon: expect.any(Function),
      isActive: true,
      items: [],
    });

    expect(result.current.navMain[1]).toEqual({
      title: 'System',
      url: '/system',
      icon: expect.any(Function),
      isActive: false,
      items: expect.arrayContaining([
        { title: 'Clients', url: '/system/clients', icon: expect.any(Function) },
        { title: 'Studios', url: '/system/studios', icon: expect.any(Function) },
        { title: 'MCs', url: '/system/mcs', icon: expect.any(Function) },
        { title: 'Memberships', url: '/system/memberships', icon: expect.any(Function) },
        { title: 'Platforms', url: '/system/platforms', icon: expect.any(Function) },
        { title: 'Show Standards', url: '/system/show-standards', icon: expect.any(Function) },
        { title: 'Show Types', url: '/system/show-types', icon: expect.any(Function) },
      ]),
    });
  });

  it('sets system navigation as active when on system routes', () => {
    mockUseLocation.mockReturnValue({ pathname: '/system/studios' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    expect(result.current.navMain[1].isActive).toBe(true);
    expect(result.current.navMain[0].isActive).toBe(false);
  });

  it('sets dashboard as active when on dashboard route', () => {
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    expect(result.current.navMain[0].isActive).toBe(true);
    expect(result.current.navMain[1].isActive).toBe(false);
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

    expect(result.current.navMainLabel).toBe('Activities');
  });

  it('provides logout handler that clears caches and signs out', async () => {
    mockUseLocation.mockReturnValue({ pathname: '/' });

    const { result } = renderHook(() => useSidebarConfig(mockSession));

    const { clearAllCaches } = await import('@/lib/api');
    const { authClient } = await import('@/lib/auth');

    await result.current.onLogout();

    expect(clearAllCaches).toHaveBeenCalled();
    expect(authClient.client.signOut).toHaveBeenCalled();
    expect(authClient.redirectToLogin).toHaveBeenCalled();
  });
});
