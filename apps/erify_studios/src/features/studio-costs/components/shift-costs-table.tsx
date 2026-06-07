import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, ChevronDown, ChevronsUpDown, ChevronUp, Filter, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { ShiftCostResponse } from '@eridu/api-types/costs';
import {
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

import { toCurrencyDisplayString } from '@/lib/decimal-format';

type CostsShiftsSearch = {
  page: number;
  limit: number;
  date_from?: string;
  date_to?: string;
  role?: string;
  status?: string;
  sort?: string;
};

type ShiftCostsTableProps = {
  data: ShiftCostResponse[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  search: CostsShiftsSearch;
  updateSearch: (nextSearch: Partial<CostsShiftsSearch>) => void;
  locale?: string;
  currency?: string;
};

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

export function ShiftCostsTable({
  data,
  total,
  page,
  limit,
  isLoading,
  isFetching,
  onPageChange,
  onLimitChange,
  search,
  updateSearch,
  locale,
  currency,
}: ShiftCostsTableProps) {
  const pageCount = Math.ceil(total / limit);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const resolvedLocale = locale ?? 'th-TH';
  const resolvedCurrency = currency ?? 'THB';

  const roleOptions = [
    { value: 'OPERATOR', label: 'Operator' },
    { value: 'DUTY_MANAGER', label: 'Duty Manager' },
    { value: 'MANAGER', label: 'Manager' },
  ];

  const statusOptions = [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const handleFilterChange = useCallback(
    (key: 'role' | 'status', value: string) => {
      updateSearch({
        [key]: value || undefined,
        page: 1,
      });
    },
    [updateSearch],
  );

  const handleResetFilters = useCallback(() => {
    updateSearch({
      role: undefined,
      status: undefined,
      page: 1,
    });
    setIsPopoverOpen(false);
    setIsSheetOpen(false);
  }, [updateSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.role)
      count++;
    if (search.status)
      count++;
    return count;
  }, [search.role, search.status]);

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

  const formatShiftDate = (val: string) => {
    try {
      return format(parseISO(val), 'EEEE, MMM d, yyyy');
    } catch {
      return val;
    }
  };

  const formatTime = (val: string) => {
    try {
      return format(parseISO(val), 'HH:mm');
    } catch {
      return val;
    }
  };

  const columns = useMemo<ColumnDef<ShiftCostResponse>[]>(
    () => [
      {
        accessorKey: 'date',
        header: () => <SortableHeader columnId="date" label="Shift Date" sortRules={sortRules} onSort={handleSort} />,
        cell: ({ row }) => <span className="font-semibold text-sm whitespace-nowrap">{formatShiftDate(row.original.date)}</span>,
      },
      {
        accessorKey: 'member_name',
        header: 'Operator',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 max-w-[180px]">
            <span className="font-semibold text-foreground truncate">{row.original.member_name}</span>
            <span className="text-xs text-muted-foreground">{row.original.member_role}</span>
          </div>
        ),
      },
      {
        accessorKey: 'hourly_rate',
        header: 'Hourly Rate',
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {formatCurrency(row.original.hourly_rate)}
            /hr
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px] px-1.5 py-0.5 border-none font-semibold uppercase',
                status === 'COMPLETED' && 'bg-emerald-500/10 text-emerald-500',
                status === 'SCHEDULED' && 'bg-blue-500/10 text-blue-500',
                status === 'CANCELLED' && 'bg-rose-500/10 text-rose-500',
              )}
            >
              {status}
            </Badge>
          );
        },
      },
      {
        id: 'blocks',
        header: 'Blocks Breakdown',
        cell: ({ row }) => {
          if (row.original.blocks.length === 0) {
            return <span className="text-muted-foreground text-xs">—</span>;
          }
          return (
            <div className="flex flex-col gap-1.5 py-1 min-w-[240px]">
              {row.original.blocks.map((b) => (
                <div key={b.block_uid} className="text-[11px] border border-muted/50 rounded-md p-1.5 bg-muted/10 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>Block Duration</span>
                    <span>
                      {b.duration_hours}
                      {' '}
                      hrs
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[10px] space-y-0.5">
                    <div>
                      Planned:
                      {formatTime(b.start_time)}
                      {' '}
                      -
                      {formatTime(b.end_time)}
                    </div>
                    {b.actual_start_time && (
                      <div className="text-primary-600 font-medium">
                        Actual:
                        {formatTime(b.actual_start_time)}
                        {' '}
                        -
                        {formatTime(b.actual_end_time!)}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground border-t pt-1 mt-1">
                    <span>
                      Line Items:
                      {formatCurrency(b.line_item_subtotal)}
                    </span>
                    <span className="font-semibold text-foreground">{formatCurrency(b.total_cost)}</span>
                  </div>
                  {b.calculation_warnings.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-[9px] text-amber-500 flex items-center gap-1 cursor-pointer hover:underline mt-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            Warning
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs space-y-1">
                          <p className="font-semibold">Block Warning(s):</p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {b.calculation_warnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
        header: () => <SortableHeader columnId="total_cost" label="Total Labor Cost" sortRules={sortRules} onSort={handleSort} />,
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
    [sortRules, handleSort, formatCurrency],
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
        emptyMessage="No shift labor costs data found for the selected criteria."
        manualPagination
        manualFiltering
        pageCount={pageCount}
        paginationState={{
          pageIndex: page - 1,
          pageSize: limit,
        }}
        onPaginationChange={handlePaginationChange}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="member_name"
            searchPlaceholder="Search operator..."
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
                      Filter shift labor details by role or status.
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
                    <Label>Member Role</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-10 px-3 font-normal">
                          <span className="truncate">
                            {search.role ? roleOptions.find((r) => r.value === search.role)?.label : 'Any Role'}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[280px]" align="start">
                        {roleOptions.map((opt) => (
                          <DropdownMenuCheckboxItem
                            key={opt.value}
                            checked={search.role === opt.value}
                            onCheckedChange={() => handleFilterChange('role', search.role === opt.value ? '' : opt.value)}
                          >
                            {opt.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Shift Status</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-10 px-3 font-normal">
                          <span className="truncate">
                            {search.status ? statusOptions.find((s) => s.value === search.status)?.label : 'Any Status'}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[280px]" align="start">
                        {statusOptions.map((opt) => (
                          <DropdownMenuCheckboxItem
                            key={opt.value}
                            checked={search.status === opt.value}
                            onCheckedChange={() => handleFilterChange('status', search.status === opt.value ? '' : opt.value)}
                          >
                            {opt.label}
                          </DropdownMenuCheckboxItem>
                        ))}
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
                    <Label>Member Role</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-10 px-3 font-normal">
                          <span className="truncate flex-1 text-left">
                            {search.role ? roleOptions.find((r) => r.value === search.role)?.label : 'Any Role'}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[268px]" align="start">
                        {roleOptions.map((opt) => (
                          <DropdownMenuCheckboxItem
                            key={opt.value}
                            checked={search.role === opt.value}
                            onCheckedChange={() => handleFilterChange('role', search.role === opt.value ? '' : opt.value)}
                          >
                            {opt.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Shift Status</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-10 px-3 font-normal">
                          <span className="truncate flex-1 text-left">
                            {search.status ? statusOptions.find((s) => s.value === search.status)?.label : 'Any Status'}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[268px]" align="start">
                        {statusOptions.map((opt) => (
                          <DropdownMenuCheckboxItem
                            key={opt.value}
                            checked={search.status === opt.value}
                            onCheckedChange={() => handleFilterChange('status', search.status === opt.value ? '' : opt.value)}
                          >
                            {opt.label}
                          </DropdownMenuCheckboxItem>
                        ))}
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
