import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SceneQcDailyItemDetail } from '@eridu/api-types/scene-qc';

import { useSceneQcReviewForm } from '../use-scene-qc-review-form';

const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();

vi.mock('../../api/save-scene-qc-review', () => ({
  useCreateSceneQcReview: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
  useUpdateSceneQcReview: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
}));
vi.mock('../../api/get-scene-qc-taxonomy', () => ({
  useSceneQcTaxonomyQuery: () => ({ data: undefined, isLoading: false }),
}));

function createAxios409(message = 'This review changed since you loaded it.') {
  return new AxiosError('Conflict', '409', undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
    data: { message },
  });
}

function buildDetail(overrides: Partial<SceneQcDailyItemDetail> = {}): SceneQcDailyItemDetail {
  return {
    show: {
      id: 'show_1',
      name: 'Show 1',
      scheduled_start_time: '2026-06-01T10:00:00.000Z',
      client: null,
      platforms: [],
    },
    operational_window: {
      operational_date: '2026-06-01',
      window_start: '2026-05-31T23:00:00.000Z',
      window_end: '2026-06-01T23:00:00.000Z',
      timezone: 'Asia/Bangkok',
    },
    evidence: [{
      sort_order: 0,
      source_task_id: 'task_1',
      source_task_version: 1,
      source_field_key: 'field_a',
      label: 'Screenshot',
      object_key: null,
      file_url: 'https://cdn.example.com/a.png',
    }],
    scene_profile: null,
    review: null,
    allowed_actions: { can_review: true, blocked_reason: null },
    ...overrides,
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useSceneQcReviewForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with no result selected and cannot save', () => {
    const { result } = renderHook(
      () => useSceneQcReviewForm({ studioId: 'studio_abc', showId: 'show_1', operationalDate: '2026-06-01', detail: buildDetail() }),
      { wrapper: Wrapper },
    );

    expect(result.current.result).toBeNull();
    expect(result.current.canSave).toBe(false);
  });

  it('requires structured findings for MINOR/FAIL but not PASS', () => {
    const { result } = renderHook(
      () => useSceneQcReviewForm({ studioId: 'studio_abc', showId: 'show_1', operationalDate: '2026-06-01', detail: buildDetail() }),
      { wrapper: Wrapper },
    );

    act(() => result.current.setResult('PASS'));
    expect(result.current.canSave).toBe(true);

    act(() => result.current.setResult('FAIL'));
    expect(result.current.canSave).toBe(false);
    expect(result.current.findingsMissing).toBe(true);

    act(() => result.current.setFindings([{ element_id: 'scqce_1', defect_id: 'scqcd_1' }]));
    expect(result.current.canSave).toBe(true);
    expect(result.current.findingsMissing).toBe(false);
  });

  it('creates a review via the create mutation when no review exists yet', async () => {
    mockCreateMutateAsync.mockResolvedValue({ id: 'scqcr_1' });
    const onSaved = vi.fn();
    const { result } = renderHook(
      () => useSceneQcReviewForm({
        studioId: 'studio_abc',
        showId: 'show_1',
        operationalDate: '2026-06-01',
        detail: buildDetail(),
        onSaved,
      }),
      { wrapper: Wrapper },
    );

    act(() => result.current.setResult('PASS'));
    await act(async () => {
      await result.current.save();
    });

    expect(mockCreateMutateAsync).toHaveBeenCalledWith({
      show_id: 'show_1',
      operational_date: '2026-06-01',
      result: 'PASS',
      feedback: null,
      findings: [],
    });
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('updates via the update mutation with the current version when a review already exists', async () => {
    mockUpdateMutateAsync.mockResolvedValue({ id: 'scqcr_1', version: 2 });
    const detail = buildDetail({
      review: {
        id: 'scqcr_1',
        show_id: 'show_1',
        operational_date: '2026-06-01',
        window_start: '2026-05-31T23:00:00.000Z',
        window_end: '2026-06-01T23:00:00.000Z',
        timezone: 'Asia/Bangkok',
        result: 'PASS',
        feedback: null,
        findings: [],
        reviewed_by: { id: 'user_1', name: 'A' },
        reviewed_at: '2026-06-01T10:00:00.000Z',
        expected_reference: null,
        version: 1,
        confirmed_at: null,
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-01T10:00:00.000Z',
        evidence: [],
      },
    });
    const { result } = renderHook(
      () => useSceneQcReviewForm({ studioId: 'studio_abc', showId: 'show_1', operationalDate: '2026-06-01', detail }),
      { wrapper: Wrapper },
    );

    // Draft initializes from the loaded review's PASS result.
    await waitFor(() => expect(result.current.result).toBe('PASS'));

    act(() => result.current.setResult('MINOR'));
    act(() => result.current.setFindings([{ element_id: 'scqce_1', defect_id: 'scqcd_1' }]));
    act(() => result.current.setFeedback('watermark visible'));
    await act(async () => {
      await result.current.save();
    });

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      result: 'MINOR',
      feedback: 'watermark visible',
      findings: [{ element_id: 'scqce_1', defect_id: 'scqcd_1' }],
      version: 1,
    });
  });

  it('does NOT reset the draft when evidence/expected reference changes for the same Show', async () => {
    const { result, rerender } = renderHook(
      ({ detail }: { detail: SceneQcDailyItemDetail }) => useSceneQcReviewForm({
        studioId: 'studio_abc',
        showId: 'show_1',
        operationalDate: '2026-06-01',
        detail,
      }),
      { wrapper: Wrapper, initialProps: { detail: buildDetail() } },
    );

    act(() => result.current.setResult('FAIL'));
    act(() => result.current.setFeedback('blank image'));
    expect(result.current.result).toBe('FAIL');

    // Same Show, but evidence/scene_profile just re-resolved differently.
    rerender({
      detail: buildDetail({
        evidence: [{ sort_order: 0, source_task_id: 'task_2', source_task_version: 2, source_field_key: 'field_b', label: 'New', object_key: null, file_url: 'https://cdn.example.com/b.png' }],
        scene_profile: { object_key: 'k', file_url: 'https://cdn.example.com/k.png', scene_type: 'GRAPHIC_BG' },
      }),
    });

    expect(result.current.result).toBe('FAIL');
    expect(result.current.feedback).toBe('blank image');
  });

  it('resets the draft when show_id changes', async () => {
    const { result, rerender } = renderHook(
      ({ showId }: { showId: string }) => useSceneQcReviewForm({
        studioId: 'studio_abc',
        showId,
        operationalDate: '2026-06-01',
        detail: buildDetail({ show: { ...buildDetail().show, id: showId } }),
      }),
      { wrapper: Wrapper, initialProps: { showId: 'show_1' } },
    );

    act(() => result.current.setResult('FAIL'));
    act(() => result.current.setFeedback('blank image'));
    expect(result.current.result).toBe('FAIL');

    rerender({ showId: 'show_2' });

    expect(result.current.result).toBeNull();
    expect(result.current.feedback).toBe('');
  });

  it('the "Image blank or not viewable" shortcut selects Fail without saving', () => {
    const { result } = renderHook(
      () => useSceneQcReviewForm({ studioId: 'studio_abc', showId: 'show_1', operationalDate: '2026-06-01', detail: buildDetail() }),
      { wrapper: Wrapper },
    );

    act(() => result.current.selectUnusableImage());

    expect(result.current.result).toBe('FAIL');
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  it('on a 409 conflict, preserves the typed feedback locally, refetches, and surfaces a retry message', async () => {
    mockCreateMutateAsync.mockRejectedValue(createAxios409('This review changed since you loaded it.'));
    const refetchDetail = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(
      () => useSceneQcReviewForm({
        studioId: 'studio_abc',
        showId: 'show_1',
        operationalDate: '2026-06-01',
        detail: buildDetail(),
        refetchDetail,
      }),
      { wrapper: Wrapper },
    );

    act(() => result.current.setResult('FAIL'));
    act(() => result.current.setFeedback('blank image'));
    await act(async () => {
      await result.current.save();
    });

    await waitFor(() => expect(result.current.conflictMessage).toBe('This review changed since you loaded it.'));
    expect(refetchDetail).toHaveBeenCalledTimes(1);
    // The typed feedback is preserved, not cleared.
    expect(result.current.feedback).toBe('blank image');
    expect(result.current.result).toBe('FAIL');
    // Never auto-retries.
    expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('dismissConflict clears the conflict message', async () => {
    mockCreateMutateAsync.mockRejectedValue(createAxios409());
    const { result } = renderHook(
      () => useSceneQcReviewForm({ studioId: 'studio_abc', showId: 'show_1', operationalDate: '2026-06-01', detail: buildDetail() }),
      { wrapper: Wrapper },
    );

    act(() => result.current.setResult('PASS'));
    await act(async () => {
      await result.current.save();
    });
    await waitFor(() => expect(result.current.conflictMessage).not.toBeNull());

    act(() => result.current.dismissConflict());
    expect(result.current.conflictMessage).toBeNull();
  });
});
