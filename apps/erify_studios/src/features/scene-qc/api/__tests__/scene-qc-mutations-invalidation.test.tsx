import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRetireSceneProfile } from '../retire-scene-profile';
import { useSaveSceneProfile } from '../save-scene-profile';
import { useCreateSceneQcReview, useUpdateSceneQcReview } from '../save-scene-qc-review';
import { sceneQcKeys } from '../scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: { put: vi.fn(), delete: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

// The global test setup mocks `useQueryClient` to return `{}`, which is fine
// for tests that only render a query. Invalidation-scope assertions need the
// real QueryClient instance flowing through `useQueryClient()`, so restore
// the actual implementation for this file (mirrors
// features/shows/api/__tests__/resolve-schedule-conflict.test.tsx).
vi.mock('@tanstack/react-query', async () => await vi.importActual('@tanstack/react-query'));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, invalidateSpy };
}

describe('scene-qc mutation invalidation scope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useSaveSceneProfile invalidates exactly the profile query for this studio+client', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 'scprof_1', version: 1 } });
    const { Wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useSaveSceneProfile('studio_abc', 'client_xyz'), { wrapper: Wrapper });
    await result.current.mutateAsync({
      object_key: 'scene_reference/x/y.png',
      file_url: 'https://cdn.example.com/scene_reference/x/y.png',
      mime_type: 'image/png',
      file_size: 100,
      scene_type: 'GRAPHIC_BG',
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sceneQcKeys.profile('studio_abc', 'client_xyz') });
    });
  });

  it('useRetireSceneProfile invalidates exactly the profile query for this studio+client', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });
    const { Wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useRetireSceneProfile('studio_abc', 'client_xyz'), { wrapper: Wrapper });
    await result.current.mutateAsync(3);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sceneQcKeys.profile('studio_abc', 'client_xyz') });
    });
  });

  const REVIEW_RESPONSE = {
    id: 'scqcr_1',
    show_id: 'show_1',
    operational_date: '2026-06-01',
    window_start: '2026-05-31T23:00:00.000Z',
    window_end: '2026-06-01T23:00:00.000Z',
    timezone: 'Asia/Bangkok',
    result: 'PASS',
    feedback: null,
    reviewed_by: { id: 'user_1', name: 'Reviewer' },
    reviewed_at: '2026-06-01T10:00:00.000Z',
    expected_reference: null,
    version: 1,
    confirmed_at: null,
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-01T10:00:00.000Z',
    evidence: [],
  };

  it('useCreateSceneQcReview invalidates exactly the summary/items/detail key families for the review\'s date and Show -- never Task or Show caches', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: REVIEW_RESPONSE });
    const { Wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useCreateSceneQcReview('studio_abc'), { wrapper: Wrapper });
    await result.current.mutateAsync({
      show_id: 'show_1',
      operational_date: '2026-06-01',
      result: 'PASS',
      feedback: null,
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sceneQcKeys.summary('studio_abc', '2026-06-01') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sceneQcKeys.itemsPrefix('studio_abc', '2026-06-01') });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: sceneQcKeys.itemDetail('studio_abc', '2026-06-01', 'show_1'),
      });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    const flatQueryKeys = invalidatedKeys.join('|');
    expect(flatQueryKeys).not.toContain('"task"');
    expect(flatQueryKeys).not.toContain('"show"');
  });

  it('useUpdateSceneQcReview invalidates exactly the summary/items/detail key families for the review\'s date and Show', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: REVIEW_RESPONSE });
    const { Wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useUpdateSceneQcReview('studio_abc', 'scqcr_1'), { wrapper: Wrapper });
    await result.current.mutateAsync({ result: 'PASS', feedback: null, version: 1 });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sceneQcKeys.summary('studio_abc', '2026-06-01') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sceneQcKeys.itemsPrefix('studio_abc', '2026-06-01') });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: sceneQcKeys.itemDetail('studio_abc', '2026-06-01', 'show_1'),
      });
    });
  });
});
