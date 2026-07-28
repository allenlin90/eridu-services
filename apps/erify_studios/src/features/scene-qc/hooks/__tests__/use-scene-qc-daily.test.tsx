import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentOperationalDate } from '../../lib/scene-qc-operational-date';
import { useSceneQcDaily } from '../use-scene-qc-daily';

const mockUseIsMobile = vi.fn();
const mockUseSceneQcSummaryQuery = vi.fn();
const mockUseSceneQcItemsQuery = vi.fn();
const mockUseSceneQcItemDetailQuery = vi.fn();

vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => mockUseIsMobile(),
}));
vi.mock('../../api/get-scene-qc-summary', () => ({
  useSceneQcSummaryQuery: (...args: unknown[]) => mockUseSceneQcSummaryQuery(...args),
}));
vi.mock('../../api/get-scene-qc-items', () => ({
  useSceneQcItemsQuery: (...args: unknown[]) => mockUseSceneQcItemsQuery(...args),
}));
vi.mock('../../api/get-scene-qc-item-detail', () => ({
  useSceneQcItemDetailQuery: (...args: unknown[]) => mockUseSceneQcItemDetailQuery(...args),
}));

function buildItem(showId: string, overrides: Record<string, unknown> = {}) {
  return {
    show_id: showId, show_name: showId, scheduled_start_time: '2026-06-01T10:00:00.000Z', client: null, platforms: [],
    evidence_count: 1, has_scene_profile: false, is_blocked: false, result: null, has_feedback: false,
    reviewed_by: null, reviewed_at: null, review_id: null, review_version: null, is_confirmed: false,
    ...overrides,
  };
}

const BASE_SEARCH = {
  tab: 'daily' as const, review_state: 'all' as const, page: 1, limit: 20,
};

describe('useSceneQcDaily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
    mockUseSceneQcSummaryQuery.mockReturnValue({ data: undefined, isLoading: false });
    mockUseSceneQcItemsQuery.mockReturnValue({ data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }, isLoading: false });
    mockUseSceneQcItemDetailQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('resolves the effective date to the current operational day when the URL date is undefined, and writes it into the URL', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(
      () => useSceneQcDaily({ studioId: 'studio_abc', search: BASE_SEARCH, onSearchChange }),
    );

    const today = getCurrentOperationalDate();
    expect(result.current.effectiveDate).toBe(today);
    expect(result.current.isCurrentDay).toBe(true);
    expect(onSearchChange).toHaveBeenCalledWith({ date: today });
  });

  it('treats an explicit historical date as not the current day', () => {
    const { result } = renderHook(
      () => useSceneQcDaily({ studioId: 'studio_abc', search: { ...BASE_SEARCH, date: '2020-01-01' }, onSearchChange: vi.fn() }),
    );

    expect(result.current.effectiveDate).toBe('2020-01-01');
    expect(result.current.isCurrentDay).toBe(false);
  });

  it('auto-selects the first queue row on desktop when no show_id is selected', () => {
    mockUseSceneQcItemsQuery.mockReturnValue({
      data: { data: [buildItem('show_1'), buildItem('show_2')], meta: { page: 1, limit: 20, total: 2, totalPages: 1 } },
      isLoading: false,
    });
    const onSearchChange = vi.fn();
    renderHook(() => useSceneQcDaily({ studioId: 'studio_abc', search: { ...BASE_SEARCH, date: '2026-06-01' }, onSearchChange }));

    expect(onSearchChange).toHaveBeenCalledWith({ show_id: 'show_1' });
  });

  it('does NOT auto-select on mobile', () => {
    mockUseIsMobile.mockReturnValue(true);
    mockUseSceneQcItemsQuery.mockReturnValue({
      data: { data: [buildItem('show_1')], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
    });
    const onSearchChange = vi.fn();
    renderHook(() => useSceneQcDaily({ studioId: 'studio_abc', search: { ...BASE_SEARCH, date: '2026-06-01' }, onSearchChange }));

    expect(onSearchChange).not.toHaveBeenCalledWith({ show_id: 'show_1' });
  });

  it('changeScope resets page to 1 and clears show_id', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(
      () => useSceneQcDaily({ studioId: 'studio_abc', search: { ...BASE_SEARCH, date: '2026-06-01', page: 3, show_id: 'show_9' }, onSearchChange }),
    );

    act(() => result.current.changeScope({ client_id: 'client_x' }));

    expect(onSearchChange).toHaveBeenCalledWith({ client_id: 'client_x', page: 1, show_id: undefined });
  });

  it('changePage clears show_id', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(
      () => useSceneQcDaily({ studioId: 'studio_abc', search: { ...BASE_SEARCH, date: '2026-06-01', show_id: 'show_9' }, onSearchChange }),
    );

    act(() => result.current.changePage(2));

    expect(onSearchChange).toHaveBeenCalledWith({ page: 2, show_id: undefined });
  });

  it('goToPreviousDay/goToNextDay/goToToday navigate via shiftOperationalDate and reset scope', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(
      () => useSceneQcDaily({ studioId: 'studio_abc', search: { ...BASE_SEARCH, date: '2026-06-15' }, onSearchChange }),
    );

    act(() => result.current.goToPreviousDay());
    expect(onSearchChange).toHaveBeenCalledWith({ date: '2026-06-14', page: 1, show_id: undefined });

    act(() => result.current.goToNextDay());
    expect(onSearchChange).toHaveBeenCalledWith({ date: '2026-06-16', page: 1, show_id: undefined });

    act(() => result.current.goToToday());
    expect(onSearchChange).toHaveBeenCalledWith({ date: getCurrentOperationalDate(), page: 1, show_id: undefined });
  });

  it('saveAndNext selects the next unreviewed Show after the current selection', () => {
    mockUseSceneQcItemsQuery.mockReturnValue({
      data: {
        data: [
          buildItem('show_1', { result: 'PASS' }),
          buildItem('show_2'),
          buildItem('show_3'),
        ],
        meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
      },
      isLoading: false,
    });
    const onSearchChange = vi.fn();
    const { result } = renderHook(
      () => useSceneQcDaily({ studioId: 'studio_abc', search: { ...BASE_SEARCH, date: '2026-06-01', show_id: 'show_1' }, onSearchChange }),
    );

    let selected = false;
    act(() => {
      selected = result.current.saveAndNext();
    });

    expect(selected).toBe(true);
    expect(onSearchChange).toHaveBeenCalledWith({ show_id: 'show_2' });
  });

  it('saveAndNext wraps to an earlier unreviewed Show when none remain after the current selection', () => {
    mockUseSceneQcItemsQuery.mockReturnValue({
      data: {
        data: [
          buildItem('show_1'),
          buildItem('show_2', { result: 'PASS' }),
        ],
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      },
      isLoading: false,
    });
    const onSearchChange = vi.fn();
    const { result } = renderHook(
      () => useSceneQcDaily({ studioId: 'studio_abc', search: { ...BASE_SEARCH, date: '2026-06-01', show_id: 'show_2' }, onSearchChange }),
    );

    let selected = false;
    act(() => {
      selected = result.current.saveAndNext();
    });

    expect(selected).toBe(true);
    expect(onSearchChange).toHaveBeenCalledWith({ show_id: 'show_1' });
  });

  it('saveAndNext returns false when no unreviewed Show remains', () => {
    mockUseSceneQcItemsQuery.mockReturnValue({
      data: {
        data: [buildItem('show_1', { result: 'PASS' }), buildItem('show_2', { result: 'FAIL' })],
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      },
      isLoading: false,
    });
    const onSearchChange = vi.fn();
    const { result } = renderHook(
      () => useSceneQcDaily({ studioId: 'studio_abc', search: { ...BASE_SEARCH, date: '2026-06-01', show_id: 'show_1' }, onSearchChange }),
    );

    let selected = false;
    act(() => {
      selected = result.current.saveAndNext();
    });

    expect(selected).toBe(false);
  });

  it('saveAndNext skips a blocked Show', () => {
    mockUseSceneQcItemsQuery.mockReturnValue({
      data: {
        data: [
          buildItem('show_1', { result: 'PASS' }),
          buildItem('show_2', { is_blocked: true, evidence_count: 0 }),
          buildItem('show_3'),
        ],
        meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
      },
      isLoading: false,
    });
    const onSearchChange = vi.fn();
    const { result } = renderHook(
      () => useSceneQcDaily({ studioId: 'studio_abc', search: { ...BASE_SEARCH, date: '2026-06-01', show_id: 'show_1' }, onSearchChange }),
    );

    act(() => result.current.saveAndNext());

    expect(onSearchChange).toHaveBeenCalledWith({ show_id: 'show_3' });
  });
});
