/**
 * Pure helpers for a studio planning-scope date window: defaulting, parsing,
 * and formatting the date range that gates the planning show lists. Shared by
 * the Task Setup and Creator Mapping routes (both pick shows within a scope).
 * No React/query state — orchestration lives in each route's controller hook.
 */
import type { DateRange } from 'react-day-picker';

import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import {
  normalizeScopeDate,
  parseScopeDateAsLocal,
} from '@/features/studio-shows/utils/show-scope.utils';

export type ScopeRange = {
  date_from?: string;
  date_to?: string;
};

export function getDefaultPlanningRange(): ScopeRange {
  const start = new Date();
  const end = addDays(start, 7);
  return {
    date_from: toLocalDateInputValue(start),
    date_to: toLocalDateInputValue(end),
  };
}

export function parseSearchDate(raw?: string): Date | undefined {
  return parseScopeDateAsLocal(raw);
}

export function toApiDate(raw?: string): string | undefined {
  return normalizeScopeDate(raw);
}

export function buildScopeRange(range: DateRange | undefined): ScopeRange {
  const fromDate = range?.from ?? range?.to;
  const toDate = range?.to ?? range?.from;

  if (!fromDate || !toDate) {
    return {
      date_from: undefined,
      date_to: undefined,
    };
  }

  return {
    date_from: toLocalDateInputValue(fromDate),
    date_to: toLocalDateInputValue(toDate),
  };
}

export function formatScopeLabel(dateFrom?: string, dateTo?: string): string {
  const from = toApiDate(dateFrom);
  const to = toApiDate(dateTo);

  if (!from || !to) {
    return 'No date scope selected';
  }

  if (from === to) {
    return from;
  }

  return `${from} to ${to}`;
}
