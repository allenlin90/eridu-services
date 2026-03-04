import { useQuery } from '@tanstack/react-query';

import {
  getDutyManager,
  getStudioShifts,
  type GetStudioShiftsParams,
  studioShiftsKeys,
} from '@/features/studio-shifts/api/get-studio-shifts';

const DEFAULT_QUERY_PARAMS: GetStudioShiftsParams = {
  page: 1,
  limit: 100,
};

export function useStudioShifts(
  studioId: string,
  params?: GetStudioShiftsParams,
) {
  const queryParams = {
    ...DEFAULT_QUERY_PARAMS,
    ...params,
  };

  return useQuery({
    queryKey: studioShiftsKeys.list(studioId, queryParams),
    queryFn: () => getStudioShifts(studioId, queryParams),
    enabled: Boolean(studioId),
  });
}

export function useDutyManager(studioId: string) {
  return useQuery({
    queryKey: studioShiftsKeys.dutyManager(studioId),
    queryFn: () => getDutyManager(studioId),
    enabled: Boolean(studioId),
  });
}
