import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { studioMemberKeys, useStudioMembers as useStudioMembersQuery } from '../api/members';

type UseStudioMembersProps = {
  studioId: string;
};

export function useStudioMembers({ studioId }: UseStudioMembersProps) {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({ from: '/studios/$studioId/members', searchColumnId: 'user_name' });

  const search = columnFilters.find((f) => f.id === 'user_name')?.value as string | undefined;

  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: search || undefined,
  };

  const { data, isLoading, isFetching } = useStudioMembersQuery(studioId, queryParams);

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: studioMemberKeys.listPrefix(studioId),
    });
  }, [queryClient, studioId]);

  return {
    members: data?.data ?? [],
    isLoading,
    isFetching,
    pagination: data?.meta
      ? {
          pageIndex: data.meta.page - 1,
          pageSize: data.meta.limit,
          total: data.meta.total,
          pageCount: data.meta.totalPages,
        }
      : {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total: 0,
          pageCount: 0,
        },
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  };
}
