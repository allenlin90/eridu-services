import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelShowWithResolution,
  getCancellationStatus,
  getGateActiveTaskCount,
  getGateErrorCode,
  requestCancellationResolution,
  resolveShowCancellation,
} from '../cancel-studio-show';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

function axiosErrorWith(data: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe('studio show cancellation gate API', () => {
  const mockedPost = vi.mocked(apiClient.post);
  const mockedGet = vi.mocked(apiClient.get);

  beforeEach(() => {
    mockedPost.mockReset();
    mockedGet.mockReset();
  });

  it('cancelShowWithResolution posts to the cancel-with-resolution endpoint', async () => {
    const payload = { reason_category: 'EQUIPMENT_FAILURE', reason_note: 'Camera failed', outcome: 'CANCELLED' as const };
    mockedPost.mockResolvedValue({ data: { id: 'show_1' } });

    await cancelShowWithResolution('studio_1', 'show_1', payload);

    expect(mockedPost).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/cancel-with-resolution',
      payload,
    );
  });

  it('resolveShowCancellation posts to the resolve-cancellation endpoint', async () => {
    const payload = { outcome: 'CANCELLED' as const, resolution_notes: 'Confirmed' };
    mockedPost.mockResolvedValue({ data: { id: 'show_1' } });

    await resolveShowCancellation('studio_1', 'show_1', payload);

    expect(mockedPost).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/resolve-cancellation',
      payload,
    );
  });

  it('requestCancellationResolution posts to the deferred dashboard endpoint', async () => {
    const payload = { reason_category: 'EQUIPMENT_FAILURE', reason_note: 'Camera failed' };
    mockedPost.mockResolvedValue({ data: { id: 'show_1' } });

    await requestCancellationResolution('studio_1', 'show_1', payload);

    expect(mockedPost).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/request-cancellation-resolution',
      payload,
    );
  });

  it('getCancellationStatus gets the cancellation-status endpoint', async () => {
    mockedGet.mockResolvedValue({ data: { is_pending: false } });

    const result = await getCancellationStatus('studio_1', 'show_1');

    expect(mockedGet).toHaveBeenCalledWith('/studios/studio_1/shows/show_1/cancellation-status', { signal: undefined });
    expect(result).toEqual({ is_pending: false });
  });

  it('extracts prefixed gate error codes and active task counts', () => {
    const error = axiosErrorWith({
      message: 'ACTIVE_TASKS_REMAIN:task_gate1',
      details: { activeTaskCount: 3 },
    });

    expect(getGateErrorCode(error)).toBe('ACTIVE_TASKS_REMAIN');
    expect(getGateActiveTaskCount(error)).toBe(3);
  });

  it('returns null for a non-axios or unprefixed error', () => {
    expect(getGateErrorCode(new Error('plain error'))).toBeNull();
    expect(getGateActiveTaskCount(new Error('plain error'))).toBeNull();
  });
});
