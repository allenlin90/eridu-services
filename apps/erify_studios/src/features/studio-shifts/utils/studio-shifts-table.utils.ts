import type { GetStudioShiftsParams } from '@/features/studio-shifts/api/get-studio-shifts';
import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import type { ShiftBlockFormState } from '@/features/studio-shifts/types/shift-form.types';
import { combineDateAndTime } from '@/features/studio-shifts/utils/shift-form.utils';

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

export function sortShiftsByFirstBlockStart(shifts: StudioShift[]): StudioShift[] {
  return [...shifts].sort((a, b) => {
    const timeA = a.blocks[0] ? new Date(a.blocks[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
    const timeB = b.blocks[0] ? new Date(b.blocks[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });
}

export function validateShiftBlocks(date: string, formBlocks: ShiftBlockFormState[]) {
  if (formBlocks.length === 0) {
    return { error: 'At least one shift block is required.', blocks: null };
  }

  const blocks: { start_time: string; end_time: string }[] = [];
  let previousEndTime: Date | null = null;

  for (const block of formBlocks) {
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
