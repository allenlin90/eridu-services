import type {
  StudioShiftApiResponse,
  StudioShiftBlockApiResponse,
} from '@eridu/api-types/studio-shifts';

export type StudioShiftBlock = StudioShiftBlockApiResponse;
export type StudioShift = StudioShiftApiResponse;

export type StudioShiftsResponse = {
  data: StudioShift[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type StudioShiftCalendarQueryParams = {
  date_from?: string;
  date_to?: string;
  include_cancelled?: boolean;
};

export type StudioShiftAlignmentQueryParams = {
  date_from?: string;
  date_to?: string;
  include_cancelled?: boolean;
};

export type StudioShiftCalendarResponse = {
  period: {
    date_from: string;
    date_to: string;
  };
  summary: {
    shift_count: number;
    block_count: number;
    total_hours: number;
    total_projected_cost: string;
    total_calculated_cost: string;
  };
  timeline: Array<{
    date: string;
    users: Array<{
      user_id: string;
      user_name: string;
      total_hours: number;
      total_projected_cost: string;
      shifts: Array<{
        shift_id: string;
        status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
        is_duty_manager: boolean;
        hourly_rate: string;
        projected_cost: string;
        calculated_cost: string | null;
        total_hours: number;
        blocks: Array<{
          block_id: string;
          start_time: string;
          end_time: string;
          duration_hours: number;
        }>;
      }>;
    }>;
  }>;
};

export type StudioShiftAlignmentResponse = {
  period: {
    date_from: string;
    date_to: string;
  };
  summary: {
    shows_checked: number;
    operational_days_checked: number;
    risk_show_count: number;
    shows_without_duty_manager_count: number;
    operational_days_without_duty_manager_count: number;
    shows_without_tasks_count: number;
    shows_with_unassigned_tasks_count: number;
    tasks_unassigned_count: number;
    shows_missing_required_tasks_count: number;
    premium_shows_missing_moderation_count: number;
  };
  duty_manager_uncovered_segments: Array<{
    operational_day: string;
    segment_start: string;
    segment_end: string;
    duration_minutes: number;
    first_show_start: string;
    last_show_end: string;
  }>;
  duty_manager_missing_shows: Array<{
    show_id: string;
    show_name: string;
    show_start: string;
    show_end: string;
    operational_day: string;
  }>;
  task_readiness_warnings: Array<{
    show_id: string;
    show_name: string;
    show_start: string;
    show_end: string;
    operational_day: string;
    show_standard: string;
    has_no_tasks: boolean;
    unassigned_task_count: number;
    missing_required_task_types: Array<'SETUP' | 'ACTIVE' | 'CLOSURE'>;
    missing_moderation_task: boolean;
  }>;
};
