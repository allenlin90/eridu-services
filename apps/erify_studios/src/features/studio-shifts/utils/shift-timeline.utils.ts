import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import { sortShiftBlocksByStart } from '@/features/studio-shifts/utils/shift-blocks.utils';

export function getShiftFirstBlockStartMs(shift: Pick<StudioShift, 'blocks'>): number | null {
  const firstBlock = sortShiftBlocksByStart(shift.blocks)[0];
  if (!firstBlock) {
    return null;
  }
  return new Date(firstBlock.start_time).getTime();
}

export function sortShiftsByFirstBlockStart(shifts: StudioShift[]): StudioShift[] {
  return [...shifts].sort((a, b) => {
    const timeA = getShiftFirstBlockStartMs(a) ?? Number.MAX_SAFE_INTEGER;
    const timeB = getShiftFirstBlockStartMs(b) ?? Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });
}
