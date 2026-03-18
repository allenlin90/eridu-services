import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Download } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import type { TaskReportResult } from '@eridu/api-types/task-management';
import { Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@eridu/ui';

import { cn } from '@eridu/ui/lib/utils';

import { filterRows, type TaskReportViewFilters } from '../lib/filter-rows';
import { serializeCsv } from '../lib/serialize-csv';
import { type SortDirection, sortRows } from '../lib/sort-rows';

import { ReportViewFilters } from './report-view-filters';

type ReportResultTableProps = {
  result: TaskReportResult;
  onBack: () => void;
};

const FROZEN_COLUMN_ORDER = ['show_name', 'client_name', 'start_time'] as const;
const FROZEN_COLUMN_WIDTH: Record<(typeof FROZEN_COLUMN_ORDER)[number], number> = {
  show_name: 260,
  client_name: 220,
  start_time: 180,
};

export function ReportResultTable({ result, onBack }: ReportResultTableProps) {
  const { columns, rows } = result;

  const [filters, setFilters] = useState<TaskReportViewFilters>({});
  const [sortConfig, setSortConfig] = useState<{ column: string | null; dir: SortDirection }>({ column: 'start_time', dir: 'desc' });

  const parentRef = useRef<HTMLDivElement>(null);

  const availableClients = useMemo(() => Array.from(new Set(rows.map((r) => r.client_name).filter(Boolean))), [rows]);
  const availableStatuses = useMemo(() => Array.from(new Set(rows.map((r) => r.show_status_name ?? r.show_status_id).filter(Boolean))), [rows]);
  const availableRooms = useMemo(() => Array.from(new Set(rows.map((r) => r.studio_room_name).filter(Boolean))), [rows]);

  const filteredRows = useMemo(() => filterRows(rows, columns, filters), [rows, columns, filters]);
  const sortedRows = useMemo(() => sortRows(filteredRows, sortConfig.column, sortConfig.dir), [filteredRows, sortConfig]);

  const handleExportCsv = () => {
    if (!sortedRows.length || !columns.length)
      return;

    const csvContent = serializeCsv(sortedRows, columns);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `task-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const activeColumnKeys = new Set(columns.map((column) => column.key));
    const offsets = new Map<string, number>();
    let currentOffset = 0;

    for (const key of FROZEN_COLUMN_ORDER) {
      if (!activeColumnKeys.has(key)) {
        continue;
      }

      offsets.set(key, currentOffset);
      currentOffset += FROZEN_COLUMN_WIDTH[key];
    }

    return offsets;
  }, [columns]);

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

  const renderCellValue = (value: unknown) => {
    if (value === null || value === undefined)
      return <span className="text-muted-foreground">-</span>;
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
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Builder
        </Button>
        <Button onClick={handleExportCsv} variant="outline" size="sm" disabled={sortedRows.length === 0}>
          <Download className="mr-2 w-4 h-4" />
          Export CSV (
          {sortedRows.length}
          {' '}
          rows)
        </Button>
      </div>

      <ReportViewFilters
        filters={filters}
        onChange={setFilters}
        availableClients={availableClients}
        availableRooms={availableRooms}
        availableStatuses={availableStatuses}
      />
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Report Results</span>
            <span className="text-sm font-normal text-muted-foreground">
              {rows.length}
              {' '}
              {rows.length === 1 ? 'row' : 'rows'}
              {' '}
              generated
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={parentRef} className="overflow-auto max-h-[calc(100vh-16rem)] relative border-t">
            <Table className="whitespace-nowrap">
              <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
                <TableRow>
                  {columns.map((col) => {
                    const leftOffset = getFrozenOffset(col.key);
                    const frozenClasses = leftOffset !== undefined ? 'sticky z-30 bg-muted/95 backdrop-blur border-r' : 'bg-muted/95 backdrop-blur z-20';
                    const sorting = sortConfig.column === col.key;
                    return (
                      <TableHead
                        key={col.key}
                        className={cn('group font-semibold cursor-pointer select-none whitespace-nowrap hover:bg-muted transition-colors', frozenClasses)}
                        onClick={() => handleSort(col.key)}
                        style={leftOffset !== undefined ? { left: leftOffset, minWidth: FROZEN_COLUMN_WIDTH[col.key as keyof typeof FROZEN_COLUMN_WIDTH] } : undefined}
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
                        const frozenClasses = leftOffset !== undefined ? 'sticky z-10 bg-background border-r drop-shadow-[1px_0_2px_rgba(0,0,0,0.05)]' : '';
                        return (
                          <TableCell
                            key={col.key}
                            className={cn('text-sm max-w-[300px] truncate', frozenClasses)}
                            title={String(row[col.key] ?? '')}
                            style={leftOffset !== undefined ? { left: leftOffset, minWidth: FROZEN_COLUMN_WIDTH[col.key as keyof typeof FROZEN_COLUMN_WIDTH] } : undefined}
                          >
                            {col.key === 'show_name' && row._has_duplicate_source && (
                              <span
                                className="mr-2 inline-block w-2 h-2 rounded-full bg-amber-500"
                                title="Multiple tasks matched this show template. Showing the most recent."
                              />
                            )}
                            {renderCellValue(row[col.key])}
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
