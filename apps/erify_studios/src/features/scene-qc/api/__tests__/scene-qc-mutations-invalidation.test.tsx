import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRetireSceneProfile } from '../retire-scene-profile';
import { useSaveSceneProfile } from '../save-scene-profile';
import { sceneQcKeys } from '../scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: { put: vi.fn(), delete: vi.fn() },
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
});
