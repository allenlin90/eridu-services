import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { ColumnDef, ColumnFiltersState, OnChangeFn, PaginationState } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, ChevronUp, Filter, RefreshCw, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { ShowPerformanceResponse } from '@eridu/api-types/performance';
import {
  AsyncCombobox,
  Badge,
  Button,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Label,
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

import { DateCell } from '@/features/admin/components/show-table-cells';
import { getClients } from '@/features/clients/api/get-clients';
import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { toCurrencyDisplayString, toDecimalDisplayString } from '@/lib/decimal-format';

type PerformanceSearch = {
  page: number;
  limit: number;
  date_from?: string;
  date_to?: string;
  client_id?: string;
  show_type_id?: string | string[];
  platform_id?: string | string[];
  show_standard_id?: string | string[];
  name?: string;
  has_performance?: string;
  sort?: string;
};

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

function toArrayParam(val: string | string[] | undefined): string[] | undefined {
  if (!val)
    return undefined;
  return Array.isArray(val) ? val : [val];
}

type FilterFieldsProps = {
  setClientSearch: (val: string) => void;
  clientOptions: Array<{ value: string; label: string }>;
  isLoadingClients: boolean;
  search: PerformanceSearch;
  handleFilterChange: (key: 'client_id' | 'has_performance', value: string) => void;
  selectedShowTypes: Array<{ id: string; name: string }>;
  showTypeOptions: Array<{ value: string; label: string }>;
  handleMultiFilterChange: (key: 'show_type_id' | 'platform_id' | 'show_standard_id', value: string[]) => void;
  selectedPlatforms: Array<{ id: string; name: string }>;
  platformOptions: Array<{ value: string; label: string }>;
  selectedShowStandards: Array<{ id: string; name: string }>;
  showStandardOptions: Array<{ value: string; label: string }>;
};

function FilterFields({
  setClientSearch,
  clientOptions,
  isLoadingClients,
  search,
  handleFilterChange,
  selectedShowTypes,
  showTypeOptions,
  handleMultiFilterChange,
  selectedPlatforms,
  platformOptions,
  selectedShowStandards,
  showStandardOptions,
}: FilterFieldsProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Client Combobox */}
      <div className="space-y-1.5">
        <Label>Client</Label>
        <AsyncCombobox
          value={search.client_id ?? ''}
          onChange={(val) => handleFilterChange('client_id', val)}
          onSearch={setClientSearch}
          options={clientOptions}
          isLoading={isLoadingClients}
          placeholder="Search Client..."
        />
      </div>

      {/* Show Types Dropdown */}
      <div className="space-y-1.5">
        <Label>Show Types</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 px-3 font-normal"
            >
              <span className="truncate">
                {selectedShowTypes.length > 0
                  ? selectedShowTypes.map((st) => st.name).join(', ')
                  : 'Any Show Type'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px] max-h-[300px] overflow-y-auto" align="start">
            {showTypeOptions.map((opt) => {
              const isSelected = toArrayParam(search.show_type_id)?.includes(opt.value) ?? false;
              return (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={isSelected}
                  onCheckedChange={() => {
                    const current = toArrayParam(search.show_type_id) ?? [];
                    const next = isSelected
                      ? current.filter((val) => val !== opt.value)
                      : [...current, opt.value];
                    handleMultiFilterChange('show_type_id', next);
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Platforms Dropdown */}
      <div className="space-y-1.5">
        <Label>Platforms</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 px-3 font-normal"
            >
              <span className="truncate">
                {selectedPlatforms.length > 0
                  ? selectedPlatforms.map((p) => p.name).join(', ')
                  : 'Any Platform'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px] max-h-[300px] overflow-y-auto" align="start">
            {platformOptions.map((opt) => {
              const isSelected = toArrayParam(search.platform_id)?.includes(opt.value) ?? false;
              return (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={isSelected}
                  onCheckedChange={() => {
                    const current = toArrayParam(search.platform_id) ?? [];
                    const next = isSelected
                      ? current.filter((val) => val !== opt.value)
                      : [...current, opt.value];
                    handleMultiFilterChange('platform_id', next);
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Show Standards Dropdown */}
      <div className="space-y-1.5">
        <Label>Show Standards</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 px-3 font-normal"
            >
              <span className="truncate">
                {selectedShowStandards.length > 0
                  ? selectedShowStandards.map((s) => s.name).join(', ')
                  : 'Any Show Standard'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px] max-h-[300px] overflow-y-auto" align="start">
            {showStandardOptions.map((opt) => {
              const isSelected = toArrayParam(search.show_standard_id)?.includes(opt.value) ?? false;
              return (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={isSelected}
                  onCheckedChange={() => {
                    const current = toArrayParam(search.show_standard_id) ?? [];
                    const next = isSelected
                      ? current.filter((val) => val !== opt.value)
                      : [...current, opt.value];
                    handleMultiFilterChange('show_standard_id', next);
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Record Presence Dropdown */}
      <div className="space-y-1.5">
        <Label>Performance Record Presence</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 px-3 font-normal"
            >
              <span className="truncate">
                {search.has_performance === 'true'
                  ? 'With Performance Records'
                  : search.has_performance === 'false'
                    ? 'Without Performance Records'
                    : 'All Shows'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px]" align="start">
            <DropdownMenuCheckboxItem
              checked={!search.has_performance || search.has_performance === 'all'}
              onCheckedChange={() => handleFilterChange('has_performance', 'all')}
              onSelect={(e) => e.preventDefault()}
            >
              All Shows
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={search.has_performance === 'true'}
              onCheckedChange={() => handleFilterChange('has_performance', 'true')}
              onSelect={(e) => e.preventDefault()}
            >
              With Performance Records
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={search.has_performance === 'false'}
              onCheckedChange={() => handleFilterChange('has_performance', 'false')}
              onSelect={(e) => e.preventDefault()}
            >
              Without Performance Records
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

type SortRule = { id: string; desc: boolean };

type SortableHeaderProps = {
  columnId: string;
  label: string;
  sortRules: SortRule[];
  onSort: (columnId: string) => void;
};

function SortableHeader({ columnId, label, sortRules, onSort }: SortableHeaderProps) {
  const ruleIndex = sortRules.findIndex((r) => r.id === columnId);
  const isSorted = ruleIndex !== -1;
  const rule = isSorted ? sortRules[ruleIndex] : null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 gap-1 font-medium hover:bg-muted/50 text-xs"
      onClick={() => onSort(columnId)}
    >
      <span>{label}</span>
      {isSorted
        ? (
            <div className="flex items-center gap-1">
              {rule?.desc
                ? (
                    <ChevronDown className="h-3.5 w-3.5 text-primary" />
                  )
                : (
                    <ChevronUp className="h-3.5 w-3.5 text-primary" />
                  )}
              <Badge
                variant="secondary"
                className="h-4 min-w-4 p-0 px-1 text-[10px] flex items-center justify-center font-bold bg-primary/10 text-primary border-none"
              >
                {ruleIndex + 1}
              </Badge>
            </div>
          )
        : (
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
    </Button>
  );
}

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
  const resolvedLocale = locale ?? 'th-TH';
  const resolvedCurrency = currency ?? 'THB';

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

  const formatPercentage = useCallback((val: string | null) => {
    if (val === null)
      return '—';
    try {
      return `${toDecimalDisplayString(val)}%`;
    } catch {
      return `${val}%`;
    }
  }, []);

  const formatCurrency = useCallback((val: string | null) => {
    if (val === null)
      return '—';
    try {
      return toCurrencyDisplayString(val, resolvedLocale, resolvedCurrency);
    } catch {
      const fallbackSymbol = resolvedCurrency === 'THB' ? '฿' : '$';
      return `${fallbackSymbol}${val}`;
    }
  }, [resolvedCurrency, resolvedLocale]);

  const formatNumber = useCallback((val: number | null) => {
    if (val === null)
      return '—';
    return new Intl.NumberFormat().format(val);
  }, []);

  const columns = useMemo<ColumnDef<ShowPerformanceResponse>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Show Name',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <Link
              to="/studios/$studioId/shows/$showId"
              params={{ studioId, showId: row.original.id }}
              className="font-semibold text-primary hover:underline"
            >
              {row.original.name}
            </Link>
            {row.original.show_type_name && (
              <span className="text-xs text-muted-foreground">{row.original.show_type_name}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'client_name',
        header: 'Client',
        cell: ({ row }) => <span>{row.original.client_name ?? '—'}</span>,
      },
      {
        id: 'platforms',
        header: 'Platform',
        cell: ({ row }) => {
          const platforms = row.original.platforms;
          if (platforms.length === 0)
            return <span className="text-muted-foreground text-xs">No platforms</span>;
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {platforms.map((p) => (
                <div key={p.show_platform_uid} className="text-xs font-medium text-foreground h-5 flex items-center">
                  {p.platform_name}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: 'gmv',
        header: () => <SortableHeader columnId="gmv" label="GMV" sortRules={sortRules} onSort={handleSort} />,
        cell: ({ row }) => {
          const platforms = row.original.platforms;
          if (platforms.length === 0)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {platforms.map((p) => (
                <div key={p.show_platform_uid} className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 h-5 flex items-center">
                  {formatCurrency(p.gmv)}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: 'views',
        header: () => <SortableHeader columnId="views" label="Views" sortRules={sortRules} onSort={handleSort} />,
        cell: ({ row }) => {
          const platforms = row.original.platforms;
          if (platforms.length === 0)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {platforms.map((p) => (
                <div key={p.show_platform_uid} className="text-xs text-foreground h-5 flex items-center">
                  {formatNumber(p.views)}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: 'ctr',
        header: () => <SortableHeader columnId="ctr" label="CTR" sortRules={sortRules} onSort={handleSort} />,
        cell: ({ row }) => {
          const platforms = row.original.platforms;
          if (platforms.length === 0)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {platforms.map((p) => (
                <div key={p.show_platform_uid} className="text-xs text-amber-600 dark:text-amber-500 h-5 flex items-center">
                  {formatPercentage(p.ctr)}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: 'cto',
        header: () => <SortableHeader columnId="cto" label="CTO" sortRules={sortRules} onSort={handleSort} />,
        cell: ({ row }) => {
          const platforms = row.original.platforms;
          if (platforms.length === 0)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {platforms.map((p) => (
                <div key={p.show_platform_uid} className="text-xs text-violet-600 dark:text-violet-500 h-5 flex items-center">
                  {formatPercentage(p.cto)}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'start_time',
        header: () => <SortableHeader columnId="start_time" label="Start Time" sortRules={sortRules} onSort={handleSort} />,
        cell: ({ row }) => <DateCell date={row.original.start_time} />,
      },
    ],
    [formatCurrency, formatNumber, formatPercentage, studioId, sortRules, handleSort],
  );

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
