import { useQuery } from '@tanstack/react-query';

import type { SceneQcPeriodReport } from '@eridu/api-types/scene-qc';

import { sceneQcKeys } from './scene-qc-query-keys';

import { apiClient } from '@/lib/api/client';

export async function getSceneQcPeriodReport(
  studioId: string,
  dateFrom: string,
  dateTo: string,
  signal?: AbortSignal,
): Promise<SceneQcPeriodReport> {
  const response = await apiClient.get<SceneQcPeriodReport>(
    `/studios/${studioId}/scene-qc-reports/period`,
    { params: { date_from: dateFrom, date_to: dateTo }, signal },
  );
  return response.data;
}

export function useSceneQcPeriodReportQuery(
  studioId: string,
  dateFrom: string,
  dateTo: string,
) {
  return useQuery({
    queryKey: sceneQcKeys.periodReport(studioId, dateFrom, dateTo),
    queryFn: ({ signal }) => getSceneQcPeriodReport(studioId, dateFrom, dateTo, signal),
  });
}
