import { Search } from 'lucide-react';

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@eridu/ui';

import type { TaskReportViewFilters } from '../lib/filter-rows';

type ReportViewFiltersProps = {
  filters: TaskReportViewFilters;
  onChange: (filters: TaskReportViewFilters) => void;
  availableClients: string[];
  availableRooms: string[];
  availableStatuses: string[];
  availableAssignees: string[];
  showClientFilter?: boolean;
  showRoomFilter?: boolean;
  showStatusFilter?: boolean;
  showAssigneeFilter?: boolean;
  onClear?: () => void;
};

export function ReportViewFilters({
  filters,
  onChange,
  availableClients,
  availableRooms,
  availableStatuses,
  availableAssignees,
  showClientFilter = true,
  showRoomFilter = true,
  showStatusFilter = true,
  showAssigneeFilter = true,
  onClear,
}: ReportViewFiltersProps) {
  const update = (key: keyof TaskReportViewFilters, val: string | undefined) => {
    onChange({ ...filters, [key]: val });
  };
  const hasActiveFilters = Object.values(filters).some((value) => Boolean(value));
  const showAssignee = showAssigneeFilter && availableAssignees.length > 0;
  const showClient = showClientFilter && availableClients.length > 0;
  const showStatus = showStatusFilter && availableStatuses.length > 0;
  const showRoom = showRoomFilter && availableRooms.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search all columns..."
          value={filters.search || ''}
          onChange={(e) => update('search', e.target.value || undefined)}
          className="h-8 md:w-[200px]"
        />
      </div>

      {showAssignee
        ? (
            <div className="flex items-center space-x-2">
              <Label className="text-xs">Assignee</Label>
              <Select value={filters.assignee || 'all'} onValueChange={(val) => update('assignee', val === 'all' ? undefined : val)}>
                <SelectTrigger className="h-8 max-w-[180px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableAssignees.map((assignee) => <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )
        : null}

      {showClient
        ? (
            <div className="flex items-center space-x-2">
              <Label className="text-xs">Client</Label>
              <Select value={filters.client_id || 'all'} onValueChange={(val) => update('client_id', val === 'all' ? undefined : val)}>
                <SelectTrigger className="h-8 max-w-[150px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableClients.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )
        : null}

      {showStatus
        ? (
            <div className="flex items-center space-x-2">
              <Label className="text-xs">Status</Label>
              <Select value={filters.show_status_id || 'all'} onValueChange={(val) => update('show_status_id', val === 'all' ? undefined : val)}>
                <SelectTrigger className="h-8 max-w-[120px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )
        : null}

      {showRoom
        ? (
            <div className="flex items-center space-x-2">
              <Label className="text-xs">Room</Label>
              <Select value={filters.studio_room_id || 'all'} onValueChange={(val) => update('studio_room_id', val === 'all' ? undefined : val)}>
                <SelectTrigger className="h-8 max-w-[120px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableRooms.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )
        : null}

      {onClear
        ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={!hasActiveFilters}
            >
              Clear view filters
            </Button>
          )
        : null}
    </div>
  );
}
