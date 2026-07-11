import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { schedulePublishImpactKeys } from '../get-schedule-publish-impacts';
import { useResolveScheduleConflict } from '../resolve-schedule-conflict';

import { apiClient } from '@/lib/api/client';

vi.mock('@tanstack/react-query', async () => await vi.importActual('@tanstack/react-query'));
vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useResolveScheduleConflict', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(apiClient.post).mockReset();
  });

  it('replaces the resolved row in every cached list page without invalidating', async () => {
    const params = { page: 1, limit: 25 };
    const staleRow = {
      audit_id: 'aud_1',
      impact_kind: 'stale_conflict',
      conflict_uid: 'conflict_1',
      conflict_type: 'update_held_back',
      resolution_status: 'pending',
      held_back: null,
      schedule_id: null,
      external_id: 'EXT-1',
      changed_fields: ['name'],
      relation_changes: {},
      show: { id: 'show_1', name: 'Test Show', external_id: 'EXT-1', start_time: '2026-01-01T00:00:00.000Z', end_time: '2026-01-01T02:00:00.000Z', status_name: 'Draft', status_system_key: 'DRAFT', client_id: null, client_name: null },
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const resolvedRow = { ...staleRow, resolution_status: 'applied' };

    queryClient.setQueryData(schedulePublishImpactKeys.list('studio_1', params), {
      data: [staleRow],
      meta: { total: 1, totalPages: 1 },
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: resolvedRow });

    const { result } = renderHook(() => useResolveScheduleConflict('studio_1'), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ showId: 'show_1', conflictUid: 'conflict_1', data: { action: 'apply', reason: 'confirmed' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData(schedulePublishImpactKeys.list('studio_1', params)) as { data: typeof staleRow[] };
    expect(cached.data[0]!.resolution_status).toBe('applied');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/schedule-publish-impacts/conflict_1/resolve',
      { action: 'apply', reason: 'confirmed' },
    );
  });

  it('invalidates cached lists instead of patching when the show is no longer eligible', async () => {
    const params = { page: 1, limit: 25 };
    const staleRow = {
      audit_id: 'aud_1',
      impact_kind: 'stale_conflict',
      conflict_uid: 'conflict_1',
      conflict_type: 'update_held_back',
      resolution_status: 'pending',
      held_back: null,
      schedule_id: null,
      external_id: 'EXT-1',
      changed_fields: ['name'],
      relation_changes: {},
      show: { id: 'show_1', name: 'Test Show', external_id: 'EXT-1', start_time: '2026-01-01T00:00:00.000Z', end_time: '2026-01-01T02:00:00.000Z', status_name: 'Draft', status_system_key: 'DRAFT', client_id: null, client_name: null },
      created_at: '2026-01-01T00:00:00.000Z',
    };

    queryClient.setQueryData(schedulePublishImpactKeys.list('studio_1', params), {
      data: [staleRow],
      meta: { total: 1, totalPages: 1 },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { data: { message: 'SHOW_NO_LONGER_ELIGIBLE' }, status: 409, statusText: 'Conflict', headers: {}, config: {} },
      toJSON: () => ({}),
    });
    vi.mocked(apiClient.post).mockRejectedValue(axiosError);

    const { result } = renderHook(() => useResolveScheduleConflict('studio_1'), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ showId: 'show_1', conflictUid: 'conflict_1', data: { action: 'apply', reason: 'confirmed' } });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: schedulePublishImpactKeys.listPrefix('studio_1') });
    // Cache is left stale (not patched) — the invalidation above is what drives the refetch.
    const cached = queryClient.getQueryData(schedulePublishImpactKeys.list('studio_1', params)) as { data: typeof staleRow[] };
    expect(cached.data[0]!.resolution_status).toBe('pending');
  });

  /**
   * PR #272 review finding: another manager/session resolving the conflict
   * first previously fell through to a generic toast with no cache
   * invalidation — the cached row stayed `pending` with the Review action
   * still clickable, so a retry would keep posting against a conflict the
   * server had already closed. Treat CONFLICT_ALREADY_RESOLVED the same way
   * as SHOW_NO_LONGER_ELIGIBLE: invalidate rather than patch.
   */
  it('invalidates cached lists instead of patching when the conflict was already resolved by someone else', async () => {
    const params = { page: 1, limit: 25 };
    const staleRow = {
      audit_id: 'aud_1',
      impact_kind: 'stale_conflict',
      conflict_uid: 'conflict_1',
      conflict_type: 'update_held_back',
      resolution_status: 'pending',
      held_back: null,
      schedule_id: null,
      external_id: 'EXT-1',
      changed_fields: ['name'],
      relation_changes: {},
      show: { id: 'show_1', name: 'Test Show', external_id: 'EXT-1', start_time: '2026-01-01T00:00:00.000Z', end_time: '2026-01-01T02:00:00.000Z', status_name: 'Draft', status_system_key: 'DRAFT', client_id: null, client_name: null },
      created_at: '2026-01-01T00:00:00.000Z',
    };

    queryClient.setQueryData(schedulePublishImpactKeys.list('studio_1', params), {
      data: [staleRow],
      meta: { total: 1, totalPages: 1 },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { data: { message: 'CONFLICT_ALREADY_RESOLVED' }, status: 409, statusText: 'Conflict', headers: {}, config: {} },
      toJSON: () => ({}),
    });
    vi.mocked(apiClient.post).mockRejectedValue(axiosError);

    const { result } = renderHook(() => useResolveScheduleConflict('studio_1'), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ showId: 'show_1', conflictUid: 'conflict_1', data: { action: 'apply', reason: 'confirmed' } });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: schedulePublishImpactKeys.listPrefix('studio_1') });
    const cached = queryClient.getQueryData(schedulePublishImpactKeys.list('studio_1', params)) as { data: typeof staleRow[] };
    expect(cached.data[0]!.resolution_status).toBe('pending');
  });
});
