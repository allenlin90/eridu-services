import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { z } from 'zod';

import type {
  createMembershipInputSchema,
  MembershipApiResponse,
  updateMembershipInputSchema,
} from '@eridu/api-types/memberships';
import type { StudioApiResponse } from '@eridu/api-types/studios';
import { useTableUrlState } from '@eridu/ui';

import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

type Membership = MembershipApiResponse;
type MembershipFormData = z.infer<typeof createMembershipInputSchema>;
type UpdateMembershipFormData = z.infer<typeof updateMembershipInputSchema>;

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

  const { data, isLoading } = useAdminList<Membership>('studio-memberships', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
    id: idFilter,
    studio_id: studioIdFilter,
  });

  // Fetch studios for dropdown
  const { data: studiosData, isLoading: isLoadingStudios } = useAdminList<StudioApiResponse>('studios', {
    page: 1,
    limit: 100, // Fetch first 100 studios for now
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const createMutation = useAdminCreate<Membership, MembershipFormData>('studio-memberships');
  const updateMutation = useAdminUpdate<Membership, UpdateMembershipFormData>('studio-memberships');
  const deleteMutation = useAdminDelete('studio-memberships');

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('studio-memberships'),
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
