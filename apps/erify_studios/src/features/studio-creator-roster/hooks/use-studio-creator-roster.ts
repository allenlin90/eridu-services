import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import { CREATOR_COMPENSATION_TYPE, type CreatorCompensationType } from '@eridu/api-types/creators';
import { useTableUrlState } from '@eridu/ui';

import {
  studioCreatorRosterKeys,
  useStudioCreatorRosterQuery,
} from '../api/studio-creator-roster';

const VALID_COMPENSATION_TYPES = new Set(Object.values(CREATOR_COMPENSATION_TYPE));

type UseStudioCreatorRosterProps = {
  studioId: string;
};

export function useStudioCreatorRoster({ studioId }: UseStudioCreatorRosterProps) {
  const queryClient = useQueryClient();
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/studios/$studioId/creators',
    searchColumnId: 'creator_name',
  });

  const search = columnFilters.find((filter) => filter.id === 'creator_name')?.value as string | undefined;
  const compensationTypeValue = columnFilters.find((filter) => filter.id === 'default_rate_type')?.value as string | undefined;
  const isActiveValue = columnFilters.find((filter) => filter.id === 'is_active')?.value as string | undefined;

  const defaultRateType = compensationTypeValue && VALID_COMPENSATION_TYPES.has(compensationTypeValue as CreatorCompensationType)
    ? compensationTypeValue as CreatorCompensationType
    : undefined;
  const isActive = isActiveValue !== 'false';

  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: search || undefined,
      is_active: isActive,
      default_rate_type: defaultRateType,
    }),
    [defaultRateType, isActive, pagination.pageIndex, pagination.pageSize, search],
  );

  const { data, isLoading, isFetching } = useStudioCreatorRosterQuery(studioId, queryParams);

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: studioCreatorRosterKeys.listPrefix(studioId),
    });
  }, [queryClient, studioId]);

  return {
    creators: data?.data ?? [],
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
