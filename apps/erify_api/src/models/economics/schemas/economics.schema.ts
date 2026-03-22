import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { ClientService } from '@/models/client/client.service';
import { ScheduleService } from '@/models/schedule/schedule.service';

// ============================================================================
// DTO (snake_case input → camelCase payload via transform)
// ============================================================================

export const groupedEconomicsQuerySchema = z
  .object({
    group_by: z.enum(['show', 'schedule', 'client']),
    date_from: z.string(),
    date_to: z.string(),
    client_id: z
      .string()
      .startsWith(ClientService.UID_PREFIX)
      .optional(),
    schedule_id: z
      .string()
      .startsWith(ScheduleService.UID_PREFIX)
      .optional(),
  })
  .transform((data) => ({
    groupBy: data.group_by as 'show' | 'schedule' | 'client',
    dateFrom: new Date(data.date_from),
    dateTo: new Date(data.date_to),
    clientUid: data.client_id,
    scheduleUid: data.schedule_id,
  }));

export class GroupedEconomicsQueryDto extends createZodDto(groupedEconomicsQuerySchema) {}

// ============================================================================
// Service-layer payload types (camelCase)
// ============================================================================

export type GroupedEconomicsFilters = {
  groupBy: 'show' | 'schedule' | 'client';
  dateFrom: Date;
  dateTo: Date;
  clientUid?: string;
  scheduleUid?: string;
};

export type CreatorCostItem = {
  creatorUid: string;
  creatorName: string;
  compensationType: string | null;
  agreedRate: string | null;
  computedCost: string | null;
};

export type ShiftCostItem = {
  shiftUid: string;
  userName: string;
  hourlyRate: string;
  overlapMinutes: number;
  attributedCost: string;
};

export type ShowEconomicsResult = {
  showUid: string;
  showName: string;
  showExternalId: string | null;
  startTime: Date;
  endTime: Date;
  clientName: string;
  creatorCosts: CreatorCostItem[];
  shiftCosts: ShiftCostItem[];
  totalCreatorCost: string;
  totalShiftCost: string;
  totalCost: string;
};

export type GroupedEconomicsGroup = {
  groupKey: string;
  groupLabel: string;
  showCount: number;
  totalCreatorCost: string;
  totalShiftCost: string;
  totalCost: string;
};

export type GroupedEconomicsSummary = {
  totalCreatorCost: string;
  totalShiftCost: string;
  totalCost: string;
  showCount: number;
};

export type GroupedEconomicsResult = {
  groups: GroupedEconomicsGroup[];
  summary: GroupedEconomicsSummary;
};
