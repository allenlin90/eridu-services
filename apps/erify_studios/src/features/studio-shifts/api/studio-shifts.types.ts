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
    assigned_members_checked: number;
    idle_segments_count: number;
    missing_shift_count: number;
  };
  idle_segments: Array<{
    show_id: string;
    show_name: string;
    user_id: string;
    user_name: string;
    segment_start: string;
    segment_end: string;
    duration_minutes: number;
  }>;
  missing_shift_assignments: Array<{
    show_id: string;
    show_name: string;
    user_id: string;
    user_name: string;
    show_start: string;
    show_end: string;
  }>;
};
