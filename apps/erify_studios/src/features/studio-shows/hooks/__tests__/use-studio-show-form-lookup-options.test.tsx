import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useStudioShowClientOptions,
  useStudioShowPlatformOptions,
  useStudioShowRoomOptions,
  useStudioShowScheduleOptions,
  useStudioShowStandardOptions,
  useStudioShowStatusOptions,
  useStudioShowTypeOptions,
} from '../use-studio-show-form-lookup-options';

const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

const mockGetClients = vi.fn();
const mockGetSchedules = vi.fn();
const mockGetShowTypes = vi.fn();
const mockGetShowStatuses = vi.fn();
const mockGetShowStandards = vi.fn();
const mockGetStudioRooms = vi.fn();
const mockGetPlatforms = vi.fn();

vi.mock('@/features/clients/api/get-clients', () => ({
  getClients: (...args: unknown[]) => mockGetClients(...args),
}));

vi.mock('@/features/show-types/api/get-show-types', () => ({
  getShowTypes: (...args: unknown[]) => mockGetShowTypes(...args),
}));

vi.mock('@/features/schedules/api/get-schedules', () => ({
  getSchedules: (...args: unknown[]) => mockGetSchedules(...args),
}));

vi.mock('@/features/show-statuses/api/get-show-statuses', () => ({
  getShowStatuses: (...args: unknown[]) => mockGetShowStatuses(...args),
}));

vi.mock('@/features/show-standards/api/get-show-standards', () => ({
  getShowStandards: (...args: unknown[]) => mockGetShowStandards(...args),
}));

vi.mock('@/features/platforms/api/get-platforms', () => ({
  getPlatforms: (...args: unknown[]) => mockGetPlatforms(...args),
}));

vi.mock('@/features/studio-rooms/api/get-studio-rooms', () => ({
  getStudioRooms: (...args: unknown[]) => mockGetStudioRooms(...args),
}));

describe('useStudioShowFormLookupOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isFetching: false,
    });
    mockGetClients.mockResolvedValue({ data: [] });
    mockGetSchedules.mockResolvedValue({ data: [] });
    mockGetShowTypes.mockResolvedValue({ data: [] });
    mockGetShowStatuses.mockResolvedValue({ data: [] });
    mockGetShowStandards.mockResolvedValue({ data: [] });
    mockGetStudioRooms.mockResolvedValue({ data: [] });
    mockGetPlatforms.mockResolvedValue({ data: [] });
  });

  it('maps client search state into the studio client lookup query', async () => {
    const { result, rerender } = renderHook(
      ({ show, studioId }) => useStudioShowClientOptions(show, studioId),
      { initialProps: { show: null, studioId: 'std_1' } },
    );

    const initialQuery = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
    };

    expect(initialQuery.queryKey).toEqual([
      'studio-show-form',
      'clients',
      'std_1',
      { search: '' },
    ]);

    await initialQuery.queryFn({ signal: undefined });

    expect(mockGetClients).toHaveBeenCalledWith(
      { name: undefined, limit: 10 },
      'std_1',
      { signal: undefined },
    );

    act(() => {
      result.current.setSearch('acme');
    });
    rerender({ show: null, studioId: 'std_1' });

    const searchQuery = mockUseQuery.mock.calls.at(-1)?.[0] as {
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
    };

    expect(searchQuery.queryKey).toEqual([
      'studio-show-form',
      'clients',
      'std_1',
      { search: 'acme' },
    ]);

    await searchQuery.queryFn({ signal: undefined });

    expect(mockGetClients).toHaveBeenLastCalledWith(
      { name: 'acme', limit: 20 },
      'std_1',
      { signal: undefined },
    );
  });

  it('maps search state into the other studio lookup queries', async () => {
    const { result: scheduleResult, rerender: rerenderSchedule } = renderHook(
      ({ show, studioId }) => useStudioShowScheduleOptions(show, studioId),
      { initialProps: { show: null, studioId: 'std_1' } },
    );
    const { result: roomResult, rerender: rerenderRoom } = renderHook(
      ({ show, studioId }) => useStudioShowRoomOptions(show, studioId),
      { initialProps: { show: null, studioId: 'std_1' } },
    );
    const { result: typeResult, rerender: rerenderType } = renderHook(
      ({ show, studioId }) => useStudioShowTypeOptions(show, studioId),
      { initialProps: { show: null, studioId: 'std_1' } },
    );
    const { result: statusResult, rerender: rerenderStatus } = renderHook(
      ({ show, studioId }) => useStudioShowStatusOptions(show, studioId),
      { initialProps: { show: null, studioId: 'std_1' } },
    );
    const { result: standardResult, rerender: rerenderStandard } = renderHook(
      ({ show, studioId }) => useStudioShowStandardOptions(show, studioId),
      { initialProps: { show: null, studioId: 'std_1' } },
    );
    const { result: platformResult, rerender: rerenderPlatform } = renderHook(
      ({ show, studioId }) => useStudioShowPlatformOptions(show, studioId),
      { initialProps: { show: null, studioId: 'std_1' } },
    );

    act(() => {
      scheduleResult.current.setSearch('q2');
      roomResult.current.setSearch('main');
      typeResult.current.setSearch('talk');
      statusResult.current.setSearch('live');
      standardResult.current.setSearch('standard');
      platformResult.current.setSearch('youtube');
    });

    rerenderSchedule({ show: null, studioId: 'std_1' });
    rerenderRoom({ show: null, studioId: 'std_1' });
    rerenderType({ show: null, studioId: 'std_1' });
    rerenderStatus({ show: null, studioId: 'std_1' });
    rerenderStandard({ show: null, studioId: 'std_1' });
    rerenderPlatform({ show: null, studioId: 'std_1' });

    const queries = mockUseQuery.mock.calls.map((call) => call[0] as {
      queryKey: unknown[];
      queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
    });

    const scheduleQuery = queries.find((query) => query.queryKey[1] === 'schedules' && (query.queryKey[3] as { search: string }).search === 'q2');
    const roomQuery = queries.find((query) => query.queryKey[1] === 'studio-rooms' && (query.queryKey[3] as { search: string }).search === 'main');
    const typeQuery = queries.find((query) => query.queryKey[1] === 'show-types' && (query.queryKey[3] as { search: string }).search === 'talk');
    const statusQuery = queries.find((query) => query.queryKey[1] === 'show-statuses' && (query.queryKey[3] as { search: string }).search === 'live');
    const standardQuery = queries.find((query) => query.queryKey[1] === 'show-standards' && (query.queryKey[3] as { search: string }).search === 'standard');
    const platformQuery = queries.find((query) => query.queryKey[1] === 'platforms' && (query.queryKey[3] as { search: string }).search === 'youtube');

    expect(scheduleQuery?.queryKey).toEqual(['studio-show-form', 'schedules', 'std_1', { search: 'q2' }]);
    expect(roomQuery?.queryKey).toEqual(['studio-show-form', 'studio-rooms', 'std_1', { search: 'main' }]);
    expect(typeQuery?.queryKey).toEqual(['studio-show-form', 'show-types', 'std_1', { search: 'talk' }]);
    expect(statusQuery?.queryKey).toEqual(['studio-show-form', 'show-statuses', 'std_1', { search: 'live' }]);
    expect(standardQuery?.queryKey).toEqual(['studio-show-form', 'show-standards', 'std_1', { search: 'standard' }]);
    expect(platformQuery?.queryKey).toEqual(['studio-show-form', 'platforms', 'std_1', { search: 'youtube' }]);

    await scheduleQuery?.queryFn({ signal: undefined });
    await roomQuery?.queryFn({ signal: undefined });
    await typeQuery?.queryFn({ signal: undefined });
    await statusQuery?.queryFn({ signal: undefined });
    await standardQuery?.queryFn({ signal: undefined });
    await platformQuery?.queryFn({ signal: undefined });

    expect(mockGetSchedules).toHaveBeenLastCalledWith(
      { name: 'q2', limit: 20 },
      'std_1',
      { signal: undefined },
    );
    expect(mockGetStudioRooms).toHaveBeenLastCalledWith(
      { name: 'main', limit: 20 },
      'std_1',
      { signal: undefined },
    );
    expect(mockGetShowTypes).toHaveBeenLastCalledWith(
      { name: 'talk', limit: 20 },
      'std_1',
      { signal: undefined },
    );
    expect(mockGetShowStatuses).toHaveBeenLastCalledWith(
      { name: 'live', limit: 20 },
      'std_1',
      { signal: undefined },
    );
    expect(mockGetShowStandards).toHaveBeenLastCalledWith(
      { name: 'standard', limit: 20 },
      'std_1',
      { signal: undefined },
    );
    expect(mockGetPlatforms).toHaveBeenLastCalledWith(
      { name: 'youtube', limit: 20 },
      'std_1',
      { signal: undefined },
    );
  });
});
