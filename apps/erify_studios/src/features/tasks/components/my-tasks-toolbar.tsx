import { ChevronDown, RotateCw, Search, X } from 'lucide-react';

import type { TaskStatus, TaskType } from '@eridu/api-types/task-management';
import { TASK_STATUS, TASK_TYPE } from '@eridu/api-types/task-management';
import {
  Button,
  DatePicker,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import type { MyTaskPageSize, MyTaskSort, TaskViewMode } from '../hooks/use-my-tasks-filters';

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
  showStartDate: string;
  onShowStartDateChange: (value: string) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: TaskStatus[];
  onToggleStatus: (status: TaskStatus) => void;
  overdueOnly: boolean;
  onOverdueOnlyChange: (enabled: boolean) => void;
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
  showStartDate,
  onShowStartDateChange,
  searchInput,
  onSearchChange,
  selectedStatuses,
  onToggleStatus,
  overdueOnly,
  onOverdueOnlyChange,
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
  const selectedStatusCount = selectedStatuses.length;
  const selectedTaskTypeCount = selectedTaskTypes.length;

  return (
    <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex flex-col gap-2 py-2">
        <div className="relative w-full">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks..."
            className="h-8 pl-8 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:min-w-48">
            <DatePicker
              value={showStartDate}
              onChange={onShowStartDateChange}
              className="h-8 min-w-0 flex-1 text-xs sm:flex-none"
            />
            {showStartDate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onShowStartDateChange('')}
                title="Clear show start date filter"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                Status
                {selectedStatusCount > 0 ? ` (${selectedStatusCount})` : ''}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              collisionPadding={12}
              className="w-[calc(100vw-2rem)] max-w-72 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain"
            >
              <DropdownMenuLabel>Task Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
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
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                Task Type
                {selectedTaskTypeCount > 0 ? ` (${selectedTaskTypeCount})` : ''}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              collisionPadding={12}
              className="w-[calc(100vw-2rem)] max-w-72 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain"
            >
              <DropdownMenuLabel>Task Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
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
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                Options
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              collisionPadding={12}
              className="w-[calc(100vw-2rem)] max-w-72 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain"
            >
              <DropdownMenuLabel>Sort</DropdownMenuLabel>
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

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Rows Per Page</DropdownMenuLabel>
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
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant={overdueOnly ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onOverdueOnlyChange(!overdueOnly)}
          >
            Overdue
          </Button>

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
    </div>
  );
}
