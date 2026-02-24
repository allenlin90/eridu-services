import { addDays, endOfDay, startOfDay } from 'date-fns';
import { useMemo, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';

import type { ListMyTasksQuery, TaskStatus, TaskType } from '@eridu/api-types/task-management';
import { TASK_STATUS } from '@eridu/api-types/task-management';

export type DateFilter = 'today' | 'upcoming' | 'all';
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

export function useMyTasksFilters(studioId: string) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>(DEFAULT_STATUS_FILTERS);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<TaskType[]>([]);
  const [sortBy, setSortBy] = useState<MyTaskSort>(DEFAULT_SORT);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<MyTaskPageSize>(DEFAULT_LIMIT);
  const [viewMode, setViewMode] = useState<TaskViewMode>('task');
  const [debouncedSearch] = useDebounceValue(searchInput, 400);

  const toggleStatus = (status: TaskStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
    setPage(1);
  };

  const toggleTaskType = (taskType: TaskType) => {
    setSelectedTaskTypes((prev) =>
      prev.includes(taskType) ? prev.filter((t) => t !== taskType) : [...prev, taskType]);
    setPage(1);
  };

  const setSearch = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const setSort = (value: MyTaskSort) => {
    setSortBy(value);
    setPage(1);
  };

  const setPageSize = (value: MyTaskPageSize) => {
    setLimit(value);
    setPage(1);
  };

  const clearFilters = () => {
    setDateFilter('all');
    setSelectedStatuses([]);
    setSelectedTaskTypes([]);
    setSortBy(DEFAULT_SORT);
    setSearchInput('');
    setPage(1);
    setLimit(DEFAULT_LIMIT);
  };

  const statusModified = selectedStatuses.length !== DEFAULT_STATUS_FILTERS.length
    || !DEFAULT_STATUS_FILTERS.every((s) => selectedStatuses.includes(s));

  const hasActiveFilters = dateFilter !== 'all'
    || statusModified
    || selectedTaskTypes.length > 0
    || searchInput.length > 0
    || sortBy !== DEFAULT_SORT
    || limit !== DEFAULT_LIMIT;

  const activeFilterCount = (statusModified ? 1 : 0)
    + selectedTaskTypes.length
    + (sortBy !== DEFAULT_SORT ? 1 : 0)
    + (limit !== DEFAULT_LIMIT ? 1 : 0);

  const query = useMemo<ListMyTasksQuery>(() => {
    const nextQuery: ListMyTasksQuery = {
      studio_id: studioId,
      page,
      limit,
      sort: sortBy,
    };

    if (dateFilter === 'today') {
      nextQuery.due_date_from = startOfDay(new Date()).toISOString();
      nextQuery.due_date_to = endOfDay(new Date()).toISOString();
    } else if (dateFilter === 'upcoming') {
      nextQuery.due_date_from = startOfDay(addDays(new Date(), 1)).toISOString();
    }

    if (selectedStatuses.length > 0) {
      nextQuery.status = selectedStatuses;
    }

    if (selectedTaskTypes.length > 0) {
      nextQuery.task_type = selectedTaskTypes;
    }

    if (debouncedSearch) {
      nextQuery.search = debouncedSearch;
    }

    return nextQuery;
  }, [dateFilter, debouncedSearch, limit, page, selectedStatuses, selectedTaskTypes, sortBy, studioId]);

  return {
    query,
    page,
    setPage,
    dateFilter,
    setDateFilter,
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
    hasActiveFilters,
    activeFilterCount,
    clearFilters,
  };
}
