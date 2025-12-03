import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SidebarHeaderContent } from '@eridu/ui';

import { useSidebarConfig } from '../sidebar-config';

import { authClient } from '@/lib/auth';

// Mock the auth client
vi.mock('@/lib/auth', () => ({
  authClient: {
    client: {
      signOut: vi.fn(),
    },
    redirectToLogin: vi.fn(),
  },
}));

// Mock the API module to prevent IndexedDB calls
vi.mock('@/lib/api', () => ({
  clearAllCaches: vi.fn(),
}));

// Mock the messages
vi.mock('@/paraglide/messages.js', () => ({
  'sidebar.activities': vi.fn(() => 'Activities'),
  'sidebar.shows': vi.fn(() => 'Shows'),
}));

describe('useSidebarConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct config structure', () => {
    const session = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        image: '/avatars/john.jpg',
      },
    };

    const { result } = renderHook(() => useSidebarConfig(session));

    expect(result.current).toHaveProperty('header');
    expect(result.current).toHaveProperty('navMain');
    expect(result.current).toHaveProperty('navMainLabel');
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('onLogout');
  });

  it('maps session user to SidebarUser type', () => {
    const session = {
      user: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        image: '/avatars/jane.jpg',
      },
    };

    const { result } = renderHook(() => useSidebarConfig(session));

    expect(result.current.user).toEqual({
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: '/avatars/jane.jpg',
    });
  });

  it('uses default avatar when user has no image', () => {
    const session = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        image: null,
      },
    };

    const { result } = renderHook(() => useSidebarConfig(session));

    expect(result.current.user).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '/avatars/default.jpg',
    });
  });

  it('returns undefined user when session is null', () => {
    const { result } = renderHook(() => useSidebarConfig(null));

    expect(result.current.user).toBeUndefined();
  });

  it('returns undefined user when session has no user', () => {
    const session = { user: null } as const;

    const { result } = renderHook(() => useSidebarConfig(session));

    expect(result.current.user).toBeUndefined();
  });

  it('calls signOut and redirectToLogin on logout', async () => {
    const session = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        image: '/avatars/john.jpg',
      },
    };

    const { result } = renderHook(() => useSidebarConfig(session));

    expect(result.current.onLogout).toBeDefined();
    await result.current.onLogout!();

    expect(vi.mocked(authClient.client.signOut)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(authClient.redirectToLogin)).toHaveBeenCalledTimes(1);
  });

  it('has correct header configuration', () => {
    const session = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        image: '/avatars/john.jpg',
      },
    };

    const { result } = renderHook(() => useSidebarConfig(session));

    expect(result.current.header).toMatchObject({
      title: 'Erify',
      subtitle: 'Studio',
      url: '/',
    });
    expect((result.current.header as SidebarHeaderContent).icon).toBeDefined();
  });

  it('has correct navMain configuration', () => {
    const session = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        image: '/avatars/john.jpg',
      },
    };

    const { result } = renderHook(() => useSidebarConfig(session));

    expect(result.current.navMain).toHaveLength(1);
    expect(result.current.navMain[0]).toMatchObject({
      title: 'Shows',
      url: '/shows',
      isActive: true,
      items: [],
    });
    expect(result.current.navMain[0]?.icon).toBeDefined();
  });

  it('has correct navMainLabel', () => {
    const session = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        image: '/avatars/john.jpg',
      },
    };

    const { result } = renderHook(() => useSidebarConfig(session));

    expect(result.current.navMainLabel).toBe('Activities');
  });
});
