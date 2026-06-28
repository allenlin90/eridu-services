import { OPERATIONAL_DAY_START_HOUR } from '@/lib/utils/operational-day.util';

export const DEFAULT_MCP_TIMEZONE_OFFSET_MINUTES = 7 * 60;
export const DEFAULT_MCP_OPERATIONAL_DAY_START_HOUR = OPERATIONAL_DAY_START_HOUR;

export type McpDatePreset = 'today' | 'yesterday' | 'tomorrow';

export type McpOperationalDateRangeInput = {
  dateFrom?: string;
  dateTo?: string;
  operationalDate?: string;
  datePreset?: McpDatePreset;
  timezoneOffsetMinutes?: number;
  operationalDayStartHour?: number;
};

export type McpResolvedDateRange = {
  dateFrom?: string;
  dateTo?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function resolveMcpOperationalDateRange(
  input: McpOperationalDateRangeInput,
  now = new Date(),
): McpResolvedDateRange {
  if (input.dateFrom || input.dateTo) {
    return {
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    };
  }

  const timezoneOffsetMinutes = input.timezoneOffsetMinutes ?? DEFAULT_MCP_TIMEZONE_OFFSET_MINUTES;
  const operationalDayStartHour = input.operationalDayStartHour ?? DEFAULT_MCP_OPERATIONAL_DAY_START_HOUR;

  const operationalDate = input.operationalDate
    ?? (input.datePreset
      ? resolvePresetDate(
          input.datePreset,
          timezoneOffsetMinutes,
          operationalDayStartHour,
          now,
        )
      : undefined);

  if (!operationalDate) {
    return {};
  }

  const startUtcMs = operationalDateStartUtcMs(
    operationalDate,
    timezoneOffsetMinutes,
    operationalDayStartHour,
  );

  return {
    dateFrom: new Date(startUtcMs).toISOString(),
    dateTo: new Date(startUtcMs + DAY_MS - 1).toISOString(),
  };
}

function resolvePresetDate(
  preset: McpDatePreset,
  timezoneOffsetMinutes: number,
  operationalDayStartHour: number,
  now: Date,
): string {
  // Roll back by the operational-day start hour before taking the calendar
  // date, so a call made before the cutover (e.g. 01:00 local when the
  // operational day starts at 06:00) still resolves "today" to the
  // currently-running operational day instead of the next one.
  const operationalNow = new Date(
    now.getTime()
    + timezoneOffsetMinutes * 60 * 1000
    - operationalDayStartHour * 60 * 60 * 1000,
  );
  const dayDelta = preset === 'yesterday' ? -1 : preset === 'tomorrow' ? 1 : 0;
  const operationalDateMs = Date.UTC(
    operationalNow.getUTCFullYear(),
    operationalNow.getUTCMonth(),
    operationalNow.getUTCDate() + dayDelta,
  );
  return new Date(operationalDateMs).toISOString().slice(0, 10);
}

function operationalDateStartUtcMs(
  operationalDate: string,
  timezoneOffsetMinutes: number,
  operationalDayStartHour: number,
): number {
  const [year, month, day] = operationalDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day, operationalDayStartHour)
    - timezoneOffsetMinutes * 60 * 1000;
}
