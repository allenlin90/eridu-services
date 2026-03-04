import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';

export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_END_TIME = '18:00';

export function toLocalDateInputValue(value: Date): string {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toLocalTimeInputValue(value: string): string {
  const d = new Date(value);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
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
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(new Date(value));
}

export function getShiftWindowLabel(shift: StudioShift): string {
  if (shift.blocks.length === 0)
    return 'No shift blocks';

  const sortedBlocks = [...shift.blocks].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  const firstBlock = sortedBlocks[0];
  const lastBlock = sortedBlocks[sortedBlocks.length - 1];

  const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

  return `${timeFormatter.format(new Date(firstBlock.start_time))} - ${timeFormatter.format(new Date(lastBlock.end_time))}`;
}
