import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  onboardStudioCreator,
  useOnboardStudioCreator,
} from '../studio-creator-roster';

import { apiClient } from '@/lib/api/client';

const mockUseMutation = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useMutation: (options: unknown) => mockUseMutation(options),
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('studioCreatorRoster onboarding api', () => {
  it('posts onboarding payload to studio onboarding endpoint', async () => {
    const payload = {
      creator: {
        name: 'Alice Example',
        alias_name: 'Alice',
      },
      roster: {
        default_rate: 500,
        default_rate_type: 'FIXED',
      },
    };

    (apiClient.post as any).mockResolvedValue({ data: { id: 'scr_1' } });

    await onboardStudioCreator('std_123', payload as any);

    expect(apiClient.post).toHaveBeenCalledWith('/studios/std_123/creators/onboard', payload);
  });

  it('invalidates roster, catalog, and availability keys after onboarding success', () => {
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });

    renderHook(() => useOnboardStudioCreator('std_1'));

    expect(mockUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );

    const mutationOptions = mockUseMutation.mock.calls[0][0];
    mutationOptions.onSuccess();

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['studio-creator-roster', 'list', 'std_1'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['creator-catalog', 'list', 'std_1'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['creator-availability', 'list', 'std_1'],
    });
  });
});
