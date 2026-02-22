import { RotateCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Input, useDebounce, type UseTableUrlStateReturn } from '@eridu/ui';

type StudioShowsToolbarProps = {
  tableState: UseTableUrlStateReturn;
  onRefresh: () => void;
  isRefreshing: boolean;
  total: number;
};

export function StudioShowsToolbar({ tableState, onRefresh, isRefreshing, total }: StudioShowsToolbarProps) {
  const { columnFilters, onColumnFiltersChange } = tableState;
  const searchValue = (columnFilters.find((f) => f.id === 'search')?.value as string) || '';

  const [localSearch, setLocalSearch] = useState(searchValue);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync local state with URL state (e.g. on back navigation)
  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  // Update URL state when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== searchValue) {
      onColumnFiltersChange((old) => {
        const newFilters = old.filter((f) => f.id !== 'search');
        if (debouncedSearch) {
          newFilters.push({ id: 'search', value: debouncedSearch });
        }
        return newFilters;
      });
    }
  }, [debouncedSearch, searchValue, onColumnFiltersChange]);

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search shows..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <span className="text-sm text-muted-foreground ml-auto">
        {total}
        {' '}
        shows
      </span>

      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
        <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="sr-only">Refresh</span>
      </Button>
    </div>
  );
}
