import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useUserProfile } from '../use-user';

// Mock useSession hook
vi.mock('@/lib/session-provider', () => ({
  useSession: () => ({
    session: { user: { id: 'test-user' } },
    isLoading: false,
    error: null,
    checkSession: vi.fn(),
    refreshSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

// Mock useQuery locally since the global test setup mocks @tanstack/react-query
vi.mocked(useQuery).mockReturnValue({
  data: {
    id: 'usr_1',
    name: 'Test Creator',
    email: 'test@example.com',
    creator: {
      uid: 'crt_1',
      name: 'Test Creator',
      alias_name: 'TC',
      studio_creators: [
        {
          studio: { uid: 'std_1', name: 'Studio One' },
          is_active: true,
        },
      ],
    },
  },
  isLoading: false,
  error: null,
  isSuccess: true,
  refetch: vi.fn(),
} as any);

describe('useUserProfile', () => {
  it('returns the mocked user profile data correctly', () => {
    const { result } = renderHook(() => useUserProfile());

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual({
      id: 'usr_1',
      name: 'Test Creator',
      email: 'test@example.com',
      creator: {
        uid: 'crt_1',
        name: 'Test Creator',
        alias_name: 'TC',
        studio_creators: [
          {
            studio: { uid: 'std_1', name: 'Studio One' },
            is_active: true,
          },
        ],
      },
    });
  });
});
