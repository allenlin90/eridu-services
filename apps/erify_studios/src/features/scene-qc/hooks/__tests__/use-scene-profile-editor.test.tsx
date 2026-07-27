import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSceneProfileEditor } from '../use-scene-profile-editor';

const mockUseSceneProfileQuery = vi.fn();
const mockSaveMutateAsync = vi.fn();
const mockRetireMutateAsync = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../../api/get-scene-profile', () => ({
  useSceneProfileQuery: (...args: unknown[]) => mockUseSceneProfileQuery(...args),
}));
vi.mock('../../api/save-scene-profile', () => ({
  useSaveSceneProfile: () => ({ mutateAsync: mockSaveMutateAsync, isPending: false }),
}));
vi.mock('../../api/retire-scene-profile', () => ({
  useRetireSceneProfile: () => ({ mutateAsync: mockRetireMutateAsync, isPending: false }),
}));
vi.mock('../../lib/upload-scene-reference', () => ({
  uploadSceneReference: vi.fn().mockResolvedValue({
    object_key: 'scene_reference/x/y.png',
    file_url: 'https://cdn.example.com/scene_reference/x/y.png',
    mime_type: 'image/png',
    file_size: 100,
  }),
}));

function createAxios404() {
  return new AxiosError('Not Found', '404', undefined, undefined, {
    status: 404,
    statusText: 'Not Found',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
    data: {},
  });
}

function createAxios409(message = 'Scene profile is out of date.') {
  return new AxiosError('Conflict', '409', undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
    data: { message },
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useSceneProfileEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSceneProfileQuery.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isLoading: false,
      refetch: mockRefetch,
    });
  });

  it('normalizes a 404 into hasNoProfile: true, not a load error', () => {
    mockUseSceneProfileQuery.mockReturnValue({
      data: undefined,
      error: createAxios404(),
      isError: true,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useSceneProfileEditor('studio_abc', 'client_xyz'), { wrapper: Wrapper });

    expect(result.current.hasNoProfile).toBe(true);
    expect(result.current.loadError).toBeNull();
  });

  it('surfaces a non-404 error as loadError, not as hasNoProfile', () => {
    const serverError = new AxiosError('Server Error', '500');
    mockUseSceneProfileQuery.mockReturnValue({
      data: undefined,
      error: serverError,
      isError: true,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useSceneProfileEditor('studio_abc', 'client_xyz'), { wrapper: Wrapper });

    expect(result.current.hasNoProfile).toBe(false);
    expect(result.current.loadError).toBe(serverError);
  });

  it('cannot save until a file has been uploaded', () => {
    const { result } = renderHook(() => useSceneProfileEditor('studio_abc', 'client_xyz'), { wrapper: Wrapper });
    expect(result.current.canSave).toBe(false);
  });

  it('selectFile uploads and enables save; save calls the mutation with upload metadata', async () => {
    mockSaveMutateAsync.mockResolvedValue({ id: 'scprof_1', version: 1 });
    const { result } = renderHook(() => useSceneProfileEditor('studio_abc', 'client_xyz'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.selectFile(new File([], 'ref.png', { type: 'image/png' }));
    });

    expect(result.current.canSave).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(mockSaveMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      object_key: 'scene_reference/x/y.png',
      scene_type: 'GRAPHIC_BG',
    }));
  });

  it('on a 409 conflict, preserves selected state, refetches, surfaces a message, and never auto-retries', async () => {
    mockSaveMutateAsync.mockRejectedValue(createAxios409('Scene profile is out of date. Please refresh.'));
    const { result } = renderHook(() => useSceneProfileEditor('studio_abc', 'client_xyz'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.selectFile(new File([], 'ref.png', { type: 'image/png' }));
    });

    await act(async () => {
      await result.current.save();
    });

    await waitFor(() => {
      expect(result.current.conflictMessage).toBe('Scene profile is out of date. Please refresh.');
    });
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    // The upload is preserved, not cleared, so a retry does not re-upload.
    expect(result.current.canSave).toBe(true);
    // Only the one save() call happened -- no automatic retry.
    expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('dismissConflict clears the conflict message', async () => {
    mockSaveMutateAsync.mockRejectedValue(createAxios409());
    const { result } = renderHook(() => useSceneProfileEditor('studio_abc', 'client_xyz'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.selectFile(new File([], 'ref.png', { type: 'image/png' }));
    });
    await act(async () => {
      await result.current.save();
    });
    await waitFor(() => expect(result.current.conflictMessage).not.toBeNull());

    act(() => {
      result.current.dismissConflict();
    });

    expect(result.current.conflictMessage).toBeNull();
  });
});
