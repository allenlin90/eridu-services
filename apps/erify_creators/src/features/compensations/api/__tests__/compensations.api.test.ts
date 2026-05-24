import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMyShowCompensations } from '../compensations.api';

import { queryKeys } from '@/lib/api/query-keys';

describe('useMyShowCompensations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct parameters', () => {
    const params = {
      studio_id: 'std_1',
      date_from: '2026-05-01T00:00:00.000Z',
      date_to: '2026-05-31T23:59:59.999Z',
    };

    renderHook(() => useMyShowCompensations(params));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.compensations.list(params),
        enabled: true,
      }),
    );
  });

  it('disables query when required parameters are missing', () => {
    const params = {
      studio_id: '',
      date_from: '',
      date_to: '',
    };

    renderHook(() => useMyShowCompensations(params));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });
});
