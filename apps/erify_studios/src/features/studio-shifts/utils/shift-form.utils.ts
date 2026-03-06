import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';
import { sortShiftBlocksByStart } from '@/features/studio-shifts/utils/shift-blocks.utils';

export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_END_TIME = '18:00';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
  // Use a local-time ISO string construction so the result is consistent
  // regardless of the browser's timezone. Both date ("YYYY-MM-DD") and time
  // ("HH:MM") inputs are local values entered by the user.
  return new Date(`${date}T${time}:00`).toISOString();
}

export function createDefaultFormState(): ShiftFormState {
  return {
    userId: '',
    date: toLocalDateInputValue(new Date()),
    blocks: [
      {
        id: crypto.randomUUID(),
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
      },
    ],
    hourlyRate: '',
    isDutyManager: false,
  };
}

export function createEditFormState(shift: StudioShift): ShiftFormState {
  const sortedBlocks = sortShiftBlocksByStart(shift.blocks);

  return {
    userId: shift.user_id,
    date: shift.date,
    blocks: sortedBlocks.length > 0
      ? sortedBlocks.map((block) => ({
          id: crypto.randomUUID(),
          startTime: toLocalTimeInputValue(block.start_time),
          endTime: toLocalTimeInputValue(block.end_time),
        }))
      : [
          {
            id: crypto.randomUUID(),
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
          },
        ],
    hourlyRate: shift.hourly_rate ?? '',
    status: shift.status,
    isDutyManager: shift.is_duty_manager,
  };
}

function toDisplayDate(value: string): Date {
  // Date-only values from API (YYYY-MM-DD) represent calendar dates, not UTC instants.
  // Parse in local runtime time to avoid day-shift in non-UTC timezones.
  if (DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const localDate = new Date();
    localDate.setFullYear(year, (month ?? 1) - 1, day ?? 1);
    localDate.setHours(0, 0, 0, 0);
    return localDate;
  }

  return new Date(value);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(toDisplayDate(value));
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

  const sortedBlocks = sortShiftBlocksByStart(shift.blocks);

  const firstBlock = sortedBlocks[0];
  const lastBlock = sortedBlocks[sortedBlocks.length - 1];

  const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

  return `${timeFormatter.format(new Date(firstBlock.start_time))} - ${timeFormatter.format(new Date(lastBlock.end_time))}`;
}

export function getShiftDisplayDate(shift: StudioShift): string {
  const sortedBlocks = sortShiftBlocksByStart(shift.blocks);
  const firstBlock = sortedBlocks[0];

  // Prefer ISO block timestamps as source of truth for date rendering.
  if (firstBlock) {
    return formatDate(firstBlock.start_time);
  }

  return formatDate(shift.date);
}

export function getShiftBlockLabels(shift: StudioShift): string[] {
  if (shift.blocks.length === 0) {
    return [];
  }

  const sortedBlocks = sortShiftBlocksByStart(shift.blocks);

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return sortedBlocks.map((block) =>
    `${formatter.format(new Date(block.start_time))} - ${formatter.format(new Date(block.end_time))}`);
}
