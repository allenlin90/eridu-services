import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { z } from 'zod';

import type {
  createStudioRoomInputSchema,
  StudioRoomApiResponse,
  updateStudioRoomInputSchema,
} from '@eridu/api-types/studio-rooms';
import { useTableUrlState } from '@eridu/ui';

import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

type StudioRoom = StudioRoomApiResponse;
type StudioRoomFormData = z.infer<typeof createStudioRoomInputSchema>;
type UpdateStudioRoomFormData = z.infer<typeof updateStudioRoomInputSchema>;

export function useStudioRooms(studioId: string) {
  const queryClient = useQueryClient();

  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/studios/$studioId/studio-rooms/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;

  const { data, isLoading, isFetching } = useAdminList<StudioRoom>('studio-rooms', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    studio_id: studioId,
    name: nameFilter,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const createMutation = useAdminCreate<StudioRoom, StudioRoomFormData>('studio-rooms');
  const updateMutation = useAdminUpdate<StudioRoom, UpdateStudioRoomFormData>('studio-rooms');
  const deleteMutation = useAdminDelete('studio-rooms');

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('studio-rooms'),
    });
  };

  const handleCreate = async (data: StudioRoomFormData) => {
    await createMutation.mutateAsync({ ...data, studio_id: studioId });
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
  };
}
