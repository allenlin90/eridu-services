import type { ColumnFiltersState, OnChangeFn, PaginationState } from '@tanstack/react-table';
import { RefreshCw, UserPlus } from 'lucide-react';
import { useState } from 'react';

import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';
import {
  Button,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import {
  getStudioCreatorRosterColumns,
  studioCreatorRosterSearchableColumns,
} from '../config/studio-creator-roster-columns';

import { AddStudioCreatorDialog } from './add-studio-creator-dialog';
import { OnboardCreatorDialog } from './onboard-creator-dialog';

type StudioCreatorRosterTableProps = {
  studioId: string;
  creators: StudioCreatorRosterItem[];
  isLoading: boolean;
  isFetching: boolean;
  isAdmin: boolean;
  pagination: PaginationState & { total?: number; pageCount?: number };
  onPaginationChange: OnChangeFn<PaginationState>;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  onRefresh: () => void;
};

export function StudioCreatorRosterTable({
  studioId,
  creators,
  isLoading,
  isFetching,
  isAdmin,
  pagination,
  onPaginationChange,
  columnFilters,
  onColumnFiltersChange,
  onRefresh,
}: StudioCreatorRosterTableProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);

  const columns = getStudioCreatorRosterColumns({ studioId, isAdmin });

  return (
    <>
      <DataTable
        data={creators}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No creators found."
        manualPagination
        manualFiltering
        pageCount={pagination.pageCount}
        getRowId={(creator) => creator.id}
        paginationState={pagination}
        onPaginationChange={onPaginationChange}
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="creator_name"
            searchableColumns={studioCreatorRosterSearchableColumns}
            searchPlaceholder="Search by creator name or alias..."
            featuredFilterColumns={['default_rate_type', 'is_active']}
          >
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={onRefresh}
              disabled={isFetching}
              aria-label="Refresh creator roster"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {isAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={() => setOnboardOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Onboard Creator
                </Button>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Creator
                </Button>
              </>
            )}
          </DataTableToolbar>
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={{
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
              total: pagination.total ?? 0,
              pageCount: pagination.pageCount ?? 0,
            }}
            onPaginationChange={({ pageIndex, pageSize }) => {
              onPaginationChange({ pageIndex, pageSize });
            }}
          />
        )}
      />

      {isAdmin && (
        <>
          <AddStudioCreatorDialog
            studioId={studioId}
            open={addOpen}
            onOpenChange={setAddOpen}
          />
          <OnboardCreatorDialog
            studioId={studioId}
            open={onboardOpen}
            onOpenChange={setOnboardOpen}
          />
        </>
      )}
    </>
  );
}
