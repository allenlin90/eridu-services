import { getStudioShifts } from '@/features/studio-shifts/api/get-studio-shifts';
import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import { hasShiftCoverageForWindow } from '@/features/tasks/lib/task-assignment-shift-warning';

export const SHIFT_COVERAGE_QUERY_LIMIT = 200;
export const SHIFT_COVERAGE_LOOKBACK_DAYS = 1;

export type ShiftCoverageShowWindow = {
  name: string;
  start_time: string;
  end_time: string;
};

export async function checkAssigneeShiftCoverageInShowWindow(
  studioId: string,
  assigneeUid: string,
  showWindow: ShiftCoverageShowWindow,
): Promise<{ hasCoverage: boolean; showStart: Date | null }> {
  const showStart = new Date(showWindow.start_time);
  const showEnd = new Date(showWindow.end_time);

  if (Number.isNaN(showStart.getTime()) || Number.isNaN(showEnd.getTime())) {
    return {
      hasCoverage: true,
      showStart: null,
    };
  }

  const shifts = await getStudioShifts(studioId, {
    page: 1,
    limit: SHIFT_COVERAGE_QUERY_LIMIT,
    user_id: assigneeUid,
    date_from: toLocalDateInputValue(addDays(showStart, -SHIFT_COVERAGE_LOOKBACK_DAYS)),
    date_to: toLocalDateInputValue(showEnd),
  });

  return {
    hasCoverage: hasShiftCoverageForWindow(shifts.data, showStart, showEnd),
    showStart,
  };
}
