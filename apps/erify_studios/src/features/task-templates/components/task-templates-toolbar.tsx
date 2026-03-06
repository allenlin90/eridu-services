import { useNavigate } from '@tanstack/react-router';
import { MoreVertical, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  type UseTableUrlStateReturn,
} from '@eridu/ui';

import { useAppDebounce } from '@/lib/hooks/use-app-debounce';

type TaskTemplatesToolbarProps = {
  tableState: UseTableUrlStateReturn;
  onRefresh: () => void;
  isRefreshing?: boolean;
  studioId: string;
};

export function TaskTemplatesToolbar({
  tableState,
  onRefresh,
  isRefreshing,
  studioId,
}: TaskTemplatesToolbarProps) {
  const navigate = useNavigate();
  const { columnFilters, onColumnFiltersChange } = tableState;
  const searchValue = (columnFilters.find((f) => f.id === 'name')?.value as string) || '';

  // Local state for immediate UI updates
  const [localSearch, setLocalSearch] = useState(searchValue);
  const debouncedSearch = useAppDebounce(localSearch);

  // Sync local state with URL state
  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  // Update URL state when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== searchValue) {
      onColumnFiltersChange((old) => {
        const newFilters = old.filter((f) => f.id !== 'name');
        if (debouncedSearch) {
          newFilters.push({ id: 'name', value: debouncedSearch });
        }
        return newFilters;
      });
    }
  }, [debouncedSearch, searchValue, onColumnFiltersChange]);

  const handleCreate = () => {
    navigate({
      to: '/studios/$studioId/task-templates/new',
      params: { studioId },
    });
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          className="pl-8 h-9 w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh templates"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleCreate} size="sm">
            Create Template
          </Button>
        </div>

        {/* Mobile Actions Dropdown */}
        <div className="md:hidden flex-none">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRefresh} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreate}>
                Create Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
