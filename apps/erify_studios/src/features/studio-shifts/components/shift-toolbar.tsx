import { ChevronDown, Download, Filter, MoreVertical, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  AsyncCombobox,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import type { StudioShiftExportFormat } from '@/features/studio-shifts/utils/studio-shifts-export.utils';
import type { ShiftListDutyFilter, ShiftListStatus } from '@/features/studio-shifts/utils/studio-shifts-table.utils';
import { useAppDebounce } from '@/lib/hooks/use-app-debounce';

type ShiftToolbarProps = {
  searchParams: {
    user_id?: string;
    status?: ShiftListStatus;
    duty?: ShiftListDutyFilter;
  };
  onSearchChange: (updates: Partial<ShiftToolbarProps['searchParams']>) => void;
  onResetFilters: () => void;
  hasAnyFilters: boolean;
  memberOptions: { value: string; label: string }[];
  isLoadingMembers: boolean;
  onMemberSearch: (search: string) => void;
  onCreateClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onExport: (format: StudioShiftExportFormat) => void;
  canExport: boolean;
};

export function ShiftToolbar({
  searchParams,
  onSearchChange,
  onResetFilters,
  hasAnyFilters,
  memberOptions,
  isLoadingMembers,
  onMemberSearch,
  onCreateClick,
  onRefresh,
  isRefreshing,
  onExport,
  canExport,
}: ShiftToolbarProps) {
  const [localMemberSearch, setLocalMemberSearch] = useState('');
  const debouncedMemberSearch = useAppDebounce(localMemberSearch, { delay: 300 });

  useEffect(() => {
    onMemberSearch(debouncedMemberSearch);
  }, [debouncedMemberSearch, onMemberSearch]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 px-3 py-2 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Main Search */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="w-full max-w-[280px] sm:max-w-xs md:max-w-sm">
            <AsyncCombobox
              value={searchParams.user_id ?? ''}
              onChange={(value) => onSearchChange({ user_id: value || undefined })}
              onSearch={setLocalMemberSearch}
              options={memberOptions}
              isLoading={isLoadingMembers}
              placeholder="Search a studio member..."
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9">
                <Filter className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">More Filters</span>
                <span className="sm:hidden">Filters</span>
                {hasAnyFilters && (
                  <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    !
                  </span>
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-4" align="start">
              <div className="space-y-2">
                <p className="text-sm font-medium leading-none">Shift Status</p>
                <Select
                  value={searchParams.status ?? 'ALL'}
                  onValueChange={(value) => onSearchChange({ status: value === 'ALL' ? undefined : value as ShiftListStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium leading-none">Duty Manager</p>
                <Select
                  value={searchParams.duty ?? 'ALL'}
                  onValueChange={(value) => onSearchChange({ duty: value === 'ALL' ? undefined : value as ShiftListDutyFilter })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Members</SelectItem>
                    <SelectItem value="true">Duty Manager Only</SelectItem>
                    <SelectItem value="false">Non Duty Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasAnyFilters && (
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={onResetFilters}>
                  Reset All Filters
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {hasAnyFilters && (
            <Button
              className="hidden xl:flex h-9"
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetFilters}
            >
              Reset
            </Button>
          )}

        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2">
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={!canExport}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport('csv')} disabled={!canExport}>
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('json')} disabled={!canExport}>
                  Export JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-9 w-9"
              aria-label="Refresh shifts"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={onCreateClick} className="h-9">
              <Plus className="mr-2 h-4 w-4" />
              Create Shift
            </Button>
          </div>

          {/* Mobile Actions Dropdown */}
          <div className="sm:hidden flex-none">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onCreateClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Shift
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('csv')} disabled={!canExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('json')} disabled={!canExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
