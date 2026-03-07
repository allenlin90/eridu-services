import type {
  StudioShiftAlignmentResponse,
  StudioShiftApiResponse,
  StudioShiftBlockApiResponse,
  StudioShiftCalendarResponse,
} from '@eridu/api-types/studio-shifts';

export type StudioShiftBlock = StudioShiftBlockApiResponse;
export type StudioShift = StudioShiftApiResponse;
export type { StudioShiftAlignmentResponse, StudioShiftCalendarResponse };

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
  include_past?: boolean;
};
