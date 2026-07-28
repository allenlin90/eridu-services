import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentOperationalDate, shiftOperationalDate } from '../../lib/scene-qc-operational-date';
import { useSceneQcRecords } from '../use-scene-qc-records';

const mockUseIsMobile = vi.fn();
const mockUseSceneQcRecordsQuery = vi.fn();
const mockUseSceneQcRecordDetailQuery = vi.fn();

vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => mockUseIsMobile(),
}));
vi.mock('../../api/get-scene-qc-records', () => ({
  useSceneQcRecordsQuery: (...args: unknown[]) => mockUseSceneQcRecordsQuery(...args),
}));
vi.mock('../../api/get-scene-qc-record-detail', () => ({
  useSceneQcRecordDetailQuery: (...args: unknown[]) => mockUseSceneQcRecordDetailQuery(...args),
}));

const BASE_SEARCH = {
  tab: 'records' as const,
  review_state: 'all' as const,
  page: 1,
  limit: 20,
};

describe('useSceneQcRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
    mockUseSceneQcRecordsQuery.mockReturnValue({ data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }, isLoading: false });
    mockUseSceneQcRecordDetailQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('defaults the range to the last 7 operational days ending today, and writes it into the URL', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() => useSceneQcRecords({ studioId: 'studio_abc', search: BASE_SEARCH, onSearchChange }));

    const today = getCurrentOperationalDate();
    const expectedFrom = shiftOperationalDate(today, -6);
    expect(result.current.dateTo).toBe(today);
    expect(result.current.dateFrom).toBe(expectedFrom);
    expect(onSearchChange).toHaveBeenCalledWith({ date_from: expectedFrom, date_to: today });
  });

  it('does not overwrite an explicit date range already in the URL', () => {
    const onSearchChange = vi.fn();
    renderHook(() => useSceneQcRecords({
      studioId: 'studio_abc',
      search: { ...BASE_SEARCH, date_from: '2026-06-01', date_to: '2026-06-07' },
      onSearchChange,
    }));

    expect(onSearchChange).not.toHaveBeenCalled();
  });

  it('passes the resolved date range and filters through to the records query', () => {
    renderHook(() => useSceneQcRecords({
      studioId: 'studio_abc',
      search: { ...BASE_SEARCH, date_from: '2026-06-01', date_to: '2026-06-07', client_id: 'client_x', result: 'FAIL' },
      onSearchChange: vi.fn(),
    }));

    expect(mockUseSceneQcRecordsQuery).toHaveBeenCalledWith('studio_abc', {
      date_from: '2026-06-01',
      date_to: '2026-06-07',
      client_id: 'client_x',
      platform_id: undefined,
      result: 'FAIL',
      page: 1,
      limit: 20,
    });
  });

  it('the detail query is disabled until record_id is set', () => {
    renderHook(() => useSceneQcRecords({
      studioId: 'studio_abc',
      search: { ...BASE_SEARCH, date_from: '2026-06-01', date_to: '2026-06-07' },
      onSearchChange: vi.fn(),
    }));

    expect(mockUseSceneQcRecordDetailQuery).toHaveBeenCalledWith('studio_abc', undefined);
  });

  it('changePage issues a new page number and clears record_id', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() => useSceneQcRecords({
      studioId: 'studio_abc',
      search: { ...BASE_SEARCH, date_from: '2026-06-01', date_to: '2026-06-07', record_id: 'scqcr_1' },
      onSearchChange,
    }));

    act(() => result.current.changePage(2));

    expect(onSearchChange).toHaveBeenCalledWith({ page: 2, record_id: undefined });
  });

  it('changeScope resets page to 1 and clears record_id', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() => useSceneQcRecords({
      studioId: 'studio_abc',
      search: { ...BASE_SEARCH, date_from: '2026-06-01', date_to: '2026-06-07', page: 3, record_id: 'scqcr_1' },
      onSearchChange,
    }));

    act(() => result.current.changeScope({ client_id: 'client_x' }));

    expect(onSearchChange).toHaveBeenCalledWith({ client_id: 'client_x', page: 1, record_id: undefined });
  });

  it('selectRecord writes record_id into the URL', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() => useSceneQcRecords({
      studioId: 'studio_abc',
      search: { ...BASE_SEARCH, date_from: '2026-06-01', date_to: '2026-06-07' },
      onSearchChange,
    }));

    act(() => result.current.selectRecord('scqcr_2'));

    expect(onSearchChange).toHaveBeenCalledWith({ record_id: 'scqcr_2' });
  });
});
