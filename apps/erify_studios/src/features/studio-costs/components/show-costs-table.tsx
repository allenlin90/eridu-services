import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { ColumnDef, ColumnFiltersState, OnChangeFn, PaginationState } from '@tanstack/react-table';
import { AlertTriangle, ChevronDown, ChevronsUpDown, ChevronUp, Filter, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { ShowCostResponse } from '@eridu/api-types/costs';
import {
  AsyncCombobox,
  Badge,
  Button,
  DataTable,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { getClients } from '@/features/clients/api/get-clients';
import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { toCurrencyDisplayString } from '@/lib/decimal-format';

type CostsShowsSearch = {
  page: number;
  limit: number;
  date_from?: string;
  date_to?: string;
  client_id?: string;
  show_type_id?: string | string[];
  show_standard_id?: string | string[];
  name?: string;
  sort?: string;
};

type ShowCostsTableProps = {
  data: ShowCostResponse[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  studioId: string;
  search: CostsShowsSearch;
  updateSearch: (nextSearch: Partial<CostsShowsSearch>) => void;
  locale?: string;
  currency?: string;
};

function toArrayParam(val: string | string[] | undefined): string[] | undefined {
  if (!val)
    return undefined;
  return Array.isArray(val) ? val : [val];
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

export function ShowCostsTable({
  data,
  total,
  page,
  limit,
  isLoading,
  isFetching,
  onPageChange,
  onLimitChange,
  studioId,
  search,
  updateSearch,
  locale,
  currency,
}: ShowCostsTableProps) {
  const pageCount = Math.ceil(total / limit);
  const [clientSearch, setClientSearch] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const resolvedLocale = locale ?? 'th-TH';
  const resolvedCurrency = currency ?? 'THB';

  const { data: lookups } = useShowLookupsQuery(studioId);

  const selectedClient = useMemo(() => {
    return (lookups?.clients ?? []).find((c) => c.id === search.client_id);
  }, [lookups?.clients, search.client_id]);

  const { data: clientsResponse, isLoading: isLoadingClients } = useQuery({
    queryKey: ['costs-shows-clients', studioId, clientSearch],
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

  const selectedShowStandards = useMemo(() => {
    const ids = toArrayParam(search.show_standard_id) ?? [];
    return (lookups?.show_standards ?? []).filter((s) => ids.includes(s.id));
  }, [lookups?.show_standards, search.show_standard_id]);

  const handleFilterChange = useCallback(
    (key: 'client_id', value: string) => {
      updateSearch({
        [key]: value || undefined,
        page: 1,
      });
    },
    [updateSearch],
  );

  const handleMultiFilterChange = useCallback(
    (key: 'show_type_id' | 'show_standard_id', value: string[]) => {
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
      show_standard_id: undefined,
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
    if (toArrayParam(search.show_standard_id)?.length)
      count++;
    return count;
  }, [search.client_id, search.show_type_id, search.show_standard_id]);

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
      nextRules.push({ id: columnId, desc: false });
    } else {
      const existing = nextRules[existingIndex];
      if (!existing.desc) {
        nextRules[existingIndex] = { id: columnId, desc: true };
      } else {
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

  const formatCurrency = useCallback((val: string | null | undefined) => {
    if (val === null || val === undefined)
      return '—';
    try {
      return toCurrencyDisplayString(val, resolvedLocale, resolvedCurrency);
    } catch {
      const fallbackSymbol = resolvedCurrency === 'THB' ? '฿' : '$';
      return `${fallbackSymbol}${val}`;
    }
  }, [resolvedCurrency, resolvedLocale]);

  const formatDateTime = (val: string) => {
    try {
      return format(parseISO(val), 'MMM d, yyyy HH:mm');
    } catch {
      return val;
    }
  };

  const columns = useMemo<ColumnDef<ShowCostResponse>[]>(
    () => [
      {
        accessorKey: 'name',
        header: () => <SortableHeader columnId="name" label="Show" sortRules={sortRules} onSort={handleSort} />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 max-w-[200px]">
            <Link
              to="/studios/$studioId/shows/$showId"
              params={{ studioId, showId: row.original.id }}
              className="font-semibold text-primary hover:underline truncate"
            >
              {row.original.name}
            </Link>
            {row.original.show_type_name && (
              <span className="text-xs text-muted-foreground">{row.original.show_type_name}</span>
            )}
            {row.original.show_standard_name && (
              <span className="text-[10px] text-muted-foreground/80">{row.original.show_standard_name}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'client_name',
        header: 'Client',
        cell: ({ row }) => <span className="text-sm">{row.original.client_name ?? '—'}</span>,
      },
      {
        accessorKey: 'start_time',
        header: () => <SortableHeader columnId="start_time" label="Schedule" sortRules={sortRules} onSort={handleSort} />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground whitespace-nowrap">
            <span>{formatDateTime(row.original.start_time)}</span>
            <span>
              to
              {formatDateTime(row.original.end_time).split(' ').slice(-1)[0]}
            </span>
          </div>
        ),
      },
      {
        id: 'creators',
        header: 'Creator Breakdown',
        cell: ({ row }) => {
          if (row.original.creators.length === 0) {
            return <span className="text-muted-foreground text-xs">—</span>;
          }
          return (
            <div className="flex flex-col gap-1.5 py-1 min-w-[220px]">
              {row.original.creators.map((c) => (
                <div key={c.show_creator_uid} className="text-[11px] border border-muted/50 rounded-md p-1.5 bg-muted/10 space-y-0.5">
                  <div className="font-semibold flex items-center justify-between text-foreground">
                    <span>{c.creator_name}</span>
                    {c.creator_alias_name && (
                      <span className="text-[9px] text-muted-foreground font-normal">
                        @
                        {c.creator_alias_name}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground flex justify-between">
                    <span>
                      Rate:
                      {c.agreed_rate ? formatCurrency(c.agreed_rate) : '—'}
                    </span>
                    {Number.parseFloat(c.adjustment_total || '0') !== 0 && (
                      <span className="text-[10px]">
                        Adj:
                        {formatCurrency(c.adjustment_total)}
                      </span>
                    )}
                  </div>
                  {c.unresolved_reason
                    ? (
                        <Badge variant="destructive" className="text-[9px] py-0 px-1 font-normal bg-rose-500/10 text-rose-500 border-none mt-0.5">
                          {c.unresolved_reason}
                        </Badge>
                      )
                    : (
                        <div className="font-medium text-emerald-600 dark:text-emerald-500 flex justify-between mt-0.5">
                          <span>Payout:</span>
                          <span>{formatCurrency(c.total_amount)}</span>
                        </div>
                      )}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'line_item_subtotal',
        header: 'Line Items',
        cell: ({ row }) => <span className="text-sm font-medium">{formatCurrency(row.original.line_item_subtotal)}</span>,
      },
      {
        accessorKey: 'total_cost',
        header: () => <SortableHeader columnId="total_cost" label="Total Payout" sortRules={sortRules} onSort={handleSort} />,
        cell: ({ row }) => {
          const isUnresolved = row.original.total_cost === null;
          return (
            <div className="flex flex-col gap-1 items-start">
              {isUnresolved
                ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 gap-1 text-[11px] font-semibold cursor-pointer">
                            <AlertTriangle className="h-3 w-3" />
                            Unresolved
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs space-y-1">
                          <p className="font-semibold">Unresolved billing issues:</p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {row.original.unresolved_reasons.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                : (
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(row.original.total_cost)}
                    </span>
                  )}
              {row.original.calculation_warnings.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[10px] text-amber-600 dark:text-amber-500 flex items-center gap-1 cursor-pointer hover:underline">
                        <AlertTriangle className="h-3 w-3" />
                        Warnings
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs space-y-1">
                      <p className="font-semibold">Calculation warning(s):</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {row.original.calculation_warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
    ],
    [studioId, sortRules, handleSort, formatCurrency],
  );

  const handlePaginationChange = (
    updater: PaginationState | ((old: PaginationState) => PaginationState),
  ) => {
    const next = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize: limit }) : updater;
    if (next.pageSize !== limit) {
      onLimitChange(next.pageSize);
    } else if (next.pageIndex + 1 !== page) {
      onPageChange(next.pageIndex + 1);
    }
  };

  return (
    <div className="space-y-4">
      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No show costs data found for the selected criteria."
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
            {/* Mobile Sheet */}
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
                      Filter show cost details by client, type, or standard.
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
                <div className="p-4 space-y-4 overflow-y-auto overscroll-contain">
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
                  <div className="space-y-1.5">
                    <Label>Show Types</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-10 px-3 font-normal">
                          <span className="truncate">
                            {selectedShowTypes.length > 0 ? selectedShowTypes.map((st) => st.name).join(', ') : 'Any Show Type'}
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
                                const next = isSelected ? current.filter((val) => val !== opt.value) : [...current, opt.value];
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
                  <div className="space-y-1.5">
                    <Label>Show Standards</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-10 px-3 font-normal">
                          <span className="truncate">
                            {selectedShowStandards.length > 0 ? selectedShowStandards.map((s) => s.name).join(', ') : 'Any Show Standard'}
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
                                const next = isSelected ? current.filter((val) => val !== opt.value) : [...current, opt.value];
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
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="font-semibold text-sm">Filters</span>
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
                <div className="p-4 space-y-4">
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
                  <div className="space-y-1.5">
                    <Label>Show Types</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-10 px-3 font-normal">
                          <span className="truncate flex-1 text-left">
                            {selectedShowTypes.length > 0 ? selectedShowTypes.map((st) => st.name).join(', ') : 'Any Show Type'}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[268px] max-h-[300px] overflow-y-auto" align="start">
                        {showTypeOptions.map((opt) => {
                          const isSelected = toArrayParam(search.show_type_id)?.includes(opt.value) ?? false;
                          return (
                            <DropdownMenuCheckboxItem
                              key={opt.value}
                              checked={isSelected}
                              onCheckedChange={() => {
                                const current = toArrayParam(search.show_type_id) ?? [];
                                const next = isSelected ? current.filter((val) => val !== opt.value) : [...current, opt.value];
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
                  <div className="space-y-1.5">
                    <Label>Show Standards</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-10 px-3 font-normal">
                          <span className="truncate flex-1 text-left">
                            {selectedShowStandards.length > 0 ? selectedShowStandards.map((s) => s.name).join(', ') : 'Any Show Standard'}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[268px] max-h-[300px] overflow-y-auto" align="start">
                        {showStandardOptions.map((opt) => {
                          const isSelected = toArrayParam(search.show_standard_id)?.includes(opt.value) ?? false;
                          return (
                            <DropdownMenuCheckboxItem
                              key={opt.value}
                              checked={isSelected}
                              onCheckedChange={() => {
                                const current = toArrayParam(search.show_standard_id) ?? [];
                                const next = isSelected ? current.filter((val) => val !== opt.value) : [...current, opt.value];
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
                </div>
              </PopoverContent>
            </Popover>
          </DataTableToolbar>
        )}
      />
    </div>
  );
}
