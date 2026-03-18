import { Search } from 'lucide-react';

import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@eridu/ui';

import type { TaskReportViewFilters } from '../lib/filter-rows';

type ReportViewFiltersProps = {
  filters: TaskReportViewFilters;
  onChange: (filters: TaskReportViewFilters) => void;
  availableClients: string[];
  availableRooms: string[];
  availableStatuses: string[];
};

export function ReportViewFilters({
  filters,
  onChange,
  availableClients,
  availableRooms,
  availableStatuses,
}: ReportViewFiltersProps) {
  const update = (key: keyof TaskReportViewFilters, val: string | undefined) => {
    onChange({ ...filters, [key]: val });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 py-4 border-b">
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search all columns..."
          value={filters.search || ''}
          onChange={(e) => update('search', e.target.value.toLowerCase() || undefined)}
          className="h-8 md:w-[200px]"
        />
      </div>

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
    </div>
  );
}
