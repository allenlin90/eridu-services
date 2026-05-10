import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCreateAdminCompensationLineItem,
  useDeleteAdminCompensationLineItem,
  useUpdateAdminCompensationLineItem,
} from '../use-compensation-line-item-mutations';

const mockInvalidateQueries = vi.fn();
const mockRemoveQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
    removeQueries: mockRemoveQueries,
  }),
  useMutation: ({ mutationFn, onSuccess }: any) => ({
    mutateAsync: async (args: any) => {
      const result = await mutationFn(args);
      if (onSuccess) {
        onSuccess(result, args);
      }
      return result;
    },
    isPending: false,
  }),
}));

const mockCreateApi = vi.fn().mockResolvedValue({ id: 'cmp_new' });
const mockUpdateApi = vi.fn().mockResolvedValue({ id: 'cmp_123' });
const mockDeleteApi = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/compensation-line-items/api/compensation-line-items.api', () => ({
  adminCompensationLineItemKeys: {
    lists: () => ['lists'],
    detail: (id: string) => ['detail', id],
  },
  createAdminCompensationLineItem: (data: any) => mockCreateApi(data),
  updateAdminCompensationLineItem: (id: string, data: any) => mockUpdateApi(id, data),
  deleteAdminCompensationLineItem: (id: string) => mockDeleteApi(id),
}));

describe('use-compensation-line-item-mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create invalidates lists on success', async () => {
    const { result } = renderHook(() => useCreateAdminCompensationLineItem());

    await act(async () => {
      await result.current.mutateAsync({ amount: '10' } as any);
    });

    expect(mockCreateApi).toHaveBeenCalledWith({ amount: '10' });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['lists'] });
  });

  it('update invalidates lists and detail on success', async () => {
    const { result } = renderHook(() => useUpdateAdminCompensationLineItem());

    await act(async () => {
      await result.current.mutateAsync({ id: 'cmp_123', data: { amount: '20' } as any });
    });

    expect(mockUpdateApi).toHaveBeenCalledWith('cmp_123', { amount: '20' });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['lists'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['detail', 'cmp_123'] });
  });

  it('delete invalidates lists and removes detail query on success', async () => {
    const { result } = renderHook(() => useDeleteAdminCompensationLineItem());

    await act(async () => {
      await result.current.mutateAsync('cmp_123');
    });

    expect(mockDeleteApi).toHaveBeenCalledWith('cmp_123');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['lists'] });
    expect(mockRemoveQueries).toHaveBeenCalledWith({ queryKey: ['detail', 'cmp_123'] });
  });
});
