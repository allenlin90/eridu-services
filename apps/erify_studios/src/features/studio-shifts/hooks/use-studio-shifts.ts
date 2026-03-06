import { useQuery } from '@tanstack/react-query';

import { getMyShifts, type GetMyShiftsParams, myShiftsKeys } from '@/features/studio-shifts/api/get-my-shifts';
import {
  getShiftAlignment,
  shiftAlignmentKeys,
} from '@/features/studio-shifts/api/get-shift-alignment';
import {
  getShiftCalendar,
  shiftCalendarKeys,
} from '@/features/studio-shifts/api/get-shift-calendar';
import {
  getDutyManager,
  getStudioShifts,
  type GetStudioShiftsParams,
  studioShiftsKeys,
} from '@/features/studio-shifts/api/get-studio-shifts';
import type {
  StudioShiftAlignmentQueryParams,
  StudioShiftCalendarQueryParams,
} from '@/features/studio-shifts/api/studio-shifts.types';

const DEFAULT_QUERY_PARAMS: GetStudioShiftsParams = {
  page: 1,
  limit: 100,
};

export function useStudioShifts(
  studioId: string,
  params?: GetStudioShiftsParams,
  options?: {
    enabled?: boolean;
  },
) {
  const queryParams = {
    ...DEFAULT_QUERY_PARAMS,
    ...params,
  };

  return useQuery({
    queryKey: studioShiftsKeys.list(studioId, queryParams),
    queryFn: () => getStudioShifts(studioId, queryParams),
    enabled: Boolean(studioId) && (options?.enabled ?? true),
  });
}

export function useDutyManager(
  studioId: string,
  time?: string,
  options?: {
    enabled?: boolean;
  },
) {
  return useQuery({
    queryKey: studioShiftsKeys.dutyManager(studioId, time),
    queryFn: () => getDutyManager(studioId, time),
    enabled: Boolean(studioId) && (options?.enabled ?? true),
  });
}

const DEFAULT_MY_SHIFTS_QUERY_PARAMS: GetMyShiftsParams = {
  page: 1,
  limit: 100,
};

export function useMyShifts(
  params?: GetMyShiftsParams,
  options?: {
    enabled?: boolean;
  },
) {
  const queryParams = {
    ...DEFAULT_MY_SHIFTS_QUERY_PARAMS,
    ...params,
  };

  return useQuery({
    queryKey: myShiftsKeys.list(queryParams),
    queryFn: () => getMyShifts(queryParams),
    enabled: options?.enabled ?? true,
  });
}

export function useShiftCalendar(
  studioId: string,
  params?: StudioShiftCalendarQueryParams,
  options?: {
    enabled?: boolean;
  },
) {
  const queryParams = params ?? {};

  return useQuery({
    queryKey: shiftCalendarKeys.detail(studioId, queryParams),
    queryFn: () => getShiftCalendar(studioId, queryParams),
    enabled: Boolean(studioId) && (options?.enabled ?? true),
  });
}

export function useShiftAlignment(
  studioId: string,
  params?: StudioShiftAlignmentQueryParams,
  options?: {
    enabled?: boolean;
  },
) {
  const queryParams = params ?? {};

  return useQuery({
    queryKey: shiftAlignmentKeys.detail(studioId, queryParams),
    queryFn: () => getShiftAlignment(studioId, queryParams),
    enabled: Boolean(studioId) && (options?.enabled ?? true),
  });
}
