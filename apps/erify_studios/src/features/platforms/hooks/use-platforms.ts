import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { z } from 'zod';

import type { PlatformApiResponse } from '@eridu/api-types/platforms';
import { useTableUrlState } from '@eridu/ui';

import type { platformSchema } from '@/features/platforms/config/platform-search-schema';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

type Platform = PlatformApiResponse;
type PlatformFormData = z.infer<typeof platformSchema>;

export function usePlatforms() {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/platforms/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;

  const { data, isLoading, isFetching } = useAdminList<Platform>('platforms', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
    id: idFilter,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const createMutation = useAdminCreate<Platform, any>('platforms');
  const updateMutation = useAdminUpdate<Platform, any>('platforms');
  const deleteMutation = useAdminDelete('platforms');

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('platforms'),
    });
  };

  const handleCreate = async (formData: PlatformFormData) => {
    const data = {
      ...formData,
      api_config: formData.api_config ? JSON.parse(formData.api_config) : {},
    };
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (id: string, formData: PlatformFormData) => {
    const data = {
      ...formData,
      api_config: formData.api_config ? JSON.parse(formData.api_config) : {},
    };
    await updateMutation.mutateAsync({ id, data });
  };

  return {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    createMutation,
    updateMutation,
    deleteMutation,
    handleRefresh,
    handleCreate,
    handleUpdate,
  };
}
