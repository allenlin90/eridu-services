import type { StudioShift, StudioShiftsResponse } from './studio-shifts.types';

import { apiClient } from '@/lib/api/client';

const SHIFT_EXPORT_PAGE_SIZE = 100;
const SHIFT_EXPORT_MAX_PAGES = 50;

export const SHIFT_EXPORT_MAX_RECORDS = SHIFT_EXPORT_PAGE_SIZE * SHIFT_EXPORT_MAX_PAGES;

export class ShiftExportTooLargeError extends Error {
  readonly totalRecords: number;
  constructor(totalRecords: number) {
    super(`Shift export exceeds limit of ${SHIFT_EXPORT_MAX_RECORDS} records (got ${totalRecords}).`);
    this.name = 'ShiftExportTooLargeError';
    this.totalRecords = totalRecords;
  }
}

export type GetStudioShiftsParams = {
  page?: number;
  limit?: number;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  is_duty_manager?: boolean;
};

export const studioShiftsKeys = {
  all: (studioId: string) => ['studio-shifts', studioId] as const,
  lists: (studioId: string) => [...studioShiftsKeys.all(studioId), 'list'] as const,
  listPrefix: (studioId: string) => [...studioShiftsKeys.lists(studioId)] as const,
  list: (studioId: string, filters?: unknown) => [...studioShiftsKeys.lists(studioId), filters] as const,
  detail: (studioId: string, shiftId: string) => [...studioShiftsKeys.all(studioId), 'detail', shiftId] as const,
  dutyManager: (studioId: string, time?: string) => [...studioShiftsKeys.all(studioId), 'duty-manager', time] as const,
};

type ShiftCostCompatibilityShape = {
  hourly_rate?: unknown;
  planned_cost?: unknown;
  actual_cost?: unknown;
  projected_cost?: unknown;
  calculated_cost?: unknown;
};

// Disposable workaround for the Phase 4 shift-cost cleanup rollout.
// Remove once deployed API responses and persisted query caches can no longer
// contain numeric decimals or legacy projected_cost/calculated_cost fields.
function normalizeDecimalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2);
  }

  return undefined;
}

function normalizeNullableDecimalString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  return normalizeDecimalString(value);
}

function normalizeShiftCostFields(shift: StudioShift): StudioShift {
  const costFields = shift as unknown as ShiftCostCompatibilityShape;
  const normalizedShift = { ...shift };
  const hourlyRate = normalizeDecimalString(costFields.hourly_rate);
  const plannedCost = normalizeDecimalString(costFields.planned_cost)
    ?? normalizeDecimalString(costFields.projected_cost);

  const hasActualCost = Object.prototype.hasOwnProperty.call(costFields, 'actual_cost');
  const hasCalculatedCost = Object.prototype.hasOwnProperty.call(costFields, 'calculated_cost');
  const actualCost = hasActualCost
    ? normalizeNullableDecimalString(costFields.actual_cost)
    : hasCalculatedCost
      ? normalizeNullableDecimalString(costFields.calculated_cost)
      : undefined;

  if (hourlyRate !== undefined) {
    normalizedShift.hourly_rate = hourlyRate;
  }

  if (plannedCost !== undefined) {
    normalizedShift.planned_cost = plannedCost;
  }

  if (actualCost !== undefined) {
    normalizedShift.actual_cost = actualCost;
  }

  return normalizedShift;
}

function normalizeStudioShiftsResponse(response: StudioShiftsResponse): StudioShiftsResponse {
  return {
    ...response,
    data: response.data.map(normalizeShiftCostFields),
  };
}

export async function getStudioShifts(
  studioId: string,
  params: GetStudioShiftsParams,
  options?: { signal?: AbortSignal },
): Promise<StudioShiftsResponse> {
  const response = await apiClient.get<StudioShiftsResponse>(`/studios/${studioId}/shifts`, {
    params,
    signal: options?.signal,
  });
  return normalizeStudioShiftsResponse(response.data);
}

export async function getStudioShift(
  studioId: string,
  shiftId: string,
  options?: { signal?: AbortSignal },
): Promise<StudioShift> {
  const response = await apiClient.get<StudioShift>(`/studios/${studioId}/shifts/${shiftId}`, {
    signal: options?.signal,
  });
  return normalizeShiftCostFields(response.data);
}

export async function getAllStudioShiftsForExport(
  studioId: string,
  params: Omit<GetStudioShiftsParams, 'page' | 'limit'>,
  options?: { signal?: AbortSignal },
): Promise<StudioShift[]> {
  const firstPage = await getStudioShifts(
    studioId,
    { ...params, page: 1, limit: SHIFT_EXPORT_PAGE_SIZE },
    { signal: options?.signal },
  );

  if (firstPage.meta.total > SHIFT_EXPORT_MAX_RECORDS) {
    throw new ShiftExportTooLargeError(firstPage.meta.total);
  }

  if (firstPage.meta.totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPages = Array.from(
    { length: firstPage.meta.totalPages - 1 },
    (_, index) => index + 2,
  );
  const remainingResponses = await Promise.all(
    remainingPages.map((page) => getStudioShifts(
      studioId,
      { ...params, page, limit: SHIFT_EXPORT_PAGE_SIZE },
      { signal: options?.signal },
    )),
  );

  return [
    ...firstPage.data,
    ...remainingResponses.flatMap((response) => response.data),
  ];
}

export async function getDutyManager(
  studioId: string,
  time?: string,
  options?: { signal?: AbortSignal },
): Promise<StudioShift | null> {
  const response = await apiClient.get<StudioShift | null>(`/studios/${studioId}/shifts/duty-manager`, {
    params: time ? { time } : undefined,
    signal: options?.signal,
  });
  return response.data ? normalizeShiftCostFields(response.data) : null;
}
