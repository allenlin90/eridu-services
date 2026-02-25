import { addDays, addHours, endOfDay, startOfDay } from 'date-fns';
import { useMemo } from 'react';

import type { ListMyTasksQuery, TaskStatus, TaskType } from '@eridu/api-types/task-management';
import { TASK_STATUS } from '@eridu/api-types/task-management';

import type { MyTasksSearch } from '../config/my-tasks-search-schema';

import { useAppDebounce } from '@/lib/hooks/use-app-debounce';

export type TaskViewMode = 'task' | 'show';
export type MyTaskSort = 'due_date:asc' | 'due_date:desc' | 'updated_at:desc';
export type MyTaskPageSize = 20 | 50 | 100;

const DEFAULT_STATUS_FILTERS: TaskStatus[] = [
  TASK_STATUS.PENDING,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.REVIEW,
];

const DEFAULT_SORT: MyTaskSort = 'due_date:asc';
const DEFAULT_LIMIT: MyTaskPageSize = 20;
const OPERATIONAL_DAY_NEXT_MORNING_CUTOFF_HOURS = 6;
const OVERDUE_STATUS_FILTERS: TaskStatus[] = [
  TASK_STATUS.PENDING,
  TASK_STATUS.IN_PROGRESS,
];

type SetUrlSearch = (updater: (prev: MyTasksSearch) => MyTasksSearch) => void;

export function useMyTasksFilters(studioId: string, search: MyTasksSearch, setUrlSearch: SetUrlSearch) {
  const showStartDate = search.show_start_date ?? '';
  const selectedStatuses = search.status;
  const selectedTaskTypes = search.task_type;
  const sortBy = search.sort;
  const searchInput = search.search ?? '';
  const debouncedSearchInput = useAppDebounce(searchInput);
  const page = search.page;
  const limit = search.limit;
  const viewMode = search.view_mode;
  const overdueOnly = search.overdue_only ?? false;

  const setShowStartDate = (value: string) => {
    setUrlSearch((prev) => ({
      ...prev,
      show_start_date: value || undefined,
      page: 1,
    }));
  };

  const toggleStatus = (status: TaskStatus) => {
    setUrlSearch((prev) => {
      const nextStatuses = prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status];

      return {
        ...prev,
        status: nextStatuses,
        page: 1,
      };
    });
  };

  const toggleTaskType = (taskType: TaskType) => {
    setUrlSearch((prev) => {
      const nextTaskTypes = prev.task_type.includes(taskType)
        ? prev.task_type.filter((t) => t !== taskType)
        : [...prev.task_type, taskType];
      return {
        ...prev,
        task_type: nextTaskTypes,
        page: 1,
      };
    });
  };

  const setSearch = (value: string) => {
    setUrlSearch((prev) => ({
      ...prev,
      search: value || undefined,
      page: 1,
    }));
  };

  const setSort = (value: MyTaskSort) => {
    setUrlSearch((prev) => ({
      ...prev,
      sort: value,
      page: 1,
    }));
  };

  const setPageSize = (value: MyTaskPageSize) => {
    setUrlSearch((prev) => ({
      ...prev,
      limit: value,
      page: 1,
    }));
  };

  const setPage = (updater: number | ((currentPage: number) => number)) => {
    setUrlSearch((prev) => ({
      ...prev,
      page: typeof updater === 'function' ? updater(prev.page) : updater,
    }));
  };

  const setViewMode = (mode: TaskViewMode) => {
    setUrlSearch((prev) => ({
      ...prev,
      view_mode: mode,
    }));
  };

  const setOverdueOnly = (enabled: boolean) => {
    setUrlSearch((prev) => ({
      ...prev,
      overdue_only: enabled || undefined,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setUrlSearch((prev) => ({
      ...prev,
      page: 1,
      limit: DEFAULT_LIMIT,
      show_start_date: undefined,
      status: [],
      task_type: [],
      search: undefined,
      sort: DEFAULT_SORT,
      view_mode: 'task',
      overdue_only: undefined,
    }));
  };

  const statusModified = selectedStatuses.length !== DEFAULT_STATUS_FILTERS.length
    || !DEFAULT_STATUS_FILTERS.every((s) => selectedStatuses.includes(s));

  const hasActiveFilters = showStartDate.length > 0
    || statusModified
    || selectedTaskTypes.length > 0
    || searchInput.length > 0
    || sortBy !== DEFAULT_SORT
    || limit !== DEFAULT_LIMIT
    || overdueOnly;

  const activeFilterCount = (showStartDate.length > 0 ? 1 : 0)
    + (statusModified ? 1 : 0)
    + selectedTaskTypes.length
    + (sortBy !== DEFAULT_SORT ? 1 : 0)
    + (limit !== DEFAULT_LIMIT ? 1 : 0)
    + (overdueOnly ? 1 : 0);

  const query = useMemo<ListMyTasksQuery>(() => {
    const nextQuery: ListMyTasksQuery = {
      studio_id: studioId,
      page,
      limit,
      sort: sortBy,
    };

    if (showStartDate) {
      const selectedDate = new Date(`${showStartDate}T00:00:00`);
      nextQuery.show_start_from = startOfDay(selectedDate).toISOString();
      nextQuery.show_start_to = addHours(
        startOfDay(addDays(selectedDate, 1)),
        OPERATIONAL_DAY_NEXT_MORNING_CUTOFF_HOURS,
      ).toISOString();
    }

    if (overdueOnly) {
      nextQuery.due_date_to = endOfDay(new Date()).toISOString();
      nextQuery.status = OVERDUE_STATUS_FILTERS;
    } else if (selectedStatuses.length > 0) {
      nextQuery.status = selectedStatuses;
    }

    if (selectedTaskTypes.length > 0) {
      nextQuery.task_type = selectedTaskTypes;
    }

    if (debouncedSearchInput) {
      nextQuery.search = debouncedSearchInput;
    }

    return nextQuery;
  }, [
    debouncedSearchInput,
    limit,
    overdueOnly,
    page,
    selectedStatuses,
    selectedTaskTypes,
    showStartDate,
    sortBy,
    studioId,
  ]);

  return {
    query,
    page,
    setPage,
    showStartDate,
    setShowStartDate,
    selectedStatuses,
    toggleStatus,
    selectedTaskTypes,
    toggleTaskType,
    sortBy,
    setSort,
    searchInput,
    setSearch,
    limit,
    setPageSize,
    viewMode,
    setViewMode,
    overdueOnly,
    setOverdueOnly,
    hasActiveFilters,
    activeFilterCount,
    clearFilters,
  };
}
