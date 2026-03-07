import {
  addDays,
  DEFAULT_OPERATIONAL_DAY_END_HOUR,
  fromLocalDateInput,
} from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeScopeDate(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }

  if (DATE_ONLY_PATTERN.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return toLocalDateInputValue(parsed);
}

export function parseScopeDateAsLocal(raw?: string): Date | undefined {
  const normalized = normalizeScopeDate(raw);
  if (!normalized) {
    return undefined;
  }

  return fromLocalDateInput(normalized);
}

export function toShowScopeDateTimeBounds(params: {
  dateFrom?: string;
  dateTo?: string;
  operationalDayEndHour?: number;
}) {
  const normalizedFrom = normalizeScopeDate(params.dateFrom);
  const normalizedTo = normalizeScopeDate(params.dateTo);

  if (!normalizedFrom && !normalizedTo) {
    return {
      date_from: undefined,
      date_to: undefined,
    };
  }

  const effectiveFrom = normalizedFrom ?? normalizedTo;
  const effectiveTo = normalizedTo ?? normalizedFrom;

  if (!effectiveFrom || !effectiveTo) {
    return {
      date_from: undefined,
      date_to: undefined,
    };
  }

  const fromDate = fromLocalDateInput(effectiveFrom);
  fromDate.setHours(0, 0, 0, 0);

  const toDate = fromLocalDateInput(effectiveTo);
  const scopeEnd = addDays(toDate, 1);
  const endHour = params.operationalDayEndHour ?? DEFAULT_OPERATIONAL_DAY_END_HOUR;
  scopeEnd.setHours(endHour - 1, 59, 59, 999);

  return {
    date_from: fromDate.toISOString(),
    date_to: scopeEnd.toISOString(),
  };
}
