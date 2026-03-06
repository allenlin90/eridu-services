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
  // Tracks whether the previous block's endDate fell on a different calendar day than its
  // startDate (i.e. it crossed midnight). Only when the previous block crossed midnight is it
  // valid to auto-advance the current block's dates forward to the next day — that's the
  // intended "cross-midnight sequential" authoring pattern (e.g. a 03:00–02:00 block followed
  // by a 04:00–06:00 block that should resolve to the next day).
  // When the previous block did NOT cross midnight, any overlap is a genuine user error.
  let prevBlockCrossedMidnight = false;
  const sortedBlocks = sortShiftFormBlocksByStart(formBlocks);

  for (const block of sortedBlocks) {
    if (!block.startTime || !block.endTime) {
      return { error: 'Start time and end time are required for all blocks.', blocks: null };
    }

    const startDate = new Date(combineDateAndTime(date, block.startTime));
    const endDate = new Date(combineDateAndTime(date, block.endTime));

    // Advance endDate past midnight when end time wraps before start time (single-block
    // cross-midnight normalization, e.g. 23:00–01:00 → next-day 01:00).
    while (endDate.getTime() <= startDate.getTime()) {
      endDate.setDate(endDate.getDate() + 1);
    }

    // Detect whether THIS block crosses midnight before any sequential advance.
    // Adding a day to both startDate and endDate preserves this property, so the
    // check is invariant to the sequential advance below.
    const crossesMidnight = startDate.toDateString() !== endDate.toDateString();

    // Sequential cross-midnight advance: only valid when the previous block crossed midnight.
    // In that case a block time like "04:00" (anchored to the shift date) may legitimately
    // need to be promoted to the next calendar day to follow the previous block sequentially.
    // When the previous block did NOT cross midnight, reaching here means the blocks overlap
    // on the same day — leave startDate untouched so the overlap check below fires correctly.
    if (previousEndTime && prevBlockCrossedMidnight) {
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
    prevBlockCrossedMidnight = crossesMidnight;
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
