import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';

export function hasShiftCoverageForWindow(
  shifts: StudioShift[],
  showStart: Date,
  showEnd: Date,
): boolean {
  const showStartMs = showStart.getTime();
  const showEndMs = showEnd.getTime();

  return shifts.some((shift) => (
    shift.status !== 'CANCELLED'
    && shift.blocks.some((block) => {
      const blockStartMs = new Date(block.start_time).getTime();
      const blockEndMs = new Date(block.end_time).getTime();
      return blockStartMs < showEndMs && blockEndMs > showStartMs;
    })
  ));
}

export function buildShiftCoverageWarning(showName: string, showStart: Date): string {
  return `No overlapping shift found for assignee during "${showName}" (${toLocalDateInputValue(showStart)}).`;
}
