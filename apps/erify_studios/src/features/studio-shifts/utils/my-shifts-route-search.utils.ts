export type MyShiftStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type MyShiftsRouteSearch = {
  view: 'calendar' | 'table';
  page: number;
  limit: number;
  date_from?: string;
  date_to?: string;
  status?: MyShiftStatus;
};
