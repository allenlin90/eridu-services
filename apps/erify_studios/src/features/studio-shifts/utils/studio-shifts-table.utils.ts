import axios from 'axios';

import type { GetStudioShiftsParams } from '@/features/studio-shifts/api/get-studio-shifts';
import type { ShiftBlockFormState } from '@/features/studio-shifts/types/shift-form.types';
import { sortShiftFormBlocksByStart } from '@/features/studio-shifts/utils/shift-blocks.utils';
import { combineDateAndTime } from '@/features/studio-shifts/utils/shift-form.utils';

export { sortShiftsByFirstBlockStart } from '@/features/studio-shifts/utils/shift-timeline.utils';

export type ShiftListStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type ShiftListDutyFilter = 'true' | 'false';

export function buildStudioShiftsQueryParams(search: {
  page: number;
  limit: number;
  user_id?: string;
  status?: ShiftListStatus;
  duty?: ShiftListDutyFilter;
  date_from?: string;
  date_to?: string;
}): GetStudioShiftsParams {
  return {
    page: search.page,
    limit: search.limit,
    ...(search.user_id ? { user_id: search.user_id } : {}),
    ...(search.date_from ? { date_from: search.date_from } : {}),
    ...(search.date_to ? { date_to: search.date_to } : {}),
    ...(search.status ? { status: search.status } : {}),
    ...(search.duty ? { is_duty_manager: search.duty === 'true' } : {}),
  };
}

export function validateShiftBlocks(date: string, formBlocks: ShiftBlockFormState[]) {
  if (formBlocks.length === 0) {
    return { error: 'At least one shift block is required.', blocks: null };
  }

  const blocks: { start_time: string; end_time: string }[] = [];
  let previousEndTime: Date | null = null;
  const sortedBlocks = sortShiftFormBlocksByStart(formBlocks);

  for (const block of sortedBlocks) {
    if (!block.startTime || !block.endTime) {
      return { error: 'Start time and end time are required for all blocks.', blocks: null };
    }

    const startDate = new Date(combineDateAndTime(date, block.startTime));
    const endDate = new Date(combineDateAndTime(date, block.endTime));

    while (endDate.getTime() <= startDate.getTime()) {
      endDate.setDate(endDate.getDate() + 1);
    }

    if (previousEndTime) {
      while (startDate.getTime() < previousEndTime.getTime()) {
        startDate.setDate(startDate.getDate() + 1);
        endDate.setDate(endDate.getDate() + 1);
      }
    }

    if (previousEndTime && startDate.getTime() < previousEndTime.getTime()) {
      return { error: 'Time blocks cannot overlap.', blocks: null };
    }

    blocks.push({ start_time: startDate.toISOString(), end_time: endDate.toISOString() });
    previousEndTime = endDate;
  }

  return { error: null, blocks };
}

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as ApiErrorResponse | undefined;
    if (Array.isArray(responseData?.message) && responseData.message.length > 0) {
      return responseData.message.join(', ');
    }
    if (typeof responseData?.message === 'string' && responseData.message.trim().length > 0) {
      return responseData.message;
    }
    if (typeof responseData?.error === 'string' && responseData.error.trim().length > 0) {
      return responseData.error;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}
