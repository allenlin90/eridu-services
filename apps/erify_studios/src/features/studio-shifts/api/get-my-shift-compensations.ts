import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { StudioMemberCompensationResponse } from '@eridu/api-types/memberships';

import { apiClient } from '@/lib/api/client';

export type GetMyShiftCompensationsParams = {
  studio_id: string;
  date_from: string;
  date_to: string;
};

export const myShiftCompensationsKeys = {
  all: ['my-shift-compensations'] as const,
  detail: (params: GetMyShiftCompensationsParams) =>
    [...myShiftCompensationsKeys.all, params] as const,
};

export async function getMyShiftCompensations(
  params: GetMyShiftCompensationsParams,
  options?: { signal?: AbortSignal },
): Promise<StudioMemberCompensationResponse> {
  const { data } = await apiClient.get<StudioMemberCompensationResponse>(
    '/me/shift-compensations',
    {
      params,
      signal: options?.signal,
    },
  );
  return data;
}

export function useMyShiftCompensations(
  params: GetMyShiftCompensationsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: myShiftCompensationsKeys.detail(params),
    queryFn: ({ signal }) => getMyShiftCompensations(params, { signal }),
    enabled: Boolean(params.studio_id && params.date_from && params.date_to) && (options?.enabled ?? true),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}
