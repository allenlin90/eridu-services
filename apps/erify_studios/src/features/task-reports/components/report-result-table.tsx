import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { TaskReportResult } from '@eridu/api-types/task-management';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@eridu/ui';
import { useIsMobile } from '@eridu/ui/hooks/use-mobile';
import { cn } from '@eridu/ui/lib/utils';

import { filterRows, type TaskReportViewFilters } from '../lib/filter-rows';
import { serializeCsv } from '../lib/serialize-csv';
import { type SortDirection, sortRows } from '../lib/sort-rows';

import { ReportViewFilters } from './report-view-filters';

type ReportResultTableProps = {
  result: TaskReportResult;
};

const FROZEN_COLUMN_PRIORITY = ['show_name', 'client_name', 'start_time'] as const;
const FROZEN_COLUMN_WIDTH: Record<(typeof FROZEN_COLUMN_PRIORITY)[number], number> = {
  show_name: 260,
  client_name: 220,
  start_time: 180,
};

function readStringFilterValues(...values: unknown[]): string[] {
  const result: string[] = [];

  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      result.push(value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.length > 0) {
          result.push(item);
        }
      }
    }
  }

  return result;
}

export function ReportResultTable({ result }: ReportResultTableProps) {
  const { columns, rows } = result;
  const isMobile = useIsMobile();

  const [filters, setFilters] = useState<TaskReportViewFilters>({});
  const [sortConfig, setSortConfig] = useState<{ column: string | null; dir: SortDirection }>({ column: 'start_time', dir: 'desc' });

  const parentRef = useRef<HTMLDivElement>(null);
  const canFilterByClient = useMemo(
    () => rows.some((row) => readStringFilterValues(row.client_name, row.client_id).length > 0),
    [rows],
  );
  const canFilterByStatus = useMemo(
    () => rows.some((row) => readStringFilterValues(row.show_status_name, row.show_status_id).length > 0),
    [rows],
  );
  const canFilterByRoom = useMemo(
    () => rows.some((row) => readStringFilterValues(row.studio_room_name, row.studio_room_id).length > 0),
    [rows],
  );
  const canFilterByAssignee = useMemo(
    () => rows.some((row) => readStringFilterValues(
      row.assignee_name,
      row.assignee,
      row.assignee_id,
      row.assignee_names,
      row.assignee_ids,
    ).length > 0),
    [rows],
  );

  const availableClients = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => readStringFilterValues(row.client_name, row.client_id)))),
    [rows],
  );
  const availableStatuses = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => readStringFilterValues(row.show_status_name, row.show_status_id)))),
    [rows],
  );
  const availableRooms = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => readStringFilterValues(row.studio_room_name, row.studio_room_id)))),
    [rows],
  );
  const availableAssignees = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => readStringFilterValues(
      row.assignee_name,
      row.assignee,
      row.assignee_id,
      row.assignee_names,
      row.assignee_ids,
    )))),
    [rows],
  );

  const filteredRows = useMemo(() => filterRows(rows, columns, filters), [rows, columns, filters]);
  const sortedAllRows = useMemo(() => sortRows(rows, sortConfig.column, sortConfig.dir), [rows, sortConfig]);
  const sortedRows = useMemo(() => sortRows(filteredRows, sortConfig.column, sortConfig.dir), [filteredRows, sortConfig]);
  const hasActiveFilters = Object.values(filters).some((value) => Boolean(value));

  useEffect(() => {
    setFilters((prev) => {
      let changed = false;
      const next: TaskReportViewFilters = { ...prev };

      if ((!canFilterByClient || availableClients.length === 0) && next.client_id) {
        delete next.client_id;
        changed = true;
      }
      if ((!canFilterByStatus || availableStatuses.length === 0) && next.show_status_id) {
        delete next.show_status_id;
        changed = true;
      }
      if ((!canFilterByRoom || availableRooms.length === 0) && next.studio_room_id) {
        delete next.studio_room_id;
        changed = true;
      }
      if ((!canFilterByAssignee || availableAssignees.length === 0) && next.assignee) {
        delete next.assignee;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [
    availableClients.length,
    availableAssignees.length,
    availableRooms.length,
    availableStatuses.length,
    canFilterByAssignee,
    canFilterByClient,
    canFilterByRoom,
    canFilterByStatus,
  ]);

  const downloadCsv = (exportRows: Record<string, unknown>[]) => {
    if (!exportRows.length || !columns.length)
      return;

    const csvContent = serializeCsv(exportRows, columns);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `task-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.column === key) {
        return { column: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { column: key, dir: 'desc' };
    });
  };

  const frozenColumnOffsets = useMemo(() => {
    if (isMobile) {
      return new Map<string, number>();
    }

    const activeColumnKeys = new Set(columns.map((column) => column.key));
    const offsets = new Map<string, number>();

    // Freeze only one leading context column on desktop to avoid multi-sticky stacking.
    for (const key of FROZEN_COLUMN_PRIORITY) {
      if (!activeColumnKeys.has(key)) {
        continue;
      }

      offsets.set(key, 0);
      break;
    }

    return offsets;
  }, [columns, isMobile]);

  const getFrozenOffset = (key: string) => frozenColumnOffsets.get(key);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45, // Estimated row height
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start ?? 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
    : 0;

  const renderCellValue = (value: unknown, type: string | undefined) => {
    if (value === null || value === undefined)
      return <span className="text-muted-foreground">-</span>;
    if ((type === 'url' || type === 'file') && typeof value === 'string' && /^https?:\/\//i.test(value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1 break-all text-primary underline underline-offset-2"
        >
          <span>{value}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      );
    }
    if (type === 'date' && typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return format(parsed, 'PP');
      }
    }
    if (type === 'datetime' && typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return format(parsed, 'PPp');
      }
    }
    if (typeof value === 'boolean')
      return value ? 'Yes' : 'No';
    if (Array.isArray(value))
      return value.join(', ');
    if (typeof value === 'object')
      return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => downloadCsv(sortedAllRows)} variant="outline" size="sm" disabled={sortedAllRows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium">
              Generated
              {' '}
              {format(new Date(result.generated_at), 'PPp')}
            </div>
            <div className="text-sm text-muted-foreground">
              {sortedRows.length}
              {' visible · '}
              {rows.length}
              {' total rows · '}
              {columns.length}
              {' columns'}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              Sort:
              {' '}
              {sortConfig.column ?? 'none'}
              {' '}
              {sortConfig.column ? `(${sortConfig.dir})` : ''}
            </Badge>
            <Badge variant={result.warnings.length > 0 ? 'secondary' : 'outline'}>
              {result.warnings.length}
              {' '}
              warning
              {result.warnings.length === 1 ? '' : 's'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {result.warnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-amber-950">Report Warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-950">
            {result.warnings.slice(0, 3).map((warning) => (
              <div
                key={`${warning.code}-${warning.show_id ?? 'global'}-${warning.column_key ?? 'column'}-${warning.message}`}
                className="rounded-md border border-amber-200 bg-white/70 px-3 py-2"
              >
                {warning.message}
              </div>
            ))}
            {result.warnings.length > 3 && (
              <div className="text-xs text-amber-900/80">
                {result.warnings.length - 3}
                {' '}
                more warning
                {result.warnings.length - 3 === 1 ? '' : 's'}
                {' '}
                are attached to this result set.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ReportViewFilters
        filters={filters}
        onChange={setFilters}
        availableClients={availableClients}
        availableRooms={availableRooms}
        availableStatuses={availableStatuses}
        availableAssignees={availableAssignees}
        showAssigneeFilter={canFilterByAssignee}
        showClientFilter={canFilterByClient}
        showRoomFilter={canFilterByRoom}
        showStatusFilter={canFilterByStatus}
        onClear={() => setFilters({})}
      />
      <Card>
        <CardHeader className="border-b px-4 py-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Report Results</span>
            <span className="text-xs font-normal text-muted-foreground">
              {hasActiveFilters ? 'Filtered view' : 'All generated rows'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={parentRef} className="relative max-h-[calc(100vh-16rem)] overflow-auto">
            <Table className="whitespace-nowrap">
              <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
                <TableRow>
                  {columns.map((col) => {
                    const leftOffset = getFrozenOffset(col.key);
                    const shouldFreeze = !isMobile && leftOffset !== undefined;
                    const frozenClasses = shouldFreeze ? 'sticky z-30 bg-muted/95 backdrop-blur border-r' : 'bg-muted/95 backdrop-blur z-20';
                    const sorting = sortConfig.column === col.key;
                    return (
                      <TableHead
                        key={col.key}
                        className={cn('group font-semibold cursor-pointer select-none whitespace-nowrap hover:bg-muted transition-colors', frozenClasses)}
                        onClick={() => handleSort(col.key)}
                        style={shouldFreeze ? { left: leftOffset, minWidth: FROZEN_COLUMN_WIDTH[col.key as keyof typeof FROZEN_COLUMN_WIDTH] } : undefined}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sorting && sortConfig.dir === 'asc' && <ArrowUp className="w-3 h-3 text-primary" />}
                          {sorting && sortConfig.dir === 'desc' && <ArrowDown className="w-3 h-3 text-primary" />}
                          {!sorting && <ArrowUpDown className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100" />}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      No data found matching this view filter.
                    </TableCell>
                  </TableRow>
                )}
                {sortedRows.length > 0 && paddingTop > 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} style={{ height: `${paddingTop}px`, padding: 0, border: 0 }} />
                  </TableRow>
                )}
                {sortedRows.length > 0 && virtualItems.map((virtualRow) => {
                  const row = sortedRows[virtualRow.index];
                  return (
                    <TableRow key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} className="hover:bg-muted/30">
                      {columns.map((col) => {
                        const leftOffset = getFrozenOffset(col.key);
                        const shouldFreeze = !isMobile && leftOffset !== undefined;
                        const frozenClasses = shouldFreeze ? 'sticky z-10 bg-background border-r drop-shadow-[1px_0_2px_rgba(0,0,0,0.05)]' : '';
                        return (
                          <TableCell
                            key={col.key}
                            className={cn('text-sm align-top', frozenClasses)}
                            title={String(row[col.key] ?? '')}
                            style={shouldFreeze ? { left: leftOffset, minWidth: FROZEN_COLUMN_WIDTH[col.key as keyof typeof FROZEN_COLUMN_WIDTH] } : undefined}
                          >
                            <div className={cn(col.type === 'url' || col.type === 'file' ? 'max-w-[320px] whitespace-normal' : 'max-w-[320px] truncate')}>
                              {renderCellValue(row[col.key], col.type)}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                {sortedRows.length > 0 && paddingBottom > 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
