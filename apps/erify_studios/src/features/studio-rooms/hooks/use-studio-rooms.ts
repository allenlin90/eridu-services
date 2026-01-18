import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useCreateStudioRoom } from '@/features/studio-rooms/api/create-studio-room';
import { useDeleteStudioRoom } from '@/features/studio-rooms/api/delete-studio-room';
import { useStudioRoomsQuery } from '@/features/studio-rooms/api/get-studio-rooms';
import { useUpdateStudioRoom } from '@/features/studio-rooms/api/update-studio-room';

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
  const idFilter = columnFilters.find((filter) => filter.id === 'id')
    ?.value as string | undefined;

  const { data, isLoading, isFetching } = useStudioRoomsQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    studio_id: studioId,
    name: nameFilter,
    id: idFilter,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const createMutation = useCreateStudioRoom();
  const updateMutation = useUpdateStudioRoom();
  const deleteMutation = useDeleteStudioRoom();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['studio-rooms'],
    });
  };

  const handleCreate = async (data: Parameters<typeof createMutation.mutateAsync>[0]) => {
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
