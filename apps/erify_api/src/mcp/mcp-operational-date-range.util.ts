import { OPERATIONAL_DAY_START_HOUR } from '@/lib/utils/operational-day.util';

export const DEFAULT_MCP_TIMEZONE_OFFSET_MINUTES = 7 * 60; // 420 (UTC+7)
export const DEFAULT_MCP_OPERATIONAL_DAY_START_HOUR = OPERATIONAL_DAY_START_HOUR; // 6

export type McpOperationalDateRangeInput = {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
};

export type McpResolvedDateRange = {
  dateFrom?: string; // ISO string (UTC)
  dateTo?: string; // ISO string (UTC)
};

/**
 * Resolves a date range formatted in local YYYY-MM-DD to UTC ISO strings
 * using the studio's 06:00 operational day start time and UTC+7 offset.
 */
export function resolveMcpOperationalDateRange(
  input: McpOperationalDateRangeInput,
): McpResolvedDateRange {
  return {
    dateFrom: input.dateFrom ? resolveOperationalDateStart(input.dateFrom) : undefined,
    dateTo: input.dateTo ? resolveOperationalDateEnd(input.dateTo) : undefined,
  };
}

function resolveOperationalDateStart(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(dateStr).toISOString();
  }
  // Local 06:00 in UTC+7 is UTC 06:00 - 7 hours = 23:00 on the previous calendar day
  const utcMs = Date.UTC(year, month - 1, day, 6) - 7 * 60 * 60 * 1000;
  return new Date(utcMs).toISOString();
}

function resolveOperationalDateEnd(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(dateStr).toISOString();
  }
  // Local 05:59:59.999 next day in UTC+7 is UTC 05:59:59.999 next day - 7 hours = 22:59:59.999 on same calendar day
  const nextDayUtcMs = Date.UTC(year, month - 1, day + 1, 6) - 7 * 60 * 60 * 1000;
  return new Date(nextDayUtcMs - 1).toISOString();
}

/**
 * Resolves a YYYY-MM-DD date string to a JS Date object at local 00:00 (start)
 * or local 23:59:59.999 (end) in the UTC+7 timezone.
 */
export function resolveMcpCalendarDate(dateStr: string, isEnd = false): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(dateStr);
  }
  if (isEnd) {
    // Local 23:59:59.999 in UTC+7 is UTC 23:59:59.999 - 7 hours = 16:59:59.999
    const nextDayUtcMs = Date.UTC(year, month - 1, day + 1, 0) - 7 * 60 * 60 * 1000;
    return new Date(nextDayUtcMs - 1);
  } else {
    // Local 00:00 in UTC+7 is UTC 00:00 - 7 hours = 17:00 on the previous calendar day
    const utcMs = Date.UTC(year, month - 1, day, 0) - 7 * 60 * 60 * 1000;
    return new Date(utcMs);
  }
}
