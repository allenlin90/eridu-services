import type {
  StudioShiftAlignmentQueryParams,
  StudioShiftAlignmentResponse,
} from './studio-shifts.types';

import { apiClient } from '@/lib/api/client';

export const shiftAlignmentKeys = {
  all: (studioId: string) => ['studio-shift-alignment', studioId] as const,
  detail: (studioId: string, params?: unknown) => [...shiftAlignmentKeys.all(studioId), params] as const,
};

export async function getShiftAlignment(
  studioId: string,
  params: StudioShiftAlignmentQueryParams,
): Promise<StudioShiftAlignmentResponse> {
  const response = await apiClient.get<StudioShiftAlignmentResponse>(
    `/studios/${studioId}/shift-alignment`,
    { params },
  );
  return response.data;
}
