import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfDay, startOfDay } from 'date-fns';
import { useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import type { z } from 'zod';

import {
  compensationItemTypeSchema,
  compensationLineItemTargetTypeSchema,
} from '@eridu/api-types/compensation-line-items';
import { useTableUrlState } from '@eridu/ui';

import {
  adminCompensationLineItemKeys,
  getAdminCompensationLineItems,
} from '@/features/compensation-line-items/api/compensation-line-items.api';

type CompensationItemType = z.infer<typeof compensationItemTypeSchema>;
type CompensationLineItemTargetType = z.infer<typeof compensationLineItemTargetTypeSchema>;

const VALID_ITEM_TYPES = new Set(compensationItemTypeSchema.options);
const VALID_TARGET_TYPES = new Set(compensationLineItemTargetTypeSchema.options);

type UseAdminCompensationLineItemsOptions<TRoute extends string> = {
  from: TRoute;
};

export function useAdminCompensationLineItems<TRoute extends string>({
  from,
}: UseAdminCompensationLineItemsOptions<TRoute>) {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from,
    dateColumnId: 'created_at',
    paramNames: {
      startDate: 'from',
      endDate: 'to',
    },
  });

  const studioId = columnFilters.find((filter) => filter.id === 'studio_id')
    ?.value as string | undefined;
  const targetId = columnFilters.find((filter) => filter.id === 'target_id')
    ?.value as string | undefined;
  const createdByUid = columnFilters.find((filter) => filter.id === 'created_by_uid')
    ?.value as string | undefined;
  const targetTypeValue = columnFilters.find((filter) => filter.id === 'target_type')
    ?.value as string | undefined;
  const itemTypeValue = columnFilters.find((filter) => filter.id === 'item_type')
    ?.value as string | undefined;
  const dateRange = columnFilters.find((filter) => filter.id === 'created_at')
    ?.value as DateRange | undefined;
  const includeDeletedValue = columnFilters.find((filter) => filter.id === 'include_deleted')
    ?.value as string | undefined;

  const targetType = targetTypeValue && VALID_TARGET_TYPES.has(targetTypeValue as CompensationLineItemTargetType)
    ? (targetTypeValue as CompensationLineItemTargetType)
    : undefined;

  const itemType = itemTypeValue && VALID_ITEM_TYPES.has(itemTypeValue as CompensationItemType)
    ? (itemTypeValue as CompensationItemType)
    : undefined;

  const includeDeleted = includeDeletedValue === 'true'
    ? true
    : includeDeletedValue === 'false'
      ? false
      : undefined;

  const params = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    studio_id: studioId,
    target_type: targetType,
    target_id: targetId,
    item_type: itemType,
    created_by_uid: createdByUid,
    from: dateRange?.from ? startOfDay(dateRange.from).toISOString() : undefined,
    to: dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined,
    include_deleted: includeDeleted,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: adminCompensationLineItemKeys.list(params),
    queryFn: ({ signal }) => getAdminCompensationLineItems(params, { signal }),
    gcTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: adminCompensationLineItemKeys.all });
  };

  return {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  };
}
