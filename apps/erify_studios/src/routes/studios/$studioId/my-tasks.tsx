import { createFileRoute } from '@tanstack/react-router';
import { endOfDay, startOfDay } from 'date-fns';
import { ChevronDown, RotateCw, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';

import type { ListMyTasksQuery, TaskStatus } from '@eridu/api-types/task-management';
import { TASK_STATUS } from '@eridu/api-types/task-management';
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { MyTaskGrid } from '@/features/tasks/components/my-task-grid';
import { useMyTasks } from '@/features/tasks/hooks/use-my-tasks';

export const Route = createFileRoute('/studios/$studioId/my-tasks')({
  component: MyTasksPage,
});

type DateFilter = 'today' | 'upcoming' | 'all';

const DATE_TABS: { id: DateFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All' },
];

const STATUS_FILTERS: { value: TaskStatus; label: string }[] = [
  { value: TASK_STATUS.PENDING, label: 'Pending' },
  { value: TASK_STATUS.IN_PROGRESS, label: 'In Progress' },
  { value: TASK_STATUS.REVIEW, label: 'In Review' },
  { value: TASK_STATUS.BLOCKED, label: 'Blocked' },
  { value: TASK_STATUS.COMPLETED, label: 'Completed' },
];

function MyTasksPage() {
  const { studioId } = Route.useParams();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([
    TASK_STATUS.PENDING,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.REVIEW,
  ]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebounceValue(searchInput, 400);

  const toggleStatus = (status: TaskStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const clearFilters = () => {
    setDateFilter('all');
    setSelectedStatuses([]);
    setSearchInput('');
  };

  const hasActiveFilters = dateFilter !== 'all' || selectedStatuses.length > 0 || searchInput.length > 0;

  const buildQuery = (): ListMyTasksQuery => {
    const query: ListMyTasksQuery = { studio_id: studioId };

    if (dateFilter === 'today') {
      query.due_date_from = startOfDay(new Date()).toISOString();
      query.due_date_to = endOfDay(new Date()).toISOString();
    } else if (dateFilter === 'upcoming') {
      query.due_date_from = startOfDay(new Date()).toISOString();
    }

    if (selectedStatuses.length > 0) {
      query.status = selectedStatuses;
    }

    if (debouncedSearch) {
      query.search = debouncedSearch;
    }

    return query;
  };

  const { data, isLoading, isFetching, refetch } = useMyTasks(buildQuery());
  const tasks = data?.data ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">
          Stay on top of your assigned tasks. Manage your daily workflow and track progress.
        </p>
      </div>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 -mx-4 px-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        {/* Date tabs */}
        <div className="flex">
          {DATE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDateFilter(tab.id)}
              className={cn(
                'px-6 py-3 text-sm font-medium transition-colors relative',
                dateFilter === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {dateFilter === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 py-2">
          {/* Search */}
          <div className="relative flex-1 min-w-40 max-w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tasks…"
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Status multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                Status
                {selectedStatuses.length > 0 ? ` (${selectedStatuses.length})` : ''}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Status Filter</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_FILTERS.map((statusOption) => (
                <DropdownMenuCheckboxItem
                  key={statusOption.value}
                  checked={selectedStatuses.includes(statusOption.value)}
                  onCheckedChange={() => toggleStatus(statusOption.value)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {statusOption.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
          >
            <RotateCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Refresh
          </Button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <MyTaskGrid
        tasks={tasks}
        isLoading={isLoading}
        studioId={studioId}
      />
    </div>
  );
}
