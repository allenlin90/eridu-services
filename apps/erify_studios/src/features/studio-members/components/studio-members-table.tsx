import type { ColumnFiltersState, OnChangeFn, PaginationState } from '@tanstack/react-table';
import { RefreshCw, UserPlus } from 'lucide-react';
import { useState } from 'react';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import {
  Button,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { getMemberColumns, memberSearchableColumns } from '../config/member-columns';

import { AddMemberDialog } from './add-member-dialog';

type StudioMembersTableProps = {
  studioId: string;
  members: StudioMemberResponse[];
  isLoading: boolean;
  isFetching: boolean;
  canManageMembers: boolean;
  canReviewCompensations: boolean;
  currentUserEmail: string | undefined;
  pagination: PaginationState & { total?: number; pageCount?: number };
  onPaginationChange: OnChangeFn<PaginationState>;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  onRefresh: () => void;
};

export function StudioMembersTable({
  studioId,
  members,
  isLoading,
  isFetching,
  canManageMembers,
  canReviewCompensations,
  currentUserEmail,
  pagination,
  onPaginationChange,
  columnFilters,
  onColumnFiltersChange,
  onRefresh,
}: StudioMembersTableProps) {
  const [addOpen, setAddOpen] = useState(false);

  const columns = getMemberColumns({
    studioId,
    canManageMembers,
    canReviewCompensations,
    currentUserEmail,
  });

  return (
    <>
      <DataTable
        data={members}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No members yet."
        manualPagination
        manualFiltering
        pageCount={pagination.pageCount}
        getRowId={(member) => member.membership_id}
        paginationState={pagination}
        onPaginationChange={onPaginationChange}
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="user_name"
            searchableColumns={memberSearchableColumns}
            searchPlaceholder="Search by name or email..."
          >
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={onRefresh}
              disabled={isFetching}
              aria-label="Refresh members"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {canManageMembers && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
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
            onPaginationChange={({ pageIndex, pageSize }) => {
              onPaginationChange({ pageIndex, pageSize });
            }}
          />
        )}
      />

      {canManageMembers && (
        <AddMemberDialog
          studioId={studioId}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      )}
    </>
  );
}
