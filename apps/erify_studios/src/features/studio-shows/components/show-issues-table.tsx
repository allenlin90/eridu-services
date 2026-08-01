import type { ColumnFiltersState, OnChangeFn, PaginationState } from '@tanstack/react-table';
import { Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ShowIssueApiResponse } from '@eridu/api-types/show-issues';
import { Button, DataTable, DataTablePagination, DataTableToolbar } from '@eridu/ui';

import { getShowIssueColumns, showIssueStaticSearchableColumns } from '../config/show-issue-columns';

import { ShowIssueCreateDialog } from './show-issue-create-dialog';

import { useStudioMembers } from '@/features/studio-members/api/members';

type ShowIssuesTableProps = {
  studioId: string;
  showId: string;
  issues: ShowIssueApiResponse[];
  isLoading: boolean;
  isFetching: boolean;
  canManageIssues: boolean;
  currentUserUid: string | undefined;
  pagination: PaginationState & { total?: number; pageCount?: number };
  onPaginationChange: OnChangeFn<PaginationState>;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  onRefresh: () => void;
};

export function ShowIssuesTable({
  studioId,
  showId,
  issues,
  isLoading,
  isFetching,
  canManageIssues,
  currentUserUid,
  pagination,
  onPaginationChange,
  columnFilters,
  onColumnFiltersChange,
  onRefresh,
}: ShowIssuesTableProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');

  const ownerFilterValue = columnFilters.find((filter) => filter.id === 'owner_id')?.value as string | undefined;

  // Owner filter combobox is gated to ADMIN/MANAGER: it queries
  // `/studios/:studioId/members`, which only they can read. Other readers
  // still get status/severity/category filters. See show-issue-columns.tsx.
  const { data: memberSearchData, isLoading: isOwnerSearchLoading } = useStudioMembers(
    studioId,
    { search: ownerSearch || undefined, limit: 20 },
    { enabled: canManageIssues },
  );

  const ownerOptions = useMemo(() => {
    const fromSearch = (memberSearchData?.data ?? []).map((member) => ({
      value: member.user_id,
      label: member.user_name,
    }));
    // Keep the active filter's label resolvable even when it falls outside
    // the current search page, by reading it off an already-loaded row's
    // embedded `owner` ref instead of a second lookup endpoint.
    if (ownerFilterValue && !fromSearch.some((option) => option.value === ownerFilterValue)) {
      const matchingRow = issues.find((issue) => issue.owner?.uid === ownerFilterValue);
      if (matchingRow?.owner) {
        return [{ value: matchingRow.owner.uid, label: matchingRow.owner.name }, ...fromSearch];
      }
    }
    return fromSearch;
  }, [memberSearchData, ownerFilterValue, issues]);

  const searchableColumns = useMemo(() => {
    if (!canManageIssues) {
      return showIssueStaticSearchableColumns;
    }
    return [
      ...showIssueStaticSearchableColumns,
      {
        id: 'owner_id',
        title: 'Owner',
        type: 'combobox' as const,
        options: ownerOptions,
        isLoading: isOwnerSearchLoading,
        onSearch: setOwnerSearch,
        placeholder: 'Search members...',
      },
    ];
  }, [canManageIssues, ownerOptions, isOwnerSearchLoading]);

  const columns = useMemo(
    () => getShowIssueColumns({ studioId, showId, currentUserUid, canManageIssues }),
    [studioId, showId, currentUserUid, canManageIssues],
  );

  return (
    <>
      <DataTable
        data={issues}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No issues recorded for this show."
        manualPagination
        manualFiltering
        pageCount={pagination.pageCount}
        getRowId={(issue) => issue.id}
        paginationState={pagination}
        onPaginationChange={onPaginationChange}
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        getRowClassName={(issue) => (issue.status === 'RESOLVED' ? 'opacity-60' : undefined)}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="search"
            searchableColumns={searchableColumns}
            searchPlaceholder="Search issues..."
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={onRefresh}
              disabled={isFetching}
              aria-label="Refresh issues"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {canManageIssues && (
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Report Issue
              </Button>
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
            onPaginationChange={({ pageIndex, pageSize }) => onPaginationChange({ pageIndex, pageSize })}
          />
        )}
      />

      {canManageIssues && (
        <ShowIssueCreateDialog studioId={studioId} showId={showId} open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </>
  );
}
