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
