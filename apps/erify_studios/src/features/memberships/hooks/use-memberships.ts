import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useCreateMembership } from '@/features/memberships/api/create-membership';
import { useDeleteMembership } from '@/features/memberships/api/delete-membership';
import { useMembershipsQuery } from '@/features/memberships/api/get-memberships';
import { useUpdateMembership } from '@/features/memberships/api/update-membership';
import { useStudiosQuery } from '@/features/studios/api/get-studios';

export function useMemberships() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/memberships/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;
  const studioIdFilter = columnFilters.find((filter) => filter.id === 'studio_id')
    ?.value as string | undefined;

  const { data, isLoading } = useMembershipsQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
    id: idFilter,
    studio_id: studioIdFilter,
  });

  // Fetch studios for dropdown
  const { data: studiosData, isLoading: isLoadingStudios } = useStudiosQuery({
    page: 1,
    limit: 100, // Fetch first 100 studios for now
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const createMutation = useCreateMembership();
  const updateMutation = useUpdateMembership();
  const deleteMutation = useDeleteMembership();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['memberships'],
    });
  };

  return {
    data,
    isLoading,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    studiosData,
    isLoadingStudios,
    createMutation,
    updateMutation,
    deleteMutation,
    handleRefresh,
  };
}
