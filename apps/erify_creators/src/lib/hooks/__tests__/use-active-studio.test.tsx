import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useActiveStudio } from '../use-active-studio';
import { useUserProfile } from '../use-user';

// Mock useUserProfile
vi.mock('../use-user', () => ({
  useUserProfile: vi.fn(),
}));

// Mock useLocalStorage from usehooks-ts
const mockLocalStorageState = { value: null as string | null };
vi.mock('usehooks-ts', () => ({
  useLocalStorage: vi.fn((_key, initialValue) => {
    const setValue = vi.fn((val) => {
      mockLocalStorageState.value = val;
    });
    return [mockLocalStorageState.value || initialValue, setValue];
  }),
}));

// Mock TanStack Query's useQueryClient
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  };
});

describe('useActiveStudio', () => {
  it('correctly resolves and tracks the active studio context', () => {
    mockLocalStorageState.value = null;

    vi.mocked(useUserProfile).mockReturnValue({
      data: {
        id: 'usr_123',
        name: 'John Creator',
        email: 'john@example.com',
        creator: {
          uid: 'crt_999',
          name: 'John Creator',
          alias_name: 'JC',
          studio_creators: [
            {
              studio: { uid: 'std_1', name: 'Studio Alpha' },
              is_active: true,
            },
            {
              studio: { uid: 'std_2', name: 'Studio Beta' },
              is_active: false,
            },
            {
              studio: { uid: 'std_3', name: 'Studio Gamma' },
              is_active: true,
            },
          ],
        },
      },
    } as any);

    const { result } = renderHook(() => useActiveStudio());

    // Only active rosters are filtered in (Alpha and Gamma)
    expect(result.current.studios.length).toBe(2);
    expect(result.current.studios[0].studio.name).toBe('Studio Alpha');
    expect(result.current.studios[1].studio.name).toBe('Studio Gamma');

    // Default active studio should resolve to the first active roster (std_1)
    expect(result.current.activeStudioId).toBe('std_1');
    expect(result.current.activeStudio?.studio.name).toBe('Studio Alpha');
  });

  it('triggers query invalidation on switchStudio invocation', () => {
    mockLocalStorageState.value = 'std_1';
    const mockInvalidate = vi.fn();
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: mockInvalidate,
    } as any);

    const { result } = renderHook(() => useActiveStudio());

    act(() => {
      result.current.switchStudio('std_3');
    });

    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: ['me', 'shows'],
    });
  });
});
