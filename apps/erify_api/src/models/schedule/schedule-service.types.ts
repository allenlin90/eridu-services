import type { Schedule } from '@prisma/client';

import type {
  ScheduleInclude,
  ScheduleWithRelations,
} from './schemas/schedule.schema';

export type ListSchedulesByStudioParams = {
  take?: number;
  skip?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: ScheduleInclude;
};

export type BulkScheduleResultRow = {
  index?: number;
  schedule_id?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  success: boolean;
  error?: string | null;
  error_code?: string | null;
};

export type BulkScheduleOperationResult = {
  total: number;
  successful: number;
  failed: number;
  results: BulkScheduleResultRow[];
  successfulSchedules?: Array<Schedule | ScheduleWithRelations<ScheduleInclude>>;
};

export type MonthlyScheduleOverview = {
  startDate: Date;
  endDate: Date;
  totalSchedules: number;
  schedulesByClient: Record<
    string,
    {
      clientId: string;
      clientName: string;
      count: number;
      schedules: Array<Schedule | ScheduleWithRelations<ScheduleInclude>>;
    }
  >;
  schedulesByStatus: Record<string, number>;
  schedules: Array<Schedule | ScheduleWithRelations<ScheduleInclude>>;
};
