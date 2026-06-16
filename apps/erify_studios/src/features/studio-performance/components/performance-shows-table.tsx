import { useQuery } from '@tanstack/react-query';
import type { ColumnFiltersState, OnChangeFn, PaginationState } from '@tanstack/react-table';
import { Filter, RefreshCw, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { ShowPerformanceResponse } from '@eridu/api-types/performance';
import {
  Badge,
  Button,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { resolvePaginationAction } from './pagination-action';
import { FilterFields } from './performance-filter-fields';
import { type PerformanceSearch, toArrayParam } from './performance-shows-filters.utils';
import { usePerformanceShowsColumns } from './use-performance-shows-columns';

import { getClients } from '@/features/clients/api/get-clients';
import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';

type PerformanceShowsTableProps = {
  data: ShowPerformanceResponse[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  /** Shows-query freshness — drives the table's own background overlay. */
  isFetching: boolean;
  /** Either query fetching — drives the manual refresh button, which refetches both. */
  isRefreshing: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  studioId: string;
  search: PerformanceSearch;
  updateSearch: (nextSearch: Partial<PerformanceSearch>) => void;
  onRefresh: () => void;
  locale?: string;
  currency?: string;
};

export function PerformanceShowsTable({
  data,
  total,
  page,
  limit,
  isLoading,
  isFetching,
  isRefreshing,
  onPageChange,
  onLimitChange,
  studioId,
  search,
  updateSearch,
  onRefresh,
  locale,
  currency,
}: PerformanceShowsTableProps) {
  const pageCount = Math.ceil(total / limit);
  const [clientSearch, setClientSearch] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Sync lookups and async combobox filters
  const { data: lookups } = useShowLookupsQuery(studioId);

  const selectedClient = useMemo(() => {
    return (lookups?.clients ?? []).find((c) => c.id === search.client_id);
  }, [lookups?.clients, search.client_id]);

  const { data: clientsResponse, isLoading: isLoadingClients } = useQuery({
    queryKey: ['performance-clients', studioId, clientSearch],
    queryFn: ({ signal }) => getClients({ name: clientSearch || undefined, limit: 50 }, studioId, { signal }),
    enabled: Boolean(studioId),
  });

  const clientOptions = useMemo(() => {
    const fetched = (clientsResponse?.data ?? []).map((c) => ({
      value: c.id,
      label: c.name,
    }));

    if (selectedClient && !fetched.some((opt) => opt.value === selectedClient.id)) {
      fetched.unshift({
        value: selectedClient.id,
        label: selectedClient.name,
      });
    }

    return fetched;
  }, [clientsResponse, selectedClient]);

  const showTypeOptions = useMemo(() => {
    return (lookups?.show_types ?? []).map((st) => ({
      value: st.id,
      label: st.name,
    }));
  }, [lookups?.show_types]);

  const platformOptions = useMemo(() => {
    return (lookups?.platforms ?? []).map((p) => ({
      value: p.id,
      label: p.name,
    }));
  }, [lookups?.platforms]);

  const showStandardOptions = useMemo(() => {
    return (lookups?.show_standards ?? []).map((s) => ({
      value: s.id,
      label: s.name,
    }));
  }, [lookups?.show_standards]);

  const selectedShowTypes = useMemo(() => {
    const ids = toArrayParam(search.show_type_id) ?? [];
    return (lookups?.show_types ?? []).filter((st) => ids.includes(st.id));
  }, [lookups?.show_types, search.show_type_id]);

  const selectedPlatforms = useMemo(() => {
    const ids = toArrayParam(search.platform_id) ?? [];
    return (lookups?.platforms ?? []).filter((p) => ids.includes(p.id));
  }, [lookups?.platforms, search.platform_id]);

  const selectedShowStandards = useMemo(() => {
    const ids = toArrayParam(search.show_standard_id) ?? [];
    return (lookups?.show_standards ?? []).filter((s) => ids.includes(s.id));
  }, [lookups?.show_standards, search.show_standard_id]);

  const handleFilterChange = useCallback(
    (key: 'client_id' | 'has_performance', value: string) => {
      updateSearch({
        [key]: value === 'all' ? undefined : (value || undefined),
        page: 1,
      });
    },
    [updateSearch],
  );

  const handleMultiFilterChange = useCallback(
    (key: 'show_type_id' | 'platform_id' | 'show_standard_id', value: string[]) => {
      updateSearch({
        [key]: value.length > 0 ? value : undefined,
        page: 1,
      });
    },
    [updateSearch],
  );

  const handleResetFilters = useCallback(() => {
    updateSearch({
      client_id: undefined,
      show_type_id: undefined,
      platform_id: undefined,
      show_standard_id: undefined,
      has_performance: undefined,
      page: 1,
    });
    setClientSearch('');
    setIsPopoverOpen(false);
    setIsSheetOpen(false);
  }, [updateSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.client_id)
      count++;
    if (toArrayParam(search.show_type_id)?.length)
      count++;
    if (toArrayParam(search.platform_id)?.length)
      count++;
    if (toArrayParam(search.show_standard_id)?.length)
      count++;
    if (search.has_performance && search.has_performance !== 'all')
      count++;
    return count;
  }, [search.client_id, search.show_type_id, search.platform_id, search.show_standard_id, search.has_performance]);

  // Parse current URL sort rules
  const sortRules = useMemo(() => {
    const sortStr = search.sort;
    if (!sortStr)
      return [];
    return sortStr.split(',').map((part) => {
      const [id, dir] = part.split(':');
      return { id, desc: dir === 'desc' };
    }).filter((r) => r.id);
  }, [search.sort]);

  const handleSort = useCallback((columnId: string) => {
    const nextRules = [...sortRules];
    const existingIndex = nextRules.findIndex((r) => r.id === columnId);

    if (existingIndex === -1) {
      // Not sorted: append to the end as ASC
      nextRules.push({ id: columnId, desc: false });
    } else {
      const existing = nextRules[existingIndex];
      if (!existing.desc) {
        // ASC -> Toggle to DESC (keep priority)
        nextRules[existingIndex] = { id: columnId, desc: true };
      } else {
        // DESC -> Remove from sort list
        nextRules.splice(existingIndex, 1);
      }
    }

    const sortStr = nextRules.map((r) => `${r.id}:${r.desc ? 'desc' : 'asc'}`).join(',') || undefined;
    updateSearch({ sort: sortStr, page: 1 });
  }, [sortRules, updateSearch]);

  const columns = usePerformanceShowsColumns({
    studioId,
    sortRules,
    onSort: handleSort,
    locale,
    currency,
  });

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    return search.name ? [{ id: 'name', value: search.name }] : [];
  }, [search.name]);

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    const nextFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
    const nameFilter = nextFilters.find((f) => f.id === 'name');
    const nextName = (nameFilter?.value as string | undefined)?.trim();
    updateSearch({
      name: nextName || undefined,
      page: 1,
    });
  };

  const applyPagination = (next: { pageIndex: number; pageSize: number }) => {
    const action = resolvePaginationAction({ page, limit }, next);
    if (action?.type === 'limit') {
      onLimitChange(action.limit);
    } else if (action?.type === 'page') {
      onPageChange(action.page);
    }
  };

  const handlePaginationChange = (
    updater: PaginationState | ((old: PaginationState) => PaginationState),
  ) => {
    const next = typeof updater === 'function'
      ? updater({ pageIndex: page - 1, pageSize: limit })
      : updater;
    applyPagination(next);
  };

  return (
    <div className="space-y-4">
      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No performance data found for the selected criteria."
        manualPagination
        manualFiltering
        pageCount={pageCount}
        paginationState={{
          pageIndex: page - 1,
          pageSize: limit,
        }}
        onPaginationChange={handlePaginationChange}
        columnFilters={columnFilters}
        onColumnFiltersChange={handleColumnFiltersChange}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="name"
            searchPlaceholder="Search shows..."
            searchableColumns={[]}
          >
            {/* Mobile Sheet (Drawer) */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 gap-2 border-dashed sm:hidden flex justify-center',
                    activeFilterCount > 0 && 'border-primary',
                  )}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[min(85dvh,42rem)] rounded-t-xl p-0">
                <SheetHeader className="border-b px-4 py-3 flex-row items-center justify-between space-y-0">
                  <div className="space-y-0.5">
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Filter performance data by clients, show types, and platforms.
                    </SheetDescription>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="h-7 px-2 text-xs text-muted-foreground mr-6"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reset
                    </Button>
                  )}
                </SheetHeader>
                <div className="overflow-y-auto overscroll-contain">
                  {isSheetOpen && (
                    <FilterFields
                      setClientSearch={setClientSearch}
                      clientOptions={clientOptions}
                      isLoadingClients={isLoadingClients}
                      search={search}
                      handleFilterChange={handleFilterChange}
                      selectedShowTypes={selectedShowTypes}
                      showTypeOptions={showTypeOptions}
                      handleMultiFilterChange={handleMultiFilterChange}
                      selectedPlatforms={selectedPlatforms}
                      platformOptions={platformOptions}
                      selectedShowStandards={selectedShowStandards}
                      showStandardOptions={showStandardOptions}
                    />
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Popover */}
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 gap-2 border-dashed hidden sm:inline-flex',
                    activeFilterCount > 0 && 'border-primary',
                  )}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-0 flex flex-col max-h-[min(calc(100vh-8rem),35rem)]">
                <div className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0">
                  <span className="font-medium text-sm">Filters</span>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="h-7 px-2 text-xs text-muted-foreground"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reset
                    </Button>
                  )}
                </div>
                {isPopoverOpen && (
                  <div className="overflow-y-auto flex-grow overscroll-contain">
                    <FilterFields
                      setClientSearch={setClientSearch}
                      clientOptions={clientOptions}
                      isLoadingClients={isLoadingClients}
                      search={search}
                      handleFilterChange={handleFilterChange}
                      selectedShowTypes={selectedShowTypes}
                      showTypeOptions={showTypeOptions}
                      handleMultiFilterChange={handleMultiFilterChange}
                      selectedPlatforms={selectedPlatforms}
                      platformOptions={platformOptions}
                      selectedShowStandards={selectedShowStandards}
                      showStandardOptions={showStandardOptions}
                    />
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh Dashboard"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </DataTableToolbar>
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={{
              pageIndex: page - 1,
              pageSize: limit,
              total,
              pageCount,
            }}
            onPaginationChange={applyPagination}
          />
        )}
      />
    </div>
  );
}
