import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';

export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_END_TIME = '18:00';

export function toLocalDateInputValue(value: Date): string {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toLocalTimeInputValue(value: string): string {
  const date = new Date(value);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function createDefaultFormState(): ShiftFormState {
  return {
    userId: '',
    date: toLocalDateInputValue(new Date()),
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    hourlyRate: '',
    isDutyManager: false,
  };
}

export function createEditFormState(shift: StudioShift): ShiftFormState {
  const sortedBlocks = [...shift.blocks].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
  const firstBlock = sortedBlocks[0];
  const lastBlock = sortedBlocks[sortedBlocks.length - 1];

  return {
    userId: shift.user_id,
    date: shift.date,
    startTime: firstBlock ? toLocalTimeInputValue(firstBlock.start_time) : DEFAULT_START_TIME,
    endTime: lastBlock ? toLocalTimeInputValue(lastBlock.end_time) : DEFAULT_END_TIME,
    hourlyRate: shift.hourly_rate ?? '',
    status: shift.status,
    isDutyManager: shift.is_duty_manager,
  };
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function getShiftWindowLabel(shift: StudioShift): string {
  if (shift.blocks.length === 0)
    return 'No shift blocks';

  const sortedBlocks = [...shift.blocks].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  const firstBlock = sortedBlocks[0];
  const lastBlock = sortedBlocks[sortedBlocks.length - 1];

  return `${new Date(firstBlock.start_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${new Date(lastBlock.end_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
