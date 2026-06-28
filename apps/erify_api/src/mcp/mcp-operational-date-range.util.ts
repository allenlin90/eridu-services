export const DEFAULT_MCP_TIMEZONE_OFFSET_MINUTES = 7 * 60;
export const DEFAULT_MCP_OPERATIONAL_DAY_START_HOUR = 6;

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

  const operationalDate = input.operationalDate
    ?? (input.datePreset
      ? resolvePresetDate(
          input.datePreset,
          input.timezoneOffsetMinutes ?? DEFAULT_MCP_TIMEZONE_OFFSET_MINUTES,
          now,
        )
      : undefined);

  if (!operationalDate) {
    return {};
  }

  const startUtcMs = operationalDateStartUtcMs(
    operationalDate,
    input.timezoneOffsetMinutes ?? DEFAULT_MCP_TIMEZONE_OFFSET_MINUTES,
    input.operationalDayStartHour ?? DEFAULT_MCP_OPERATIONAL_DAY_START_HOUR,
  );

  return {
    dateFrom: new Date(startUtcMs).toISOString(),
    dateTo: new Date(startUtcMs + DAY_MS - 1).toISOString(),
  };
}

function resolvePresetDate(
  preset: McpDatePreset,
  timezoneOffsetMinutes: number,
  now: Date,
): string {
  const localNow = new Date(now.getTime() + timezoneOffsetMinutes * 60 * 1000);
  const dayDelta = preset === 'yesterday' ? -1 : preset === 'tomorrow' ? 1 : 0;
  const localDateMs = Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate() + dayDelta,
  );
  return new Date(localDateMs).toISOString().slice(0, 10);
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
