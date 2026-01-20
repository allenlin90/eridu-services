import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateScheduleInputSchema } from '@eridu/api-types/schedules';

import type { Schedule } from './get-schedules';

import { apiClient } from '@/lib/api/client';

export type UpdateScheduleDto = z.infer<typeof updateScheduleInputSchema>;

export async function updateSchedule({
  id,
  data,
}: {
  id: string;
  data: UpdateScheduleDto;
}): Promise<Schedule> {
  const response = await apiClient.patch<Schedule>(`/admin/schedules/${id}`, data);
  return response.data;
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
