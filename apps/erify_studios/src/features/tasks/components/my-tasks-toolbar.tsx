import { ChevronDown, RotateCw, Search, X } from 'lucide-react';

import type { TaskStatus, TaskType } from '@eridu/api-types/task-management';
import { TASK_STATUS, TASK_TYPE } from '@eridu/api-types/task-management';
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import type { DateFilter, MyTaskPageSize, MyTaskSort, TaskViewMode } from '../hooks/use-my-tasks-filters';

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

const TASK_TYPE_FILTERS: { value: TaskType; label: string }[] = [
  { value: TASK_TYPE.SETUP, label: 'Setup' },
  { value: TASK_TYPE.ACTIVE, label: 'Active' },
  { value: TASK_TYPE.CLOSURE, label: 'Closure' },
  { value: TASK_TYPE.ADMIN, label: 'Admin' },
  { value: TASK_TYPE.ROUTINE, label: 'Routine' },
  { value: TASK_TYPE.OTHER, label: 'Other' },
];

const SORT_OPTIONS: { value: MyTaskSort; label: string }[] = [
  { value: 'due_date:asc', label: 'Due date (earliest)' },
  { value: 'due_date:desc', label: 'Due date (latest)' },
  { value: 'updated_at:desc', label: 'Recently updated' },
];

const PAGE_SIZE_OPTIONS: MyTaskPageSize[] = [20, 50, 100];

type MyTasksToolbarProps = {
  dateFilter: DateFilter;
  onDateFilterChange: (dateFilter: DateFilter) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: TaskStatus[];
  onToggleStatus: (status: TaskStatus) => void;
  selectedTaskTypes: TaskType[];
  onToggleTaskType: (taskType: TaskType) => void;
  sortBy: MyTaskSort;
  onSortChange: (sort: MyTaskSort) => void;
  limit: MyTaskPageSize;
  onLimitChange: (limit: MyTaskPageSize) => void;
  isFetching: boolean;
  onRefresh: () => void;
  viewMode: TaskViewMode;
  onViewModeChange: (mode: TaskViewMode) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;
};

export function MyTasksToolbar({
  dateFilter,
  onDateFilterChange,
  searchInput,
  onSearchChange,
  selectedStatuses,
  onToggleStatus,
  selectedTaskTypes,
  onToggleTaskType,
  sortBy,
  onSortChange,
  limit,
  onLimitChange,
  isFetching,
  onRefresh,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  activeFilterCount,
  onClearFilters,
}: MyTasksToolbarProps) {
  return (
    <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex">
        {DATE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onDateFilterChange(tab.id)}
            className={cn(
              'relative px-6 py-3 text-sm font-medium transition-colors',
              dateFilter === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {dateFilter === tab.id && (
              <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 py-2">
        <div className="relative min-w-40 max-w-64 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks..."
            className="h-8 pl-8 text-sm"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
            >
              Filters
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Task Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52">
                {STATUS_FILTERS.map((statusOption) => (
                  <DropdownMenuCheckboxItem
                    key={statusOption.value}
                    checked={selectedStatuses.includes(statusOption.value)}
                    onCheckedChange={() => onToggleStatus(statusOption.value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {statusOption.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Task Type</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52">
                {TASK_TYPE_FILTERS.map((taskTypeOption) => (
                  <DropdownMenuCheckboxItem
                    key={taskTypeOption.value}
                    checked={selectedTaskTypes.includes(taskTypeOption.value)}
                    onCheckedChange={() => onToggleTaskType(taskTypeOption.value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {taskTypeOption.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Sort</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuRadioGroup
                  value={sortBy}
                  onValueChange={(value) => onSortChange(value as MyTaskSort)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Rows Per Page</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36">
                <DropdownMenuRadioGroup
                  value={String(limit)}
                  onValueChange={(value) => onLimitChange(Number(value) as MyTaskPageSize)}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option} value={String(option)}>
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RotateCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Refresh
        </Button>

        <div className="flex items-center gap-1 rounded-md border p-0.5">
          <Button
            type="button"
            variant={viewMode === 'task' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onViewModeChange('task')}
          >
            Task View
          </Button>
          <Button
            type="button"
            variant={viewMode === 'show' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onViewModeChange('show')}
          >
            Show View
          </Button>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-8 gap-1 text-xs"
            onClick={onClearFilters}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
