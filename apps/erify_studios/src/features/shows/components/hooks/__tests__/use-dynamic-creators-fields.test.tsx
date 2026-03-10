import * as ReactQuery from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useClientFieldData } from '../use-client-field-data';
import { useCreatorsFieldData } from '../use-creators-field-data';
import { usePlatformsFieldData } from '../use-platforms-field-data';
import { useStudioRoomFieldData } from '../use-studio-room-field-data';

import type { Show } from '@/features/shows/api/get-shows';

// Mock useQuery to control data exactly
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactQuery>();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

describe('dynamic Field Hooks (Logic Only)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockShow: Show = {
    id: 'show-1',
    name: 'Test Show',
    client_id: 'client-selected',
    client_name: 'Selected Client',
    studio_room_id: 'room-selected',
    studio_room_name: 'Selected Room',
    mcs: [{ mc_id: 'mc-selected', mc_name: 'Selected MC', id: '1' }],
    creators: [{ creator_id: 'mc-selected', creator_name: 'Selected MC', id: '1' }],
    platforms: [{ platform_id: 'platform-selected', platform_name: 'Selected Platform', id: '1' }],
    show_type_id: null,
    show_type_name: null,
    show_status_id: null,
    show_status_name: null,
    show_standard_id: null,
    show_standard_name: null,
    start_time: '',
    end_time: '',
    metadata: {},
    created_at: '',
    updated_at: '',
  } as any;

  describe('useClientFieldData', () => {
    it('should put selected client at the top of options', () => {
      vi.mocked(ReactQuery.useQuery).mockReturnValue({
        data: { data: [{ id: 'client-1', name: 'Other Client' }] },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useClientFieldData(mockShow));

      const options = result.current.options;
      expect(options.length).toBe(2);
      expect(options[0]).toEqual({ value: 'client-selected', label: 'Selected Client' });
      expect(options[1]).toEqual({ value: 'client-1', label: 'Other Client' });
    });
  });

  describe('useCreatorsFieldData', () => {
    it('should put selected creators at the top of options', () => {
      vi.mocked(ReactQuery.useQuery).mockReturnValue({
        data: { data: [{ id: 'mc-1', alias_name: 'Other MC' }] },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useCreatorsFieldData(mockShow));

      expect(result.current.options.length).toBe(2);
      expect(result.current.options[0]).toEqual({ value: 'mc-selected', label: 'Selected MC' });
    });
  });

  describe('usePlatformsFieldData', () => {
    it('should put selected platforms at the top of options', () => {
      vi.mocked(ReactQuery.useQuery).mockReturnValue({
        data: { data: [{ id: 'platform-1', name: 'Other Platform' }] },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePlatformsFieldData(mockShow));

      expect(result.current.options.length).toBe(2);
      expect(result.current.options[0]).toEqual({ value: 'platform-selected', label: 'Selected Platform' });
    });
  });

  describe('useStudioRoomFieldData', () => {
    it('should put selected room at the top of options', () => {
      vi.mocked(ReactQuery.useQuery).mockReturnValue({
        data: { data: [{ id: 'room-1', name: 'Other Room' }] },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useStudioRoomFieldData(mockShow));

      expect(result.current.options.length).toBe(2);
      expect(result.current.options[0]).toEqual({ value: 'room-selected', label: 'Selected Room' });
    });
  });
});
