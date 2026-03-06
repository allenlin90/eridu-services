export type StudioShiftsRouteSearch = {
  view: 'calendar' | 'table';
  page: number;
  limit: number;
  user_id?: string;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  duty?: 'true' | 'false';
  date_from?: string;
  date_to?: string;
};

export function toCalendarViewSearch(): StudioShiftsRouteSearch {
  return {
    view: 'calendar',
    page: 1,
    limit: 20,
  };
}

export function toTableViewSearch(
  previous: StudioShiftsRouteSearch,
): StudioShiftsRouteSearch {
  return {
    ...previous,
    view: 'table',
  };
}
